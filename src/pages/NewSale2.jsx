import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { db } from '@/api/db';
import { createPageUrl } from '@/utils';
import StateView from '@/components/ui/StateView';
import { clearSaleDraft, normalizeSaleItems, readSaleDraft, saleDraftUrl, saleUnitCount, updateSaleDraft } from '@/lib/saleDraft';

const CATEGORIES = ['Premier Kits', 'Compra Única'];

export default function NewSale2() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const stored = useMemo(() => readSaleDraft(), []);
  const contactId = query.get('contactId') || location.state?.contactId || stored.contactId;
  const [selectedCategory, setSelectedCategory] = useState('Premier Kits');
  const [items, setItems] = useState(() => normalizeSaleItems(stored.items, stored.productId));
  const originalItems = useMemo(
    () => JSON.stringify(normalizeSaleItems(stored.items, stored.productId)),
    [stored.items, stored.productId],
  );

  const { data: products = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.Product.list(),
  });

  useEffect(() => {
    if (!contactId) return;
    const cartChanged = JSON.stringify(items) !== originalItems;
    updateSaleDraft(cartChanged
      ? { contactId, items, purchaseDate: null, saleType: null }
      : { contactId, items });
  }, [contactId, items, originalItems]);

  const groups = useMemo(() => {
    const categoryProducts = products.filter(product => product.category === selectedCategory);
    return Object.entries(categoryProducts.reduce((result, product) => {
      const label = product.subcategory || 'Otros';
      result[label] = [...(result[label] || []), product];
      return result;
    }, {}));
  }, [products, selectedCategory]);

  const goNext = () => {
    const validItems = items.filter(item => products.some(product => product.id === item.productId));
    if (!validItems.length) return;
    const changed = JSON.stringify(validItems) !== originalItems;
    const draft = updateSaleDraft(changed
      ? { contactId, items: validItems, purchaseDate: null, saleType: null }
      : { contactId, items: validItems });
    navigate(saleDraftUrl('NewSale3', draft));
  };

  const changeQuantity = (productId, difference) => {
    setItems(current => {
      const quantities = new Map(current.map(item => [item.productId, item.quantity]));
      const next = Math.max(0, Math.min(999, (quantities.get(productId) || 0) + difference));
      if (next) quantities.set(productId, next);
      else quantities.delete(productId);
      return [...quantities].map(([id, quantity]) => ({ productId: id, quantity }));
    });
  };

  const cancel = () => {
    if (!window.confirm('¿Cancelar y borrar esta venta sin terminar?')) return;
    clearSaleDraft();
    navigate(createPageUrl('Sales'));
  };

  if (!contactId) {
    return (
      <main className="min-h-dvh bg-white px-6 pt-[calc(3rem+env(safe-area-inset-top))]">
        <StateView state="error" title="Falta elegir el contacto" description="Tu venta no se perdió. Vuelve al primer paso para elegirlo." actionLabel="Elegir contacto" onAction={() => navigate(createPageUrl('NewSale1'), { replace: true })} />
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#F7F9FC] pb-28">
      <header className="border-b border-slate-100 bg-white px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
        <button type="button" onClick={() => navigate(saleDraftUrl('NewSale1'))} className="-ml-2 flex min-h-12 items-center gap-2 rounded-2xl px-2 text-[16px] font-bold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <ArrowLeft className="h-6 w-6" aria-hidden="true" />
          Atrás
        </button>
        <p className="min-w-0 flex-1 text-right text-[15px] font-bold text-slate-500">Paso 2 de 4</p>
        <button type="button" onClick={cancel} className="min-h-12 rounded-2xl px-2 text-[15px] font-bold text-muted-foreground">Cancelar</button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]"><div className="h-full w-2/4 rounded-full bg-[#004AFE]" /></div>
        <h1 className="mt-4 text-2xl font-bold text-[#0F172A]">¿Qué productos compró?</h1>
        <p className="mt-1 text-[16px] text-[#64748B]">Agrega todos los productos y sus cantidades.</p>
      </header>

      <div className="border-b border-slate-100 px-5 py-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1" role="group" aria-label="Tipo de producto">
          {CATEGORIES.map(category => (
            <button key={category} type="button" onClick={() => setSelectedCategory(category)} aria-pressed={selectedCategory === category} className={`min-h-12 rounded-xl px-3 text-[15px] font-bold transition-colors ${selectedCategory === category ? 'bg-white text-primary shadow-sm' : 'text-slate-600'}`}>
              {category === 'Premier Kits' ? 'Kit inicial' : 'Producto'}
            </button>
          ))}
        </div>
      </div>

      <section className="space-y-8 px-5 py-6">
        {isLoading && <StateView state="loading" title="Cargando productos…" />}
        {isError && <StateView state="error" title="No pudimos cargar los productos" actionLabel="Intentar de nuevo" onAction={refetch} />}
        {!isLoading && !isError && groups.map(([subcategory, categoryItems]) => (
          <div key={subcategory}>
            <h2 className="mb-3 text-[15px] font-bold text-slate-600">{subcategory}</h2>
            <div className="grid grid-cols-2 gap-3">
              {categoryItems.map(product => {
                const quantity = items.find(item => item.productId === product.id)?.quantity || 0;
                return (
                <article key={product.id} className={`relative overflow-hidden rounded-2xl border-2 bg-white ${quantity ? 'border-primary bg-blue-50' : 'border-slate-200'}`}>
                  <button type="button" onClick={() => changeQuantity(product.id, 1)} className="block w-full text-left transition-transform duration-150 active:scale-[0.98]" aria-label={`Agregar ${product.name}`}>
                  <span className="flex h-24 items-center justify-center bg-[#F8FAFC]">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-contain" loading="lazy" /> : <span className="text-2xl font-bold text-[#004AFE]">{product.name?.charAt(0)}</span>}</span>
                  <span className="block p-3"><strong className="block text-[16px] leading-snug text-slate-950">{product.name}</strong><span className="mt-1 block text-[15px] text-slate-600">{product.repurchase_enabled === false || Number(product.cycle_days) === 0 ? 'Sin recordatorios' : `Cada ${Number(product.cycle_days) || Number(product.frequency_months || 1) * 30} días`}</span></span>
                  </button>
                  {quantity > 0 && <div className="flex items-center justify-between border-t border-blue-200 bg-white p-2" aria-label={`Cantidad de ${product.name}`}>
                    <button type="button" onClick={() => changeQuantity(product.id, -1)} className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100" aria-label={`Quitar un ${product.name}`}><Minus className="h-5 w-5" /></button>
                    <strong className="text-[18px]" aria-live="polite">{quantity}</strong>
                    <button type="button" onClick={() => changeQuantity(product.id, 1)} className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white" aria-label={`Agregar otro ${product.name}`}><Plus className="h-5 w-5" /></button>
                  </div>}
                </article>
              )})}
            </div>
          </div>
        ))}
        {!isLoading && !isError && groups.length === 0 && <StateView title="No hay productos en esta categoría" description="Puedes volver o elegir la otra categoría." />}
      </section>
      <footer className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
        <button type="button" onClick={goNext} disabled={!saleUnitCount(items)} className="min-h-14 w-full rounded-2xl bg-primary px-5 text-[17px] font-bold text-white disabled:opacity-50">
          {saleUnitCount(items) ? `Continuar · ${saleUnitCount(items)} producto${saleUnitCount(items) === 1 ? '' : 's'}` : 'Agrega un producto'}
        </button>
      </footer>
    </main>
  );
}
