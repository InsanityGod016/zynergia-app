import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowLeft, Check, Copy, FolderPlus, Pencil, Plus, Search, Share2, Star, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '@/api/db';
import { Input } from '@/components/ui/input';
import StateView from '@/components/ui/StateView';
import { templateSituation } from '@/lib/templateResolution';
import {
  TEMPLATE_SITUATIONS,
  templatesForCategory,
  templateSituationLabel,
} from '@/lib/templateSharing';
import { templateShareUrl } from '@/lib/app-links';
import { createOperationId } from '@/lib/operationId';
import { createPageUrl } from '@/utils';

const FILTERS = [
  { value: 'all', label: 'Todas' },
  ...TEMPLATE_SITUATIONS.filter(item => item.value !== 'manual'),
  { value: 'mine', label: 'Creadas por mí' },
];

function CategoryManager({ categories, onClose }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [situation, setSituation] = useState('product');

  const reset = () => { setEditing(null); setName(''); setSituation('product'); };
  const saveMutation = useMutation({
    mutationFn: () => editing
      ? db.TemplateCategory.update(editing.id, { name: name.trim(), situation })
      : db.TemplateCategory.create({ name: name.trim(), situation }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['template-categories'] }),
        queryClient.invalidateQueries({ queryKey: ['templates'] }),
      ]);
      toast.success(editing ? 'Categoría actualizada.' : 'Categoría creada.');
      reset();
    },
    onError: error => toast.error(error.message || 'No pudimos guardar la categoría.'),
  });
  const archiveMutation = useMutation({
    mutationFn: (/** @type {any} */ category) => db.TemplateCategory.archive(category.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['template-categories'] }),
        queryClient.invalidateQueries({ queryKey: ['templates'] }),
      ]);
      toast.success('Categoría archivada. Las plantillas se conservaron.');
      reset();
    },
    onError: error => toast.error(error.message || 'No pudimos archivar la categoría.'),
  });

  const editCategory = category => {
    setEditing(category);
    setName(category.name);
    setSituation(category.situation);
  };

  return (
    <section className="mt-4 rounded-2xl border border-[#D7E1F0] bg-white p-4" aria-labelledby="template-categories-title">
      <div className="flex items-center justify-between gap-3">
        <div><h2 id="template-categories-title" className="text-[18px] font-bold text-[#0F172A]">Tus categorías</h2><p className="mt-1 text-[15px] text-[#64748B]">Agrupa mensajes que sirven para la misma situación.</p></div>
        <button type="button" onClick={onClose} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[#475569]" aria-label="Cerrar categorías"><X className="h-5 w-5" /></button>
      </div>

      <div className="mt-4 space-y-3">
        <Input value={name} onChange={event => setName(event.target.value)} placeholder="Ej. Seguimiento a doctores" className="h-14 rounded-2xl text-[17px]" maxLength={80} />
        <select value={situation} onChange={event => setSituation(event.target.value)} className="h-14 w-full rounded-2xl border border-input bg-white px-4 text-[17px]">
          {TEMPLATE_SITUATIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          {editing && <button type="button" onClick={reset} className="min-h-12 rounded-xl bg-[#F1F5F9] px-3 text-[15px] font-semibold text-[#334155]">Cancelar</button>}
          <button type="button" disabled={!name.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()} className={`${editing ? '' : 'col-span-2'} min-h-12 rounded-xl bg-[#004AFE] px-3 text-[15px] font-semibold text-white disabled:opacity-50`}>
            {saveMutation.isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {categories.map(category => (
          <div key={category.id} className="flex min-h-16 items-center gap-2 rounded-xl bg-[#F8FAFC] px-3 py-2">
            <div className="min-w-0 flex-1"><p className="truncate text-[16px] font-bold text-[#0F172A]">{category.name}</p><p className="text-[15px] text-[#64748B]">{templateSituationLabel(category.situation)}</p></div>
            <button type="button" onClick={() => editCategory(category)} className="flex h-12 w-12 items-center justify-center rounded-xl text-[#004AFE]" aria-label={`Editar ${category.name}`}><Pencil className="h-5 w-5" /></button>
            <button type="button" onClick={() => window.confirm(`¿Archivar “${category.name}”? Las plantillas no se borrarán.`) && archiveMutation.mutate(category)} className="flex h-12 w-12 items-center justify-center rounded-xl text-red-700" aria-label={`Archivar ${category.name}`}><Archive className="h-5 w-5" /></button>
          </div>
        ))}
        {!categories.length && <p className="rounded-xl bg-[#F8FAFC] p-4 text-[15px] text-[#64748B]">Todavía no has creado categorías.</p>}
      </div>
    </section>
  );
}

function ActiveShares({ shares, onRevoke, isRevoking }) {
  const active = shares.filter(share => !share.revoked_at && new Date(share.expires_at).getTime() > Date.now());
  if (!active.length) return null;
  return (
    <section className="mt-6" aria-labelledby="active-template-links-title">
      <h2 id="active-template-links-title" className="text-[18px] font-bold text-[#0F172A]">Enlaces activos</h2>
      <p className="mt-1 text-[15px] text-[#64748B]">Vencen en 30 días. Puedes desactivarlos antes.</p>
      <div className="mt-3 space-y-2">
        {active.map(share => (
          <div key={share.id} className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-3">
            <div className="min-w-0 flex-1"><p className="text-[16px] font-bold text-[#0F172A]">{share.snapshot?.length || 0} plantilla{share.snapshot?.length === 1 ? '' : 's'}</p><p className="text-[15px] text-[#64748B]">Vence {new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(share.expires_at))}</p></div>
            <button type="button" disabled={isRevoking} onClick={() => onRevoke(share.id)} className="min-h-12 rounded-xl px-3 text-[15px] font-semibold text-red-700 disabled:opacity-50">Desactivar</button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Templates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareGroup, setShareGroup] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [lastShare, setLastShare] = useState(null);
  const shareOperationRef = useRef({ selection: '', id: '' });
  const templatesQuery = useQuery({ queryKey: ['templates'], queryFn: () => db.Template.list() });
  const categoriesQuery = useQuery({ queryKey: ['template-categories'], queryFn: () => db.TemplateCategory.list(), retry: false });
  const sharesQuery = useQuery({ queryKey: ['template-shares'], queryFn: () => db.TemplateShare.list(), retry: false });
  const templates = templatesQuery.data || [];
  const categories = categoriesQuery.data || [];

  const visibleTemplates = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return templates.filter(template => {
      const matchesFilter = filter === 'all'
        || (filter === 'mine' ? template.origin === 'user' : filter.startsWith('category:')
          ? String(template.category_id || '') === filter.slice('category:'.length)
          : templateSituation(template) === filter);
      const searchable = `${template.name || ''} ${template.content || ''}`.toLocaleLowerCase('es');
      return matchesFilter && (!term || searchable.includes(term));
    });
  }, [filter, search, templates]);

  const duplicateMutation = useMutation({
    mutationFn: (/** @type {any} */ template) => db.Template.create({
      name: `Copia de ${template.name}`,
      category: template.category,
      subcategory: template.subcategory,
      situation: templateSituation(template),
      tone: template.tone || 'general',
      content: template.content,
      contact_id: template.contact_id || null,
      category_id: template.category_id || null,
      is_default: false,
    }),
    onSuccess: async template => {
      await queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Plantilla duplicada.');
      navigate(`${createPageUrl('EditTemplate')}?id=${encodeURIComponent(template.id)}`);
    },
    onError: error => toast.error(error.message || 'No pudimos duplicar la plantilla.'),
  });

  const defaultMutation = useMutation({
    mutationFn: (/** @type {{ template: any, enabled: boolean }} */ { template, enabled }) => db.Template.setDefault(template.id, enabled),
    onSuccess: async (_data, /** @type {{ template: any, enabled: boolean }} */ variables) => {
      await queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success(variables.enabled ? 'Esta plantilla se usará primero.' : 'La plantilla dejó de usarse primero.');
    },
    onError: error => toast.error(error.message || 'No pudimos cambiar la plantilla predeterminada.'),
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      const selected = templates.filter(template => selectedIds.has(String(template.id)));
      const selection = selected.map(template => String(template.id)).sort().join('\u001f');
      if (shareOperationRef.current.selection !== selection) {
        shareOperationRef.current = { selection, id: createOperationId() };
      }
      return db.TemplateShare.create(shareOperationRef.current.id, selected);
    },
    onSuccess: async bundle => {
      const url = templateShareUrl(bundle.token);
      setLastShare({ ...bundle, url });
      shareOperationRef.current = { selection: '', id: '' };
      await queryClient.invalidateQueries({ queryKey: ['template-shares'] });
      toast.success('Enlace listo para compartir.');
    },
    onError: error => toast.error(error.message || 'No pudimos preparar el enlace.'),
  });

  const revokeMutation = useMutation({
    mutationFn: id => db.TemplateShare.revoke(id),
    onSuccess: async (_data, id) => {
      if (lastShare?.id === id) setLastShare(null);
      await queryClient.invalidateQueries({ queryKey: ['template-shares'] });
      toast.success('Enlace desactivado.');
    },
    onError: error => toast.error(error.message || 'No pudimos desactivar el enlace.'),
  });

  const toggleSelected = id => setSelectedIds(current => {
    const next = new Set(current);
    if (next.has(String(id))) next.delete(String(id));
    else next.add(String(id));
    return next;
  });

  const selectGroup = () => {
    const groupTemplates = templatesForCategory(templates, shareGroup);
    setSelectedIds(new Set(groupTemplates.map(template => String(template.id))));
  };

  const shareLink = async () => {
    if (!lastShare?.url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Plantillas de Zynergia', text: 'Importa estas plantillas en tu cuenta de Zynergia.', url: lastShare.url });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(lastShare.url);
      toast.success('Enlace copiado.');
    } catch {
      toast.error('No se pudo copiar. Mantén presionado el enlace para seleccionarlo.');
    }
  };

  const stopSharing = () => { setSharing(false); setSelectedIds(new Set()); setShareGroup(''); setLastShare(null); };

  return (
    <main className="min-h-dvh bg-[#F7F9FC] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-white/95 px-4 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <button type="button" onClick={() => navigate(createPageUrl('More'))} className="flex min-h-12 items-center gap-1 rounded-xl pr-3 text-[17px] font-semibold" aria-label="Volver a Cuenta"><span className="flex h-12 w-10 items-center justify-center"><ArrowLeft className="h-6 w-6" /></span> Volver</button>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">Plantillas de mensajes</h1>
        <p className="mt-1 text-[16px] text-[#64748B]">Prepara tus mensajes una vez y envíalos en segundos.</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => navigate(`${createPageUrl('EditTemplate')}?new=1`)} className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-[#004AFE] px-2 text-[15px] font-semibold text-white"><Plus className="h-5 w-5" /> Nueva</button>
          <button type="button" onClick={() => setShowCategories(value => !value)} aria-pressed={showCategories} className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-[#F1F5F9] px-2 text-[15px] font-semibold text-[#334155]"><FolderPlus className="h-5 w-5" /> Categorías</button>
          <button type="button" onClick={() => sharing ? stopSharing() : setSharing(true)} aria-pressed={sharing} className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-[#F1F5F9] px-2 text-[15px] font-semibold text-[#334155]"><Share2 className="h-5 w-5" /> {sharing ? 'Cancelar' : 'Compartir'}</button>
        </div>

        <label className="relative mt-4 block"><span className="sr-only">Buscar plantilla</span><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748B]" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar plantilla" className="h-14 rounded-2xl bg-[#F8FAFC] pl-12 text-[17px]" /></label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar plantillas">
          {FILTERS.map(item => <button key={item.value} type="button" onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={`min-h-12 shrink-0 rounded-xl px-4 text-[15px] font-semibold ${filter === item.value ? 'bg-[#EAF0FF] text-[#004AFE]' : 'bg-[#F1F5F9] text-[#475569]'}`}>{item.label}</button>)}
          {categories.map(category => <button key={category.id} type="button" onClick={() => setFilter(`category:${category.id}`)} aria-pressed={filter === `category:${category.id}`} className={`min-h-12 shrink-0 rounded-xl px-4 text-[15px] font-semibold ${filter === `category:${category.id}` ? 'bg-[#EAF0FF] text-[#004AFE]' : 'bg-[#F1F5F9] text-[#475569]'}`}>{category.name}</button>)}
        </div>
      </header>

      <section className="px-5 py-5">
        {showCategories && !categoriesQuery.isError && <CategoryManager categories={categories} onClose={() => setShowCategories(false)} />}
        {showCategories && categoriesQuery.isError && <p className="mb-4 rounded-xl bg-red-50 p-3 text-[15px] text-red-700" role="alert">No pudimos abrir las categorías. Intenta de nuevo.</p>}

        {sharing && (
          <section className="mb-5 rounded-2xl border border-[#BFD0FF] bg-[#F5F8FF] p-4" aria-labelledby="share-templates-title">
            <h2 id="share-templates-title" className="text-[17px] font-bold text-[#0F172A]">Elige qué compartir</h2>
            <p className="mt-1 text-[15px] text-[#64748B]">Selecciona una categoría completa o marca plantillas abajo.</p>
            <div className="mt-3 flex gap-2">
              <select value={shareGroup} onChange={event => setShareGroup(event.target.value)} className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#D7E1F0] bg-white px-3 text-[16px]">
                <option value="">Elegir categoría</option>
                {TEMPLATE_SITUATIONS.map(item => <option key={item.value} value={`situation:${item.value}`}>{item.label}</option>)}
                {categories.map(category => <option key={category.id} value={`custom:${category.id}`}>{category.name}</option>)}
              </select>
              <button type="button" disabled={!shareGroup} onClick={selectGroup} className="min-h-12 rounded-xl bg-white px-3 text-[15px] font-semibold text-[#004AFE] disabled:opacity-50">Seleccionar</button>
            </div>
            <button type="button" disabled={!selectedIds.size || shareMutation.isPending} onClick={() => shareMutation.mutate()} className="mt-3 min-h-12 w-full rounded-xl bg-[#004AFE] px-4 text-[16px] font-bold text-white disabled:opacity-50">
              {shareMutation.isPending ? 'Preparando…' : `Crear enlace para ${selectedIds.size} plantilla${selectedIds.size === 1 ? '' : 's'}`}
            </button>
            {lastShare?.url && (
              <div className="mt-3 rounded-xl bg-white p-3">
                <p className="break-all text-[15px] text-[#475569]">{lastShare.url}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={shareLink} className="min-h-12 rounded-xl bg-[#004AFE] px-3 text-[15px] font-semibold text-white"><Share2 className="mr-1 inline h-4 w-4" /> Compartir enlace</button>
                  <button type="button" onClick={() => revokeMutation.mutate(lastShare.id)} className="min-h-12 rounded-xl bg-red-50 px-3 text-[15px] font-semibold text-red-700">Desactivar</button>
                </div>
              </div>
            )}
          </section>
        )}

        {templatesQuery.isPending && <StateView state="loading" title="Cargando plantillas" />}
        {templatesQuery.isError && <StateView state="error" title="No pudimos cargar tus plantillas" description="Tus mensajes siguen guardados. Revisa tu conexión e intenta de nuevo." actionLabel="Intentar de nuevo" onAction={() => templatesQuery.refetch()} />}
        {!templatesQuery.isPending && !templatesQuery.isError && visibleTemplates.length === 0 && <StateView state="empty" title="No encontramos plantillas" description="Prueba otro filtro o crea tu propio mensaje." actionLabel="Crear plantilla" onAction={() => navigate(`${createPageUrl('EditTemplate')}?new=1`)} />}

        <div className="space-y-3">
          {visibleTemplates.map(template => {
            const customCategory = categories.find(category => String(category.id) === String(template.category_id || ''));
            const selected = selectedIds.has(String(template.id));
            return (
              <article key={template.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${selected ? 'border-[#004AFE] ring-2 ring-[#004AFE]/15' : 'border-[#E2E8F0]'}`}>
                <button type="button" onClick={() => sharing ? toggleSelected(template.id) : navigate(`${createPageUrl('EditTemplate')}?id=${encodeURIComponent(template.id)}`)} aria-pressed={sharing ? selected : undefined} className="block min-h-16 w-full rounded-xl text-left focus-visible:ring-2 focus-visible:ring-[#004AFE]">
                  <span className="flex flex-wrap items-center gap-2">
                    {sharing && <span className={`flex h-7 w-7 items-center justify-center rounded-lg border ${selected ? 'border-[#004AFE] bg-[#004AFE] text-white' : 'border-[#CBD5E1] bg-white text-transparent'}`}><Check className="h-4 w-4" /></span>}
                    <span className="rounded-lg bg-[#F1F5F9] px-2.5 py-1 text-[15px] font-semibold text-[#475569]">{customCategory?.name || templateSituationLabel(templateSituation(template))}</span>
                    {template.is_default && <span className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[15px] font-semibold text-amber-700"><Star className="h-4 w-4 fill-current" /> Se usa primero</span>}
                  </span>
                  <span className="mt-2 block text-[17px] font-bold text-[#0F172A]">{template.name}</span>
                  <span className="mt-1 block line-clamp-2 text-[15px] leading-6 text-[#64748B]">{template.content}</span>
                </button>
                {!sharing && <div className="mt-3 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => navigate(`${createPageUrl('EditTemplate')}?id=${encodeURIComponent(template.id)}`)} className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-[#F1F5F9] px-2 text-[15px] font-semibold text-[#334155]"><Pencil className="h-4 w-4" /> Editar</button>
                  <button type="button" disabled={duplicateMutation.isPending} onClick={() => duplicateMutation.mutate(template)} className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-[#F1F5F9] px-2 text-[15px] font-semibold text-[#334155] disabled:opacity-50"><Copy className="h-4 w-4" /> Duplicar</button>
                  <button type="button" disabled={defaultMutation.isPending} onClick={() => defaultMutation.mutate({ template, enabled: !template.is_default })} className={`flex min-h-12 items-center justify-center gap-1 rounded-xl border px-2 text-[14px] font-semibold disabled:opacity-50 ${template.is_default ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-[#D7E1F0] bg-white text-[#004AFE]'}`}><Star className="h-4 w-4" /> {template.is_default ? 'Dejar de usar' : 'Usar'}</button>
                </div>}
              </article>
            );
          })}
        </div>

        {sharesQuery.isError && (
          <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-red-50 p-4" role="alert">
            <p className="text-[15px] leading-6 text-red-700">No pudimos revisar tus enlaces activos.</p>
            <button type="button" onClick={() => sharesQuery.refetch()} className="min-h-12 shrink-0 rounded-xl bg-white px-3 text-[15px] font-semibold text-[#004AFE]">Reintentar</button>
          </div>
        )}
        <ActiveShares shares={sharesQuery.data || []} onRevoke={id => revokeMutation.mutate(id)} isRevoking={revokeMutation.isPending} />
      </section>
    </main>
  );
}
