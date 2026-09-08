import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Check, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import StateView from '@/components/ui/StateView';
import { clearSaleDraft, hasSaleDraft, readSaleDraft, saleDraftUrl, updateSaleDraft } from '@/lib/saleDraft';

const normalize = value => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function NewSale1() {
  const navigate = useNavigate();
  const stored = readSaleDraft();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContactId, setSelectedContactId] = useState(stored.contactId || null);

  const { data: contacts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => db.Contact.list()
  });

  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts;
    const query = normalize(searchTerm);
    return contacts.filter(c =>
      normalize(c.full_name).includes(query) ||
      normalize(c.phone).includes(query)
    );
  }, [contacts, searchTerm]);

  const goNext = () => {
    if (!selectedContactId || !contacts.some(contact => contact.id === selectedContactId)) return;
    const contactId = selectedContactId;
    const draft = updateSaleDraft(stored.contactId === contactId
      ? { contactId }
      : { contactId, items: [], productId: null, purchaseDate: null, saleType: null });
    navigate(saleDraftUrl('NewSale2', draft));
  };

  const cancel = () => {
    if (hasSaleDraft() && !window.confirm('¿Cancelar y borrar esta venta sin terminar?')) return;
    clearSaleDraft();
    navigate(createPageUrl('Sales'));
  };

  return (
    <main className="min-h-dvh bg-[#F7F9FC]">
      {/* Header */}
      <header className="border-b border-[#E2E8F0] bg-white px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={cancel}
          className="relative z-10 -ml-2 flex min-h-12 items-center gap-2 rounded-2xl px-2 text-[16px] font-bold text-[#475569] active:opacity-70"
        >
          <X className="h-5 w-5" aria-hidden="true" /> Cancelar
        </button>
        <p className="text-[15px] font-bold text-[#64748B]">Paso 1 de 4</p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]"><div className="h-full w-1/4 rounded-full bg-[#004AFE]" /></div>
        <h1 className="mt-4 text-2xl font-bold text-[#0F172A]">¿Quién compró?</h1>
        <p className="mt-1 text-[16px] text-[#64748B]">Elige a la persona de esta venta.</p>
      </header>

      {/* Search */}
      <div className="px-5 pb-2 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6E6E73]" />
          <Input
            placeholder="Buscar contacto"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-14 rounded-2xl border-[#EAEAEA] text-[17px]"
            aria-label="Buscar contacto por nombre o teléfono"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="space-y-3 px-5 pb-28 pt-4">
        {isLoading && <StateView state="loading" title="Cargando contactos…" />}
        {isError && <StateView state="error" title="No pudimos cargar tus contactos" description="Revisa tu conexión e intenta de nuevo." actionLabel="Intentar de nuevo" onAction={refetch} />}
        {!isLoading && !isError && filteredContacts.map(contact => (
          <button
            key={contact.id}
            onClick={() => setSelectedContactId(contact.id)}
            aria-pressed={selectedContactId === contact.id}
            className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 bg-white p-4 text-left transition-transform duration-150 active:scale-[0.98] ${
              selectedContactId === contact.id
                ? 'border-[#004AFE]'
                : 'border-[#EAEAEA]'
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${selectedContactId === contact.id ? 'border-[#004AFE] bg-[#004AFE] text-white' : 'border-[#CBD5E1]'}`}>{selectedContactId === contact.id && <Check className="h-4 w-4" aria-hidden="true" />}</span>
            <div className="min-w-0 flex-1"><h3 className="truncate font-semibold text-[#27251f] text-[17px]">
              {contact.full_name}
            </h3>
            <p className="truncate text-[15px] text-[#6E6E73] mt-0.5">
              {contact.phone}
            </p>
            </div>
          </button>
        ))}

        {!isLoading && !isError && filteredContacts.length === 0 && (
          <StateView title={searchTerm ? 'No encontramos coincidencias' : 'Aún no tienes contactos'} description={searchTerm ? 'Prueba con otro nombre o teléfono.' : 'Primero crea un contacto y después registra su venta.'} actionLabel={searchTerm ? 'Limpiar búsqueda' : 'Crear contacto'} onAction={() => searchTerm ? setSearchTerm('') : navigate(createPageUrl('NewContact'))} />
        )}
      </div>

      <footer className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
        <button type="button" onClick={goNext} disabled={!selectedContactId || !contacts.some(contact => contact.id === selectedContactId)} className="min-h-14 w-full rounded-2xl bg-primary px-5 text-[17px] font-bold text-white disabled:opacity-50">
          Continuar
        </button>
      </footer>
    </main>
  );
}
