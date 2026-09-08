import { useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Contacts as DeviceContacts } from '@capacitor/contacts';
import { Check, ContactRound, Search, Smartphone } from 'lucide-react';
import { db } from '@/api/db';
import { COUNTRY_CODES } from '@/lib/countryCodes';
import { analyzeContactImports, createImportCandidates, resolveImportCandidate, selectImportCandidatePhone } from '@/lib/contactImport';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { createOperationId } from '@/lib/operationId';

const countryChoices = COUNTRY_CODES.filter((country, index, all) => (
  country.iso && all.findIndex(item => item.iso === country.iso) === index
));

function errorMessage(error) {
  if (error?.code === 'OS-PLUG-CONT-0020') {
    return 'No diste acceso a tus contactos. Puedes habilitarlo después en Ajustes del teléfono.';
  }
  return error?.message || 'No pudimos leer tus contactos. Intenta de nuevo.';
}

export default function ImportContactsSheet({ isOpen, onClose, existingContacts, onImported, onManualCreate }) {
  const operationId = useRef('');
  const [stage, setStage] = useState('intro');
  const [candidates, setCandidates] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const native = Capacitor.isNativePlatform();

  const analysis = useMemo(
    () => analyzeContactImports(candidates, selectedIds, existingContacts),
    [candidates, existingContacts, selectedIds],
  );
  const visibleCandidates = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-419');
    if (!term) return candidates;
    return candidates.filter(candidate => (
      `${candidate.fullName} ${candidate.phoneOptions.map(number => number.raw).join(' ')}`
        .toLocaleLowerCase('es-419')
        .includes(term)
    ));
  }, [candidates, search]);
  const clientDuplicateCount = Object.values(analysis.statusById).filter(status => status === 'duplicate').length;
  const invalidCount = Object.values(analysis.statusById).filter(status => status === 'invalid').length;

  const close = () => {
    if (stage === 'loading' || stage === 'saving') return;
    setStage('intro');
    setCandidates([]);
    setSelectedIds([]);
    setSearch('');
    setError('');
    setResult(null);
    operationId.current = '';
    onClose();
  };

  const loadContacts = async () => {
    if (!native) {
      setStage('unsupported');
      return;
    }
    setStage('loading');
    setError('');
    try {
      const response = await DeviceContacts.find({
        fields: ['displayName', 'name', 'phoneNumbers'],
        multiple: true,
        hasPhoneNumber: true,
        desiredFields: ['displayName', 'name', 'phoneNumbers'],
      });
      const next = createImportCandidates(response.contacts);
      setCandidates(next);
      setStage(next.length ? 'review' : 'empty');
    } catch (loadError) {
      setError(errorMessage(loadError));
      setStage('intro');
    }
  };

  const toggleCandidate = (id) => {
    operationId.current = '';
    setSelectedIds(current => {
      if (current.includes(id)) return current.filter(item => item !== id);
      if (current.length >= 1000) {
        setError('Puedes importar hasta 1,000 contactos por vez.');
        return current;
      }
      setError('');
      return [...current, id];
    });
  };

  const updateCandidate = (id, changes) => {
    operationId.current = '';
    setCandidates(current => current.map(candidate => (
      candidate.id === id ? { ...candidate, ...changes } : candidate
    )));
  };

  const importSelected = async () => {
    if (!analysis.rows.length) return;
    setStage('saving');
    setError('');
    operationId.current ||= createOperationId();
    try {
      const importResult = await db.Contact.importBatch(operationId.current, analysis.rows);
      setResult(importResult);
      setStage('success');
      await onImported();
    } catch (importError) {
      setError(importError?.message || 'No pudimos importar. Tus selecciones siguen aquí.');
      setStage('review');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={open => { if (!open) close(); }}>
      <SheetContent side="bottom" className="mx-auto flex max-h-[92dvh] max-w-lg flex-col rounded-t-3xl px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-6">
        <SheetHeader className="shrink-0 pr-12 text-left">
          <SheetTitle className="text-xl">Importar contactos</SheetTitle>
          <SheetDescription className="text-[15px] leading-6">
            Tú eliges cuáles guardar. Zynergia sólo lee nombre y teléfono.
          </SheetDescription>
        </SheetHeader>

        {stage === 'intro' && (
          <div className="mt-6">
            <div className="rounded-2xl bg-primary/5 p-5 text-center">
              <ContactRound className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
              <h3 className="mt-3 text-[18px] font-semibold text-foreground">Ahorra tiempo al capturar</h3>
              <p className="mt-2 text-[15px] leading-6 text-muted-foreground">
                Primero verás una lista. Nada se guardará hasta que selecciones cada contacto y confirmes.
              </p>
            </div>
            {error && <p className="mt-4 rounded-2xl bg-destructive/10 p-4 text-[15px] font-medium text-destructive" role="alert">{error}</p>}
            <button type="button" onClick={loadContacts} className="mt-5 min-h-14 w-full rounded-2xl bg-primary px-5 text-[17px] font-semibold text-primary-foreground">
              {native ? 'Ver contactos del teléfono' : 'Continuar'}
            </button>
            <button type="button" onClick={close} className="mt-2 min-h-12 w-full rounded-2xl text-[16px] font-semibold text-muted-foreground">Ahora no</button>
          </div>
        )}

        {stage === 'unsupported' && (
          <div className="mt-6 text-center">
            <Smartphone className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
            <h3 className="mt-3 text-[18px] font-semibold">Abre Zynergia en tu teléfono</h3>
            <p className="mt-2 text-[15px] leading-6 text-muted-foreground">El navegador no permite leer tu agenda. Puedes importar desde la app instalada o crear un contacto manualmente.</p>
            <button type="button" onClick={() => { close(); onManualCreate(); }} className="mt-5 min-h-14 w-full rounded-2xl bg-primary px-5 text-[17px] font-semibold text-primary-foreground">Crear contacto manual</button>
            <button type="button" onClick={close} className="mt-2 min-h-12 w-full rounded-2xl text-[16px] font-semibold text-muted-foreground">Cerrar</button>
          </div>
        )}

        {(stage === 'loading' || stage === 'saving') && (
          <div className="flex min-h-64 flex-1 items-center justify-center" role="status">
            <p className="text-[17px] font-semibold text-foreground">{stage === 'loading' ? 'Abriendo tus contactos…' : 'Guardando contactos…'}</p>
          </div>
        )}

        {stage === 'empty' && (
          <div className="mt-6 text-center">
            <h3 className="text-[18px] font-semibold">No encontramos contactos con teléfono</h3>
            <p className="mt-2 text-[15px] text-muted-foreground">Puedes crear uno manualmente.</p>
            <button type="button" onClick={() => { close(); onManualCreate(); }} className="mt-5 min-h-14 w-full rounded-2xl bg-primary px-5 text-[17px] font-semibold text-primary-foreground">Crear contacto</button>
          </div>
        )}

        {stage === 'review' && (
          <>
            <div className="mt-4 shrink-0">
              <label className="relative block">
                <span className="sr-only">Buscar en los contactos del teléfono</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar nombre o teléfono" className="h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-4 text-[17px] outline-none focus-visible:ring-2 focus-visible:ring-primary" />
              </label>
              <p className="mt-3 text-[15px] text-muted-foreground" aria-live="polite">
                {selectedIds.length ? `${selectedIds.length} elegido${selectedIds.length === 1 ? '' : 's'}. Selecciona uno por uno.` : 'Selecciona uno por uno los contactos que quieres importar.'}
              </p>
            </div>

            <div className="mt-3 flex-1 space-y-2 overflow-y-auto pb-3">
              {visibleCandidates.map(candidate => {
                const selected = selectedIds.includes(candidate.id);
                const resolved = resolveImportCandidate(candidate);
                const status = analysis.statusById[candidate.id];
                return (
                  <div key={candidate.id} className={`rounded-2xl border p-3 ${selected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                    <label className="flex min-h-12 cursor-pointer items-center gap-3">
                      <input type="checkbox" checked={selected} onChange={() => toggleCandidate(candidate.id)} className="h-6 w-6 shrink-0 accent-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[17px] font-semibold text-foreground">{candidate.fullName}</span>
                        <span className="block truncate text-[15px] text-muted-foreground">{resolved.phone_e164 || candidate.phoneOptions[candidate.phoneIndex]?.raw}</span>
                      </span>
                    </label>

                    {selected && (
                      <div className="mt-3 grid gap-3 border-t border-border pt-3">
                        {candidate.phoneOptions.length > 1 && (
                          <label className="text-[15px] font-semibold text-foreground">Teléfono
                            <select value={candidate.phoneIndex} onChange={event => updateCandidate(candidate.id, selectImportCandidatePhone(candidate, Number(event.target.value)))} className="mt-1 h-12 w-full rounded-xl border border-border bg-card px-3 text-[16px]">
                              {candidate.phoneOptions.map((phone, index) => <option key={`${phone.raw}-${index}`} value={index}>{phone.label}: {phone.raw}</option>)}
                            </select>
                          </label>
                        )}
                        {!candidate.phoneOptions[candidate.phoneIndex]?.raw.startsWith('+') && (
                          <div className="text-[15px] font-semibold text-foreground">
                            <span>País del número</span>
                            <select aria-label={`País del teléfono de ${candidate.fullName}`} value={candidate.countryIso || ''} onChange={event => {
                              const country = countryChoices.find(item => item.iso === event.target.value);
                              if (country) updateCandidate(candidate.id, { dialCode: country.code, countryIso: country.iso, countryConfirmed: true });
                            }} className="mt-1 h-12 w-full rounded-xl border border-border bg-card px-3 text-[16px]">
                              {countryChoices.map(country => <option key={country.iso} value={country.iso}>{country.flag} {country.name} {country.code}</option>)}
                            </select>
                            {!candidate.countryConfirmed && (
                              <button type="button" onClick={() => updateCandidate(candidate.id, { countryConfirmed: true })} className="mt-2 min-h-12 w-full rounded-xl bg-[#EAF0FF] px-3 text-[15px] font-semibold text-[#004AFE]">
                                Confirmar este país
                              </button>
                            )}
                          </div>
                        )}
                        {status === 'duplicate' && <p className="text-[15px] font-medium text-amber-700">Ya existe un contacto con este teléfono. No se duplicará.</p>}
                        {status === 'invalid' && <p className="text-[15px] font-medium text-destructive">Revisa el país o el teléfono antes de importar.</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {error && <p className="shrink-0 rounded-2xl bg-destructive/10 p-3 text-[15px] font-medium text-destructive" role="alert">{error}</p>}
            <button type="button" onClick={importSelected} disabled={!analysis.rows.length} className="mt-3 min-h-14 shrink-0 rounded-2xl bg-primary px-5 text-[17px] font-semibold text-primary-foreground disabled:opacity-50">
              Importar {analysis.rows.length || ''} contacto{analysis.rows.length === 1 ? '' : 's'}
            </button>
          </>
        )}

        {stage === 'success' && (
          <div className="mt-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-7 w-7" aria-hidden="true" /></span>
            <h3 className="mt-4 text-xl font-semibold">Contactos listos</h3>
            <p className="mt-2 text-[16px] leading-6 text-muted-foreground">
              Se importaron {Number(result?.created || 0)}.
              {Number(result?.duplicates || 0) + clientDuplicateCount > 0 ? ` ${Number(result?.duplicates || 0) + clientDuplicateCount} duplicados se omitieron.` : ''}
              {invalidCount > 0 ? ` ${invalidCount} teléfono${invalidCount === 1 ? '' : 's'} necesita${invalidCount === 1 ? '' : 'n'} corrección.` : ''}
            </p>
            <button type="button" onClick={close} className="mt-6 min-h-14 w-full rounded-2xl bg-primary px-5 text-[17px] font-semibold text-primary-foreground">Ver mis contactos</button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
