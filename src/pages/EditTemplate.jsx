import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowLeft, Check, Search, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '@/api/db';
import TemplateComposer from '@/components/templates/TemplateComposer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StateView from '@/components/ui/StateView';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { filterContacts } from '@/lib/contactSearch';
import { templateSituation } from '@/lib/templateResolution';
import { normalizeTemplateContent, previewTemplate, unknownTemplateVariables } from '@/lib/templateVariables';
import { createPageUrl } from '@/utils';

const SITUATIONS = [
  { value: 'repurchase', label: 'Recompra', category: 'recompra', subcategory: 'producto_recompra' },
  { value: 'product', label: 'Seguimiento de producto', category: 'seguimiento', subcategory: 'producto_seguimiento' },
  { value: 'product-prospect', label: 'Prospecto de producto', category: 'seguimiento', subcategory: 'prospecto_producto' },
  { value: 'business', label: 'Prospecto de negocio', category: 'seguimiento', subcategory: 'prospecto_partner' },
  { value: 'fast-start', label: 'Partner / Fast Start', category: 'seguimiento', subcategory: 'partner_fast_start' },
  { value: 'referral', label: 'Referidos', category: 'seguimiento', subcategory: 'referido' },
  { value: 'manual', label: 'Mensaje manual', category: 'seguimiento', subcategory: 'manual' },
];

const EMPTY_TEMPLATE = {
  name: '', content: '', situation: 'repurchase', category: 'recompra', subcategory: 'producto_recompra', tone: 'general', contact_id: '', category_id: '', is_default: false,
};

function normalizedTemplate(template) {
  return {
    ...template,
    content: normalizeTemplateContent(template.content || ''),
    situation: templateSituation(template),
    contact_id: template.contact_id || '',
    category_id: template.category_id || '',
    tone: template.tone || 'general',
    is_default: Boolean(template.is_default),
  };
}

