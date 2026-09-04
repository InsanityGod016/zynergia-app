import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, Pencil, Plus, Search, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '@/api/db';
import { Input } from '@/components/ui/input';
import StateView from '@/components/ui/StateView';
import { templateSituation } from '@/lib/templateResolution';
import { createPageUrl } from '@/utils';

const FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'repurchase', label: 'Recompra' },
  { value: 'product', label: 'Producto' },
  { value: 'product-prospect', label: 'Prospecto de producto' },
  { value: 'business', label: 'Negocio' },
  { value: 'fast-start', label: 'Fast Start' },
  { value: 'referral', label: 'Referidos' },
  { value: 'mine', label: 'Creadas por mí' },
];

function situationLabel(template) {
  return FILTERS.find(filter => filter.value === templateSituation(template))?.label || 'Seguimiento';
}

export default function Templates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const templatesQuery = useQuery({ queryKey: ['templates'], queryFn: () => db.Template.list() });

  const visibleTemplates = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return (templatesQuery.data || []).filter(template => {
      const matchesFilter = filter === 'all' || (filter === 'mine' ? template.origin === 'user' : templateSituation(template) === filter);
      const searchable = `${template.name || ''} ${template.content || ''}`.toLocaleLowerCase('es');
      return matchesFilter && (!term || searchable.includes(term));
    });
  }, [filter, search, templatesQuery.data]);

  const duplicateMutation = useMutation({
    mutationFn: (/** @type {any} */ template) => db.Template.create({
      name: `Copia de ${template.name}`,
      category: template.category,
      subcategory: template.subcategory,
      tone: template.tone || 'general',
      content: template.content,
      contact_id: template.contact_id || null,
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
    mutationFn: (/** @type {any} */ template) => db.Template.setDefault(template.id),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['templates'] }); toast.success('Plantilla predeterminada actualizada.'); },
    onError: error => toast.error(error.message || 'No pudimos cambiar la plantilla predeterminada.'),
  });

  return (
    <main className="min-h-dvh bg-[#F7F9FC] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-white/95 px-4 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigate(createPageUrl('More'))} className="flex min-h-12 items-center gap-1 rounded-xl pr-3 text-[17px] font-semibold" aria-label="Volver a Cuenta">
            <span className="flex h-12 w-10 items-center justify-center"><ArrowLeft className="h-6 w-6" aria-hidden="true" /></span> Volver
          </button>
          <button type="button" onClick={() => navigate(`${createPageUrl('EditTemplate')}?new=1`)} className="flex min-h-12 items-center gap-2 rounded-xl bg-[#004AFE] px-4 text-[16px] font-semibold text-white active:scale-[0.98]">
            <Plus className="h-5 w-5" aria-hidden="true" /> Nueva
          </button>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0F172A]">Plantillas de mensajes</h1>
        <p className="mt-1 text-[16px] text-[#64748B]">Prepara tus mensajes una vez y envíalos en segundos.</p>
        <label className="relative mt-4 block">
          <span className="sr-only">Buscar plantilla</span><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
          <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar plantilla" className="h-14 rounded-2xl bg-[#F8FAFC] pl-12 text-[17px]" />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar plantillas">
          {FILTERS.map(item => <button key={item.value} type="button" onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={`min-h-12 shrink-0 rounded-xl px-4 text-[15px] font-semibold ${filter === item.value ? 'bg-[#EAF0FF] text-[#004AFE]' : 'bg-[#F1F5F9] text-[#475569]'}`}>{item.label}</button>)}
        </div>
      </header>

      <section className="px-5 py-5">
        {templatesQuery.isPending && <StateView state="loading" title="Cargando plantillas" />}
        {templatesQuery.isError && <StateView state="error" title="No pudimos cargar tus plantillas" description="Tus mensajes siguen guardados. Revisa tu conexión e intenta de nuevo." actionLabel="Intentar de nuevo" onAction={() => templatesQuery.refetch()} />}
        {!templatesQuery.isPending && !templatesQuery.isError && visibleTemplates.length === 0 && <StateView state="empty" title="No encontramos plantillas" description="Prueba otro filtro o crea tu propio mensaje." actionLabel="Crear plantilla" onAction={() => navigate(`${createPageUrl('EditTemplate')}?new=1`)} />}

        <div className="space-y-3">
          {visibleTemplates.map(template => (
            <article key={template.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <button type="button" onClick={() => navigate(`${createPageUrl('EditTemplate')}?id=${encodeURIComponent(template.id)}`)} className="block min-h-16 w-full rounded-xl text-left focus-visible:ring-2 focus-visible:ring-[#004AFE]">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-[#F1F5F9] px-2.5 py-1 text-[15px] font-semibold text-[#475569]">{situationLabel(template)}</span>
                  {template.is_default && <span className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-[15px] font-semibold text-amber-700"><Star className="h-4 w-4 fill-current" /> Predeterminada</span>}
                </span>
                <span className="mt-2 block text-[17px] font-bold text-[#0F172A]">{template.name}</span>
                <span className="mt-1 block line-clamp-2 text-[15px] leading-6 text-[#64748B]">{template.content}</span>
              </button>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button type="button" onClick={() => navigate(`${createPageUrl('EditTemplate')}?id=${encodeURIComponent(template.id)}`)} className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-[#F1F5F9] px-2 text-[15px] font-semibold text-[#334155]"><Pencil className="h-4 w-4" /> Editar</button>
                <button type="button" disabled={duplicateMutation.isPending} onClick={() => duplicateMutation.mutate(template)} className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-[#F1F5F9] px-2 text-[15px] font-semibold text-[#334155] disabled:opacity-50"><Copy className="h-4 w-4" /> Duplicar</button>
                <button type="button" disabled={template.is_default || defaultMutation.isPending} onClick={() => defaultMutation.mutate(template)} className="flex min-h-12 items-center justify-center gap-1 rounded-xl border border-[#D7E1F0] bg-white px-2 text-[15px] font-semibold text-[#004AFE] disabled:opacity-50"><Star className="h-4 w-4" /> Usar</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
