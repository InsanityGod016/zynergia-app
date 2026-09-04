import { useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  Filter,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

/** @typedef {'prospecto' | 'cliente' | 'socio'} ContactType */
/** @typedef {'all' | ContactType} ContactFilter */
/**
 * @typedef {object} DemoContact
 * @property {number} id
 * @property {string} name
 * @property {string} phone
 * @property {ContactType} type
 * @property {string} nextAction
 */

/** @type {DemoContact[]} */
export const demoInitialContacts = [
  { id: 1, name: 'María López', phone: '+52 55 0000 0101', type: 'prospecto', nextAction: 'Seguimiento pendiente hoy' },
  { id: 2, name: 'José Ramírez', phone: '+52 55 0000 0103', type: 'cliente', nextAction: 'Recompra esta semana' },
  { id: 3, name: 'Ana García', phone: '+52 55 0000 0104', type: 'socio', nextAction: 'Fast Start en progreso' },
  { id: 4, name: 'Laura Medina', phone: '+52 55 0000 0105', type: 'cliente', nextAction: 'Revisar entrega mañana' },
];

const contactType = {
  prospecto: { label: 'Prospecto', className: 'bg-blue-50 text-primary' },
  cliente: { label: 'Cliente', className: 'bg-emerald-50 text-emerald-700' },
  socio: { label: 'Socio', className: 'bg-violet-50 text-violet-700' },
};

const emptyContactForm = { name: '', phone: '', type: /** @type {ContactType} */ ('prospecto'), nextAction: '' };

/** @param {string} value */
function initials(value) {
  return value.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'C';
}
/** @param {string} value */
function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Contactos ficticios con búsqueda, filtros, detalle, alta, edición y borrado local.
 * Si se pasan ambas props, el padre conserva la fuente de verdad para compartirla con Ventas.
 * @param {{ contacts?: DemoContact[], onContactsChange?: (contacts: DemoContact[]) => void }} [props]
 */
export function DemoContacts({ contacts: controlledContacts, onContactsChange } = {}) {
  const [localContacts, setLocalContacts] = useState(demoInitialContacts);
  const contacts = controlledContacts ?? localContacts;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(/** @type {ContactFilter} */ ('all'));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState(/** @type {DemoContact | null} */ (null));
  const [sheetMode, setSheetMode] = useState(/** @type {'closed' | 'detail' | 'form' | 'delete'} */ ('closed'));
  const [editingId, setEditingId] = useState(/** @type {number | null} */ (null));
  const [form, setForm] = useState(emptyContactForm);
  const [notice, setNotice] = useState('');

  const visibleContacts = useMemo(() => {
    const term = normalize(query.trim());
    return contacts.filter(contact => {
      const matchesType = filter === 'all' || contact.type === filter;
      const matchesSearch = !term || normalize(`${contact.name} ${contact.phone}`).includes(term);
      return matchesType && matchesSearch;
    });
  }, [contacts, filter, query]);

  /** @param {(contacts: DemoContact[]) => DemoContact[]} update */
  const updateContacts = update => {
    const nextContacts = update(contacts);
    if (controlledContacts == null) setLocalContacts(nextContacts);
    onContactsChange?.(nextContacts);
  };

  /** @param {DemoContact} contact */
  const showContact = contact => {
    setSelected(contact);
    setNotice('');
    setSheetMode('detail');
  };

  const showAdd = () => {
    setEditingId(null);
    setForm(emptyContactForm);
    setNotice('');
    setSheetMode('form');
  };

  /** @param {DemoContact} contact */
  const showEdit = contact => {
    setEditingId(contact.id);
    setForm({ name: contact.name, phone: contact.phone, type: contact.type, nextAction: contact.nextAction });
    setSheetMode('form');
  };

  /** @param {React.FormEvent<HTMLFormElement>} event */
  const saveContact = event => {
    event.preventDefault();
    const saved = {
      id: editingId ?? Date.now(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      type: form.type,
      nextAction: form.nextAction.trim() || 'Sin siguiente acción programada',
    };
    if (!saved.name || !saved.phone) return;
    updateContacts(current => editingId == null ? [saved, ...current] : current.map(contact => contact.id === editingId ? saved : contact));
    setSelected(saved);
    setNotice(editingId == null ? 'Contacto agregado a la demostración.' : 'Cambios guardados en la demostración.');
    setSheetMode('detail');
  };

  const deleteContact = () => {
    if (!selected) return;
    updateContacts(current => current.filter(contact => contact.id !== selected.id));
    setSelected(null);
    setSheetMode('closed');
  };

  return (
    <div className="space-y-5">
      <label className="relative block">
        <span className="sr-only">Buscar contactos</span>
        <Search className="absolute left-4 top-4 h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nombre o teléfono" className="h-14 w-full rounded-2xl border bg-white pl-12 pr-4 text-[17px] shadow-sm" />
      </label>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <button type="button" onClick={() => setFiltersOpen(true)} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border bg-white px-4 text-left text-[17px] font-bold shadow-sm">
          <span className="flex items-center gap-3"><Filter className="text-primary" aria-hidden="true" /> Mostrar</span>
          <span className="text-[15px] text-primary">{filter === 'all' ? 'Todos' : contactType[filter].label}</span>
        </button>
        <Button type="button" size="lg" onClick={showAdd}><Plus aria-hidden="true" /> Agregar</Button>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div><p className="text-[15px] font-semibold text-muted-foreground">TU LISTA</p><h2 className="text-2xl font-bold">Contactos</h2></div>
        <span className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-muted-foreground shadow-sm">{visibleContacts.length}</span>
      </div>

      {visibleContacts.length ? (
        <Card className="overflow-hidden">
          {visibleContacts.map((contact, index) => (
            <button key={contact.id} type="button" onClick={() => showContact(contact)} className={`flex min-h-20 w-full items-center gap-4 p-4 text-left ${index ? 'border-t' : ''}`}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary">{initials(contact.name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[18px] font-bold">{contact.name}</span>
                <span className="mt-0.5 block truncate text-[15px] text-muted-foreground">{contact.nextAction}</span>
              </span>
              <ChevronRight className="shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          ))}
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <h2 className="text-xl font-bold">No encontramos contactos</h2>
          <p className="mt-2 text-[16px] text-muted-foreground">Cambia la búsqueda o el filtro. Tus contactos siguen aquí.</p>
          <Button type="button" size="lg" className="mt-4 w-full" onClick={() => { setQuery(''); setFilter('all'); }}>Ver todos</Button>
        </Card>
      )}

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-3xl px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
          <SheetHeader className="pr-14 text-left"><SheetTitle className="text-2xl">Mostrar contactos</SheetTitle><SheetDescription className="text-[16px]">Elige un tipo para reducir la lista.</SheetDescription></SheetHeader>
          <div className="mt-5 space-y-1" role="radiogroup" aria-label="Tipo de contacto">
            {[
              { value: /** @type {ContactFilter} */ ('all'), label: 'Todos los contactos' },
              { value: /** @type {ContactFilter} */ ('prospecto'), label: 'Prospectos' },
              { value: /** @type {ContactFilter} */ ('cliente'), label: 'Clientes' },
              { value: /** @type {ContactFilter} */ ('socio'), label: 'Socios' },
            ].map(option => (
              <button key={option.value} type="button" role="radio" aria-checked={filter === option.value} onClick={() => { setFilter(option.value); setFiltersOpen(false); }} className="flex min-h-14 w-full items-center justify-between rounded-2xl px-3 text-left text-[17px] hover:bg-muted">
                {option.label}<span className={`grid h-7 w-7 place-items-center rounded-full border-2 ${filter === option.value ? 'border-primary bg-primary text-white' : 'border-border text-transparent'}`}><Check className="h-4 w-4" aria-hidden="true" /></span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={sheetMode !== 'closed'} onOpenChange={open => { if (!open) setSheetMode('closed'); }}>
        <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-lg overflow-y-auto rounded-t-3xl px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
          {sheetMode === 'detail' && selected && (
            <>
              <SheetHeader className="pr-14 text-left"><SheetTitle className="text-2xl">{selected.name}</SheetTitle><SheetDescription className="text-[16px]">{contactType[selected.type].label} · Datos ficticios</SheetDescription></SheetHeader>
              <div className="mt-5 flex items-center gap-4"><span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-primary/10 text-2xl font-bold text-primary">{initials(selected.name)}</span><div><p className="text-[17px] font-semibold">{selected.phone}</p><p className="mt-1 text-[15px] text-muted-foreground">{selected.nextAction}</p></div></div>
              {notice && <p className="mt-4 rounded-2xl bg-blue-50 p-3 text-[15px] font-semibold text-blue-900" role="status">{notice}</p>}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button type="button" size="lg" onClick={() => setNotice('Demostración segura: no se realizó ninguna llamada.')}><Phone aria-hidden="true" /> Llamar</Button>
                <Button type="button" size="lg" variant="outline" className="bg-white" onClick={() => setNotice('Demostración segura: no se abrió WhatsApp.')}><MessageCircle aria-hidden="true" /> WhatsApp</Button>
              </div>
              <Button type="button" size="lg" variant="outline" className="mt-3 w-full bg-white" onClick={() => showEdit(selected)}><Pencil aria-hidden="true" /> Editar contacto</Button>
              <button type="button" className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-[17px] font-bold text-destructive" onClick={() => setSheetMode('delete')}><Trash2 aria-hidden="true" /> Eliminar contacto</button>
            </>
          )}

          {sheetMode === 'form' && (
            <form onSubmit={saveContact}>
              <SheetHeader className="pr-14 text-left"><SheetTitle className="text-2xl">{editingId == null ? 'Agregar contacto' : 'Editar contacto'}</SheetTitle><SheetDescription className="text-[16px]">Se guarda sólo en esta demostración.</SheetDescription></SheetHeader>
              <div className="mt-5 space-y-4">
                <label className="block"><span className="mb-2 block text-[16px] font-bold">Nombre completo</span><input required autoComplete="off" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} className="h-14 w-full rounded-2xl border bg-white px-4 text-[17px]" placeholder="Ejemplo: Elena Torres" /></label>
                <label className="block"><span className="mb-2 block text-[16px] font-bold">Teléfono</span><input required type="tel" autoComplete="off" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} className="h-14 w-full rounded-2xl border bg-white px-4 text-[17px]" placeholder="Ejemplo: +52 55 0000 0199" /></label>
                <label className="block"><span className="mb-2 block text-[16px] font-bold">Tipo de contacto</span><select value={form.type} onChange={event => setForm(current => ({ ...current, type: /** @type {ContactType} */ (event.target.value) }))} className="h-14 w-full rounded-2xl border bg-white px-4 text-[17px]">{/** @type {ContactType[]} */ (['prospecto', 'cliente', 'socio']).map(type => <option key={type} value={type}>{contactType[type].label}</option>)}</select></label>
                <label className="block"><span className="mb-2 block text-[16px] font-bold">Siguiente acción</span><input value={form.nextAction} onChange={event => setForm(current => ({ ...current, nextAction: event.target.value }))} className="h-14 w-full rounded-2xl border bg-white px-4 text-[17px]" placeholder="Ejemplo: Llamar mañana" /></label>
              </div>
              <Button type="submit" size="lg" className="mt-6 w-full">{editingId == null ? 'Agregar contacto' : 'Guardar cambios'}</Button>
              <Button type="button" size="lg" variant="ghost" className="mt-2 w-full" onClick={() => setSheetMode(editingId == null ? 'closed' : 'detail')}>Cancelar</Button>
            </form>
          )}

          {sheetMode === 'delete' && selected && (
            <>
              <SheetHeader className="pr-14 text-left"><SheetTitle className="text-2xl">¿Eliminar a {selected.name}?</SheetTitle><SheetDescription className="text-[16px]">Sólo desaparecerá de esta demostración. No cambia ningún dato real.</SheetDescription></SheetHeader>
              <div className="mt-6 space-y-3"><Button type="button" size="lg" variant="destructive" className="w-full" onClick={deleteContact}><Trash2 aria-hidden="true" /> Sí, eliminar de la demo</Button><Button type="button" size="lg" variant="outline" className="w-full bg-white" onClick={() => setSheetMode('detail')}>No, conservar contacto</Button></div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
