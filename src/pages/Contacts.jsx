import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '@/api/db';
import { createPageUrl } from '@/utils';
import ContactCard from '@/components/contacts/ContactCard';
import MainHeader from '@/components/ui/MainHeader';
import ContactTypeFilterSheet from '@/components/contacts/ContactTypeFilterSheet';
import BulkChangeTypeSheet from '@/components/contacts/BulkChangeTypeSheet';
import {
  cancelFutureTasksByArea,
  createPartnerTasks,
  createProspectoPartnerTasks,
  createProspectoProductoTasks,
  createReferralTask,
} from '@/components/tasks/taskEngine';

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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [contactTypeFilter, setContactTypeFilter] = useState('all');
  const [showTypeSheet, setShowTypeSheet] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkSheet, setShowBulkSheet] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');

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
    const contactSales = sales.filter((sale) => sale.contact_id === contactId && sale.status === 'active');
    if (!contactSales.length) return null;

    const days = contactSales.flatMap((sale) => {
      const product = products.find((item) => item.id === sale.product_id);
      if (!product) return [];
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
  };

  const toggleSelect = (id) => {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const handleBulkChangeType = async (newType) => {
    setBulkLoading(true);
    setBulkError('');

    try {
      const allTasks = await db.Task.list();
      const partners = await db.Partner.list();
      await Promise.all(selectedIds.map(async (contactId) => {
        const contact = contacts.find((item) => item.id === contactId);
        const previousType = contact?.contact_type || null;
        await db.Contact.update(contactId, { contact_type: newType || null });
        if (newType === previousType) return;

        if (previousType === 'prospecto_produto' || previousType === 'prospecto_producto') {
          await cancelFutureTasksByArea({ contactId, taskArea: 'prospecto_producto', existingTasks: allTasks });
        }
        if (previousType === 'prospecto_partner') {
          await cancelFutureTasksByArea({ contactId, taskArea: 'prospecto_partner', existingTasks: allTasks });
        }
        if (!newType) {
          await cancelFutureTasksByArea({ contactId, taskArea: 'prospecto_producto', existingTasks: allTasks });
          await cancelFutureTasksByArea({ contactId, taskArea: 'prospecto_partner', existingTasks: allTasks });
        }
        if (newType === 'prospecto_producto') {
          await createProspectoProductoTasks({ contactId, existingTasks: await db.Task.list() });
        }
        if (newType === 'prospecto_partner') {
          await createProspectoPartnerTasks({ contactId, existingTasks: await db.Task.list() });
        }
        if (newType === 'partner' && !partners.some((partner) => partner.contact_id === contactId)) {
          const startDate = new Date().toISOString().split('T')[0];
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + 120);
          await db.Partner.create({
            contact_id: contactId,
            start_date: startDate,
            fast_start_deadline: deadline.toISOString().split('T')[0],
            fast_start_status: 'activo',
            fase_actual: 1,
            qteam_completed: false,
            fs_level1_completed: false,
            fs_level2_completed: false,
            xteam_completed: false,
          });
          await createPartnerTasks({ contactId, startDate });
        }
        if (newType === 'cliente_producto' || newType === 'partner') {
          await createReferralTask({
            contactId,
            contactCreatedAt: contact?.created_at,
            existingTasks: await db.Task.list(),
          });
        }
      }));

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contacts'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['partners'] }),
      ]);
      setShowBulkSheet(false);
      setSelectMode(false);
      setSelectedIds([]);
    } catch {
      setBulkError('No pudimos cambiar los contactos. Intenta de nuevo.');
    } finally {
      setBulkLoading(false);
    }
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

      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShowTypeSheet(true)}
          className={`flex min-h-12 items-center gap-2 rounded-2xl px-4 text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            contactTypeFilter === 'all' ? 'bg-muted text-foreground' : 'bg-foreground text-background'
          }`}
          aria-label="Filtrar por tipo de contacto"
        >
          <span className="max-w-[13rem] truncate">{filterLabels[contactTypeFilter] || 'Filtro activo'}</span>
          <ChevronDown aria-hidden="true" className="h-5 w-5" />
        </button>
        {contacts.length > 1 && (
          <button
            type="button"
            onClick={toggleSelectMode}
            className="min-h-12 rounded-2xl px-4 text-[15px] font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {selectMode ? 'Terminar' : 'Cambiar varios'}
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
              Cambiar tipo
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
        isLoading={bulkLoading}
        error={bulkError}
      />
    </div>
  );
}
