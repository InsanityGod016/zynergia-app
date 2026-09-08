import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Import, Plus, Search } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '@/api/db';
import { createPageUrl } from '@/utils';
import ContactCard from '@/components/contacts/ContactCard';
import MainHeader from '@/components/ui/MainHeader';
import ContactTypeFilterSheet from '@/components/contacts/ContactTypeFilterSheet';
import BulkChangeTypeSheet from '@/components/contacts/BulkChangeTypeSheet';
import ImportContactsSheet from '@/components/contacts/ImportContactsSheet';
import { createOperationId } from '@/lib/operationId';

const filterLabels = {
  all: 'Todos los tipos',
  cliente_producto: 'Clientes',
  partner: 'Socios',
  prospecto_producto: 'Prospectos de producto',
  prospecto_partner: 'Prospectos de negocio',
};

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-419')
    .trim();
}

function parseLocalDate(value) {
  const [year, month, day] = String(value ?? '').split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ListState(/** @type {{ title: string, description: string, actionLabel?: string, onAction?: () => unknown }} */ {
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div className="rounded-3xl border border-border bg-card px-6 py-10 text-center shadow-sm" role="status">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-[15px] leading-6 text-muted-foreground">{description}</p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 min-h-12 rounded-2xl bg-primary px-6 text-base font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default function Contacts() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [contactTypeFilter, setContactTypeFilter] = useState('all');
  const [showTypeSheet, setShowTypeSheet] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkSheet, setShowBulkSheet] = useState(false);
  const [showImportSheet, setShowImportSheet] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const bulkOperationIds = useRef({ changeType: '', changeTypeValue: null, anonymize: '' });

  useEffect(() => {
    if (searchParams.get('import') !== '1') return;
    setShowImportSheet(true);
    const next = new URLSearchParams(searchParams);
    next.delete('import');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const contactsQuery = useQuery({
    queryKey: ['contacts'],
    queryFn: () => db.Contact.list(),
  });
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => db.Product.list(),
  });
  const salesQuery = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.Sale.list(),
  });
  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: () => db.Tag.list(),
  });

  const contacts = contactsQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const sales = salesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const isLoading = contactsQuery.isPending;
  const hasError = contactsQuery.isError;
  const supplementalError = productsQuery.isError || salesQuery.isError || tagsQuery.isError;

  const tagNamesById = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag.name])),
    [tags],
  );

  const filteredContacts = useMemo(() => {
    const words = normalize(search).split(/\s+/).filter(Boolean);
    const digits = search.replace(/\D/g, '');

    return contacts.filter((contact) => {
      const tagNames = (contact.tag_ids ?? []).map((id) => tagNamesById.get(id) ?? '');
      const searchableText = normalize([
        contact.full_name,
        contact.phone,
        ...tagNames,
      ].join(' '));
      const phoneDigits = String(contact.phone ?? '').replace(/\D/g, '');
      const matchesWords = words.every((word) => searchableText.includes(word));
      const matchesPhone = Boolean(digits) && phoneDigits.includes(digits);
      const matchesSearch = !search.trim() || matchesWords || matchesPhone;
      const matchesType = contactTypeFilter === 'all' || contact.contact_type === contactTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [contacts, contactTypeFilter, search, tagNamesById]);

  const getNextPurchaseDays = (contactId) => {
    const contactSales = sales.filter((sale) => (
      sale.contact_id === contactId
      && sale.status === 'active'
      && !sale.follow_up_stopped_at
    ));
    if (!contactSales.length) return null;

    const days = contactSales.flatMap((sale) => {
      const product = products.find((item) => item.id === sale.product_id);
      if (!product || product.repurchase_enabled === false || Number(product.cycle_days) === 0) return [];
      const category = normalize(product.category).replace(/\s+/g, '_');
      const configuredCycle = Number(product.cycle_days);
      const frequencyDays = Number.isInteger(configuredCycle) && configuredCycle > 0
        ? configuredCycle
        : category === 'compra_unica'
          ? 30
          : (category === 'premier_kits' || category === 'premier_kit' ? 180 : null);
      if (frequencyDays === null) return [];
      const nextPurchase = parseLocalDate(sale.purchase_date);
      if (!nextPurchase) return [];
      nextPurchase.setDate(nextPurchase.getDate() + frequencyDays);
      return [Math.ceil((nextPurchase.getTime() - Date.now()) / 86400000)];
    });

    return days.length ? Math.max(0, Math.min(...days)) : null;
  };

  const toggleSelectMode = () => {
    setSelectMode((current) => !current);
    setSelectedIds([]);
    setBulkError('');
    bulkOperationIds.current = { changeType: '', changeTypeValue: null, anonymize: '' };
  };

  const toggleSelect = (id) => {
    bulkOperationIds.current = { changeType: '', changeTypeValue: null, anonymize: '' };
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const finishBulkAction = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['contacts'] }),
      queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['partners'] }),
    ]);
    setShowBulkSheet(false);
    setSelectMode(false);
    setSelectedIds([]);
    bulkOperationIds.current = { changeType: '', changeTypeValue: null, anonymize: '' };
  };

  const handleBulkChangeType = async (newType) => {
    setBulkLoading(true);
    setBulkError('');
    try {
      if (bulkOperationIds.current.changeTypeValue !== newType) {
        bulkOperationIds.current.changeType = '';
        bulkOperationIds.current.changeTypeValue = newType;
      }
      bulkOperationIds.current.changeType ||= createOperationId();
      await db.Contact.bulkChangeType(bulkOperationIds.current.changeType, selectedIds, newType || null);
      await finishBulkAction();
    } catch (error) {
      setBulkError(error?.message?.includes('linked_partner_type_protected')
        ? 'Un socio vinculado no puede cambiar de tipo desde una acción masiva.'
        : 'No pudimos cambiar los contactos. Tus datos siguen igual. Intenta de nuevo.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkLoading(true);
    setBulkError('');
    try {
      bulkOperationIds.current.anonymize ||= createOperationId();
      await db.Contact.bulkAnonymize(bulkOperationIds.current.anonymize, selectedIds);
      await finishBulkAction();
    } catch (error) {
      setBulkError(error?.message?.includes('linked_partner_delete_protected')
        ? 'No se eliminó nada. Un socio vinculado debe conservarse para proteger la relación del equipo.'
        : 'No pudimos eliminar los contactos. Tus datos siguen igual. Intenta de nuevo.');
    } finally {
      setBulkLoading(false);
    }
  };

  const closeImportSheet = () => {
    setShowImportSheet(false);
  };

  const retry = () => Promise.all([
    contactsQuery.refetch(),
    productsQuery.refetch(),
    salesQuery.refetch(),
    tagsQuery.refetch(),
  ]);

  return (
    <div className="px-4 pb-8 pt-6 sm:px-5 sm:pt-8">
      <MainHeader title="Contactos" />

      <label htmlFor="contact-search" className="mb-2 block text-[15px] font-semibold text-foreground">
        Buscar contacto
      </label>
      <div className="relative mb-4">
        <Search aria-hidden="true" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          id="contact-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="Nombre, teléfono o etiqueta"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-4 text-[17px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowTypeSheet(true)}
          className={`flex min-h-12 min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl px-4 text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            contactTypeFilter === 'all' ? 'bg-muted text-foreground' : 'bg-foreground text-background'
          }`}
          aria-label="Filtrar por tipo de contacto"
        >
          <span className="max-w-[13rem] truncate">{filterLabels[contactTypeFilter] || 'Filtro activo'}</span>
          <ChevronDown aria-hidden="true" className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setShowImportSheet(true)}
          className="flex min-h-12 items-center gap-2 rounded-2xl bg-muted px-4 text-[15px] font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Import aria-hidden="true" className="h-5 w-5" />
          Importar
        </button>
        {contacts.length > 1 && (
          <button
            type="button"
            onClick={toggleSelectMode}
            className="min-h-12 rounded-2xl px-4 text-[15px] font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {selectMode ? 'Terminar' : 'Administrar'}
          </button>
        )}
      </div>

      {selectMode && (
        <div className="mb-4 rounded-2xl bg-muted p-3">
          <p className="text-[15px] text-foreground" aria-live="polite">
            {selectedIds.length ? `${selectedIds.length} seleccionado${selectedIds.length === 1 ? '' : 's'}` : 'Toca los contactos que quieres cambiar.'}
          </p>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setShowBulkSheet(true)}
              className="mt-3 min-h-12 w-full rounded-2xl bg-primary px-5 text-base font-semibold text-primary-foreground"
            >
              Administrar selección
            </button>
          )}
        </div>
      )}

      {bulkError && <p className="mb-4 text-[15px] font-medium text-destructive" role="alert">{bulkError}</p>}
      {supplementalError && !hasError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-muted p-3" role="alert">
          <p className="text-[15px] text-foreground">Falta parte de la información de la lista.</p>
          <button type="button" onClick={retry} className="min-h-12 rounded-xl px-3 text-[15px] font-semibold text-primary">Reintentar</button>
        </div>
      )}

      {isLoading && (
        <ListState title="Cargando contactos" description="Esto sólo tomará un momento." />
      )}
      {!isLoading && hasError && (
        <ListState
          title="No pudimos cargar tus contactos"
          description="Revisa tu conexión. Tus datos siguen seguros."
          actionLabel="Intentar de nuevo"
          onAction={retry}
        />
      )}
      {!isLoading && !hasError && contacts.length === 0 && (
        <ListState
          title="Aún no tienes contactos"
          description="Crea tu primer contacto para empezar a organizar tus seguimientos."
          actionLabel="Crear mi primer contacto"
          onAction={() => navigate(createPageUrl('NewContact'))}
        />
      )}
      {!isLoading && !hasError && contacts.length > 0 && filteredContacts.length === 0 && (
        <ListState
          title="No encontramos coincidencias"
          description="Prueba otro nombre, teléfono o etiqueta, o quita el filtro."
          actionLabel="Limpiar búsqueda y filtros"
          onAction={() => {
            setSearch('');
            setContactTypeFilter('all');
          }}
        />
      )}

      {!isLoading && !hasError && filteredContacts.length > 0 && (
        <ul className="space-y-2" aria-label="Lista de contactos">
          {filteredContacts.map((contact) => (
            <li key={contact.id}>
              <ContactCard
                contact={contact}
                nextPurchaseDays={getNextPurchaseDays(contact.id)}
                selected={selectMode ? selectedIds.includes(contact.id) : undefined}
                onSelect={selectMode ? () => toggleSelect(contact.id) : undefined}
              />
            </li>
          ))}
        </ul>
      )}

      {contacts.length > 0 && (
        <Link
          to={createPageUrl('NewContact')}
          className="fixed bottom-24 right-5 z-30 flex h-14 min-w-14 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-base font-semibold text-primary-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Crear nuevo contacto"
        >
          <Plus aria-hidden="true" className="h-6 w-6" strokeWidth={2.5} />
          <span>Nuevo contacto</span>
        </Link>
      )}

      <ContactTypeFilterSheet
        isOpen={showTypeSheet}
        onClose={() => setShowTypeSheet(false)}
        selectedType={contactTypeFilter}
        onSelect={setContactTypeFilter}
      />
      <BulkChangeTypeSheet
        isOpen={showBulkSheet}
        onClose={() => setShowBulkSheet(false)}
        onConfirm={handleBulkChangeType}
        onDelete={handleBulkDelete}
        selectedCount={selectedIds.length}
        isLoading={bulkLoading}
        error={bulkError}
      />
      <ImportContactsSheet
        isOpen={showImportSheet}
        onClose={closeImportSheet}
        existingContacts={contacts}
        onImported={() => queryClient.invalidateQueries({ queryKey: ['contacts'] })}
        onManualCreate={() => navigate(createPageUrl('NewContact'))}
      />
    </div>
  );
}