function ContactSearch({ contacts, value, onChange }) {
  const [query, setQuery] = useState('');
  const selected = contacts.find(contact => contact.id === value);
  const matches = useMemo(() => filterContacts(contacts, query), [contacts, query]);

  return (
    <div>
      <label htmlFor="template-contact-search" className="block text-[16px] font-semibold text-[#0F172A]">
        Contacto específico <span className="font-normal text-[#64748B]">(opcional)</span>
      </label>
      <p id="template-contact-help" className="mt-1 text-[15px] leading-6 text-[#64748B]">
        Déjalo vacío para poder usarla con cualquier contacto.
      </p>

      {selected && (
        <div className="mt-3 flex min-h-14 items-center gap-3 rounded-2xl border border-[#BFD0FF] bg-[#F5F8FF] px-4 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#004AFE] text-white"><Check className="h-4 w-4" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-bold text-[#0F172A]">{selected.full_name || 'Sin nombre'}</p>
            {selected.phone && <p className="truncate text-[15px] text-[#64748B]">{selected.phone}</p>}
          </div>
          <button type="button" onClick={() => onChange('')} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[#475569] outline-none focus-visible:ring-2 focus-visible:ring-[#004AFE]" aria-label={`Quitar a ${selected.full_name || 'este contacto'}`}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
        <Input
          id="template-contact-search"
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          className="h-14 rounded-2xl bg-white pl-12 pr-4 text-[17px]"
          placeholder={selected ? 'Buscar otro contacto' : 'Buscar por nombre o teléfono'}
          autoComplete="off"
          aria-describedby="template-contact-help template-contact-results-status"
        />
      </div>

      <p id="template-contact-results-status" className="sr-only" aria-live="polite">
        {query.trim() ? `${matches.length} contacto${matches.length === 1 ? '' : 's'} encontrado${matches.length === 1 ? '' : 's'}` : ''}
      </p>

      {query.trim() && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-2xl border border-[#D7E1F0] bg-white p-1 shadow-lg" aria-label="Contactos encontrados">
          {matches.length ? matches.map(contact => (
            <button
              key={contact.id}
              type="button"
              onClick={() => { onChange(contact.id); setQuery(''); }}
              className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-4 py-2 text-left outline-none hover:bg-[#F1F5F9] focus-visible:bg-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#004AFE]"
            >
              <span className="min-w-0">
                <span className="block truncate text-[16px] font-semibold text-[#0F172A]">{contact.full_name || 'Sin nombre'}</span>
                {contact.phone && <span className="block truncate text-[15px] text-[#64748B]">{contact.phone}</span>}
              </span>
              {contact.id === value && <Check className="h-5 w-5 shrink-0 text-[#004AFE]" aria-label="Seleccionado" />}
            </button>
          )) : <p className="px-4 py-4 text-[15px] text-[#64748B]">No encontramos ese contacto.</p>}
        </div>
      )}
    </div>
  );
}

function TemplateForm({ template, isNew, contacts, categories }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(template);
  const [error, setError] = useState('');
  const [showArchive, setShowArchive] = useState(false);
  const baseline = useMemo(() => JSON.stringify(template), [template]);
  const dirty = JSON.stringify(form) !== baseline;
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const unknownVariables = unknownTemplateVariables(form.content);

  const changeSituation = value => {
    const situation = SITUATIONS.find(item => item.value === value);
    setForm(current => ({
      ...current,
      situation: value,
      category: situation.category,
      subcategory: situation.subcategory,
      category_id: categories.some(category => String(category.id) === String(current.category_id) && category.situation === value)
        ? current.category_id
        : '',
    }));
  };

  const changeCustomCategory = categoryId => {
    const customCategory = categories.find(category => String(category.id) === String(categoryId));
    if (!customCategory) {
      update('category_id', '');
      return;
    }
    const situation = SITUATIONS.find(item => item.value === customCategory.situation);
    setForm(current => ({
      ...current,
      category_id: customCategory.id,
      situation: customCategory.situation,
      category: situation.category,
      subcategory: situation.subcategory,
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setError('');
      const name = form.name.trim();
      const content = normalizeTemplateContent(form.content).trim();
      if (!name) throw new Error('Escribe un nombre para reconocer esta plantilla.');
      if (!content) throw new Error('Escribe el mensaje que quieres enviar.');
      if (unknownTemplateVariables(content).length) throw new Error('El mensaje contiene una variable que Zynergia no reconoce. Elimínala y usa los botones de variables.');
      const payload = {
        name, content, situation: form.situation, category: form.category, subcategory: form.subcategory,
        tone: form.tone, contact_id: form.contact_id || null, category_id: form.category_id || null, is_default: Boolean(form.is_default),
      };
      if (isNew) return db.Template.create(payload);
      const changed = Object.fromEntries(Object.entries(payload).filter(([key, value]) => {
        const original = key === 'contact_id' ? template[key] || null : template[key];
        return value !== original;
      }));
      return Object.keys(changed).length ? db.Template.update(template.id, changed) : template;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success(isNew ? 'Plantilla creada.' : 'Plantilla guardada.');
      navigate(createPageUrl('Templates'), { replace: true });
    },
    onError: mutationError => setError(mutationError.message || 'No pudimos guardar. Tu mensaje sigue aquí.'),
  });

  const archiveMutation = useMutation({
    mutationFn: () => db.Template.archive(template.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Plantilla archivada.');
      navigate(createPageUrl('Templates'), { replace: true });
    },
    onError: mutationError => { setShowArchive(false); setError(mutationError.message || 'No pudimos archivar la plantilla.'); },
  });

  const goBack = useCallback(() => {
    if (!dirty || window.confirm('¿Salir sin guardar tu mensaje?')) navigate(createPageUrl('Templates'));
  }, [dirty, navigate]);

  useEffect(() => {
    const warnBeforeUnload = event => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('zynergia:dirty-state', { detail: { dirty } }));
  }, [dirty]);

  useEffect(() => () => {
    window.dispatchEvent(new CustomEvent('zynergia:dirty-state', { detail: { dirty: false } }));
  }, []);

  useEffect(() => {
    window.addEventListener('zynergia:request-back', goBack);
    return () => window.removeEventListener('zynergia:request-back', goBack);
  }, [goBack]);

  return (
    <main className="min-h-dvh bg-[#F7F9FC] pb-32">
      <header className="sticky top-0 z-20 flex items-center border-b border-[#E2E8F0] bg-white/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <button type="button" onClick={goBack} className="flex min-h-12 items-center gap-1 rounded-xl pr-3 text-[17px] font-semibold"><span className="flex h-12 w-10 items-center justify-center"><ArrowLeft className="h-6 w-6" /></span> Volver</button>
      </header>

      <section className="mx-auto max-w-xl px-5 py-6">
        <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">{isNew ? 'Nueva plantilla' : 'Editar plantilla'}</h1>
        <p className="mt-1 text-[16px] leading-6 text-[#64748B]">Elige cuándo usarla y escribe el mensaje como quieres que llegue a WhatsApp.</p>

        <div className="mt-6 space-y-5">
          <label className="block text-[16px] font-semibold text-[#0F172A]">Nombre de la plantilla
            <Input value={form.name} onChange={event => update('name', event.target.value)} className="mt-2 h-14 rounded-2xl bg-white text-[17px]" placeholder="Ej. Recompra del Dr. Carlos" autoComplete="off" />
          </label>
          <label className="block text-[16px] font-semibold text-[#0F172A]">¿Para qué es?
            <select value={form.situation} onChange={event => changeSituation(event.target.value)} className="mt-2 h-14 w-full rounded-2xl border border-input bg-white px-4 text-[17px] shadow-sm">
              {SITUATIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="block text-[16px] font-semibold text-[#0F172A]">Categoría personalizada <span className="font-normal text-[#64748B]">(opcional)</span>
            <select value={form.category_id} onChange={event => changeCustomCategory(event.target.value)} className="mt-2 h-14 w-full rounded-2xl border border-input bg-white px-4 text-[17px] shadow-sm">
              <option value="">Sin categoría personalizada</option>
              {categories.map(category => <option key={category.id} value={category.id}>{category.name} · {SITUATIONS.find(item => item.value === category.situation)?.label || 'Seguimiento'}</option>)}
            </select>
            <span className="mt-1 block text-[15px] font-normal leading-6 text-[#64748B]">Puedes crear, renombrar o archivar categorías desde la lista de plantillas.</span>
          </label>
          <label className="block text-[16px] font-semibold text-[#0F172A]">Tono
            <select value={form.tone} onChange={event => update('tone', event.target.value)} className="mt-2 h-14 w-full rounded-2xl border border-input bg-white px-4 text-[17px] shadow-sm">
              <option value="general">General</option><option value="amigable">Amigable</option><option value="directo">Directo</option>
            </select>
          </label>
          <ContactSearch contacts={contacts} value={form.contact_id} onChange={contactId => update('contact_id', contactId)} />

          <div>
            <label htmlFor="template-content" className="block text-[16px] font-semibold text-[#0F172A]">Mensaje</label>
            <div className="mt-2"><TemplateComposer id="template-content" value={form.content} onChange={content => update('content', content)} describedBy="template-variables-help" /></div>
            {unknownVariables.length > 0 && <p className="mt-3 rounded-xl bg-red-50 p-3 text-[15px] font-semibold text-red-700" role="alert">Variable no reconocida: {unknownVariables.join(', ')}</p>}
          </div>

          <div className="rounded-2xl border border-[#D7E1F0] bg-[#F5F8FF] p-4">
            <p className="text-[15px] font-bold text-[#0F172A]">Así se verá</p>
            <p className="mt-2 whitespace-pre-wrap text-[16px] leading-7 text-[#334155]">{previewTemplate(form.content) || 'La vista previa aparecerá aquí.'}</p>
          </div>

          <label className="flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 text-[16px] font-semibold text-[#0F172A]">
            Usar primero para este tipo de tarea
            <input type="checkbox" checked={form.is_default} onChange={event => update('is_default', event.target.checked)} className="h-6 w-6 accent-[#004AFE]" />
          </label>
        </div>

        {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4" role="alert"><p className="font-bold text-red-700">No pudimos guardar</p><p className="mt-1 text-[15px] leading-6 text-red-700">{error} Tu mensaje sigue aquí.</p></div>}
        {!isNew && <button type="button" onClick={() => setShowArchive(true)} className="mt-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 text-[16px] font-semibold text-red-700"><Archive className="h-5 w-5" /> Archivar plantilla</button>}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E2E8F0] bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <Button type="button" size="lg" className="w-full" disabled={saveMutation.isPending || unknownVariables.length > 0} onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? 'Guardando…' : isNew ? 'Crear plantilla' : 'Guardar cambios'}</Button>
      </div>

      <AlertDialog open={showArchive} onOpenChange={setShowArchive}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-3xl">
          <AlertDialogHeader><AlertDialogTitle className="text-xl">¿Archivar esta plantilla?</AlertDialogTitle><AlertDialogDescription className="text-[15px] leading-6">Dejará de aparecer para mensajes nuevos. Las tareas y mensajes anteriores no se borrarán.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="gap-2"><AlertDialogCancel className="min-h-12 text-[15px]">Conservar plantilla</AlertDialogCancel><AlertDialogAction onClick={() => archiveMutation.mutate()} className="min-h-12 bg-red-600 text-[15px] hover:bg-red-700">{archiveMutation.isPending ? 'Archivando…' : 'Archivar'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

export default function EditTemplate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('new') === '1';
  const templateId = searchParams.get('id');
  const templatesQuery = useQuery({ queryKey: ['templates'], queryFn: () => db.Template.list(), enabled: !isNew });
  const contactsQuery = useQuery({ queryKey: ['contacts'], queryFn: () => db.Contact.list() });
  const categoriesQuery = useQuery({ queryKey: ['template-categories'], queryFn: () => db.TemplateCategory.list(), retry: false });
  const foundTemplate = templatesQuery.data?.find(template => template.id === templateId);
  const template = isNew ? EMPTY_TEMPLATE : foundTemplate ? normalizedTemplate(foundTemplate) : null;

  if (!isNew && templatesQuery.isPending) return <main className="min-h-dvh bg-white px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="loading" title="Cargando plantilla" /></main>;
  if (!isNew && templatesQuery.isError) return <main className="min-h-dvh bg-white px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="error" title="No pudimos abrir la plantilla" actionLabel="Intentar de nuevo" onAction={() => templatesQuery.refetch()} /></main>;
  if (!template) return <main className="min-h-dvh bg-white px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="empty" title="Plantilla no disponible" actionLabel="Volver a plantillas" onAction={() => navigate(createPageUrl('Templates'), { replace: true })} /></main>;
  return <TemplateForm key={template.id || 'new'} template={template} isNew={isNew} contacts={contactsQuery.data || []} categories={categoriesQuery.data || []} />;
}
