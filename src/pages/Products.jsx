import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Copy, Pencil, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '@/api/db';
import { Input } from '@/components/ui/input';
import StateView from '@/components/ui/StateView';
import { createPageUrl } from '@/utils';

const CATEGORIES = ['Premier Kits', 'Compra Única'];

function cycleLabel(product) {
  const days = Number(product.cycle_days) || Number(product.frequency_months) * 30;
  return days > 0 ? `Recompra cada ${days} días` : 'Sin recordatorio de recompra';
}

export default function Products() {
  const navigate = useNavigate();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => db.Product.list() });

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return (productsQuery.data || []).filter(product => {
      const matchesCategory = product.category === category;
      const searchable = `${product.name} ${product.subcategory || ''}`.toLocaleLowerCase('es');
      return matchesCategory && (!term || searchable.includes(term));
    });
  }, [category, productsQuery.data, search]);

  const groups = useMemo(() => Object.entries(visibleProducts.reduce((result, product) => {
    const key = product.subcategory || 'OTROS';
    (result[key] ||= []).push(product);
    return result;
  }, {})), [visibleProducts]);

  const copyLink = async product => {
    if (!product.link_url) {
      navigate(`${createPageUrl('EditProduct')}?id=${encodeURIComponent(product.id)}`);
      toast.info('Agrega primero el enlace de compra.');
      return;
    }
    try {
      await navigator.clipboard.writeText(product.link_url);
      setCopiedId(product.id);
      toast.success('Enlace copiado.');
      window.setTimeout(() => setCopiedId(''), 1800);
    } catch {
      toast.error('No pudimos copiar el enlace. Mantén presionado para copiarlo.');
    }
  };

  return (
    <main className="min-h-dvh bg-[#F7F9FC] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-white/95 px-4 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigate(createPageUrl('More'))} className="flex min-h-12 items-center gap-1 rounded-xl pr-3 text-[17px] font-semibold" aria-label="Volver a Cuenta">
            <span className="flex h-12 w-10 items-center justify-center"><ArrowLeft className="h-6 w-6" aria-hidden="true" /></span>
            Volver
          </button>
          <button type="button" onClick={() => navigate(`${createPageUrl('EditProduct')}?new=1`)} className="flex min-h-12 items-center gap-2 rounded-xl bg-[#004AFE] px-4 text-[16px] font-semibold text-white active:scale-[0.98]">
            <Plus className="h-5 w-5" aria-hidden="true" /> Nuevo
          </button>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0F172A]">Productos y enlaces</h1>
        <p className="mt-1 text-[16px] text-[#64748B]">Guarda una vez tu enlace y úsalo en todos tus mensajes.</p>
        <label className="relative mt-4 block">
          <span className="sr-only">Buscar producto</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
          <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar producto" className="h-14 rounded-2xl bg-[#F8FAFC] pl-12 text-[17px]" />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2" aria-label="Categoría de producto">
          {CATEGORIES.map(item => (
            <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={`min-h-12 rounded-xl px-3 text-[15px] font-semibold ${category === item ? 'bg-[#EAF0FF] text-[#004AFE]' : 'bg-[#F1F5F9] text-[#475569]'}`}>
              {item}
            </button>
          ))}
        </div>
      </header>

      <section className="px-5 py-5">
        {productsQuery.isPending && <StateView state="loading" title="Cargando productos" />}
        {productsQuery.isError && <StateView state="error" title="No pudimos cargar tus productos" description="Tus enlaces siguen guardados. Revisa tu conexión e intenta de nuevo." actionLabel="Intentar de nuevo" onAction={() => productsQuery.refetch()} />}
        {!productsQuery.isPending && !productsQuery.isError && groups.length === 0 && <StateView state="empty" title="No encontramos productos" description="Prueba otra búsqueda o crea un producto nuevo." actionLabel="Crear producto" onAction={() => navigate(`${createPageUrl('EditProduct')}?new=1`)} />}

        <div className="space-y-7">
          {groups.map(([subcategory, products]) => (
            <section key={subcategory}>
              <h2 className="mb-3 text-[15px] font-bold tracking-wide text-[#475569]">{subcategory}</h2>
              <div className="space-y-3">
                {products.map(product => (
                  <article key={product.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm">
                    <div className="flex gap-3">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#F1F5F9]">
                        {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-contain" loading="lazy" /> : <span className="text-2xl font-bold text-[#004AFE]">{product.name?.charAt(0)}</span>}
                      </div>
                      <button type="button" onClick={() => navigate(`${createPageUrl('EditProduct')}?id=${encodeURIComponent(product.id)}`)} className="min-h-20 min-w-0 flex-1 rounded-xl text-left focus-visible:ring-2 focus-visible:ring-[#004AFE]" aria-label={`Editar ${product.name}`}>
                        <span className="block text-[17px] font-bold leading-6 text-[#0F172A]">{product.name}</span>
                        <span className="mt-1 block text-[15px] leading-5 text-[#64748B]">{cycleLabel(product)}</span>
                        <span className={`mt-1 block text-[15px] font-semibold ${product.link_url ? 'text-[#15805D]' : 'text-[#B45309]'}`}>{product.link_url ? 'Enlace listo' : 'Falta agregar enlace'}</span>
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => copyLink(product)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F1F5F9] px-3 text-[15px] font-semibold text-[#334155]">
                        {copiedId === product.id ? <Check className="h-5 w-5 text-[#15805D]" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
                        {product.link_url ? 'Copiar enlace' : 'Agregar enlace'}
                      </button>
                      <button type="button" onClick={() => navigate(`${createPageUrl('EditProduct')}?id=${encodeURIComponent(product.id)}`)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#D7E1F0] bg-white px-3 text-[15px] font-semibold text-[#004AFE]">
                        <Pencil className="h-5 w-5" aria-hidden="true" /> Editar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
