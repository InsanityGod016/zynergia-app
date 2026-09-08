import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { format, startOfToday, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { db } from '@/api/db';
import DateFilterSheet from '@/components/sales/DateFilterSheet';
import ProductFilterSheet from '@/components/sales/ProductFilterSheet';
import MainHeader from '@/components/ui/MainHeader';
import StateView from '@/components/ui/StateView';
import { clearSaleDraft, hasSaleDraft, readSaleDraft, saleDraftStep, saleDraftUrl, updateSaleDraft } from '@/lib/saleDraft';

const dateLabels = {
  today: 'Hoy', last7: 'Últimos 7 días', thisMonth: 'Este mes', lastMonth: 'Mes pasado', last30: 'Últimos 30 días',
};

function parseLocalDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : new Date(Number.NaN);
}

function dateBounds(range) {
  const today = startOfToday();
  if (range === 'today') return { start: today, end: today };
  if (range === 'thisMonth') return { start: startOfMonth(today), end: endOfMonth(today) };
  if (range === 'lastMonth') {
    const month = subMonths(today, 1);
    return { start: startOfMonth(month), end: endOfMonth(month) };
  }
  return { start: subDays(today, range === 'last30' ? 29 : 6), end: today };
}

function readableDate(value) {
  const date = parseLocalDate(value);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : format(date, "d 'de' MMM", { locale: es });
}

export function groupSaleRows(rows = []) {
  const orders = new Map();
  rows.forEach(sale => {
    const key = sale.order_id || `legacy:${sale.id}`;
    const existing = orders.get(key) || {
      id: key,
      contact_id: sale.contact_id,
      purchase_date: sale.purchase_date,
      sale_type: sale.sale_type,
      items: [],
    };
    existing.items.push(sale);
    orders.set(key, existing);
  });
  return [...orders.values()].map(order => ({
    ...order,
    quantity: order.items.reduce((total, item) => total + (Number(item.quantity) || 1), 0),
    cancelled: order.items.every(item => (
      item.status === 'cancelled' && !item.follow_up_stopped_at
    )),
  }));
}

export default function Sales() {
  const navigate = useNavigate();
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [dateRange, setDateRange] = useState('last7');
  const [showProductSheet, setShowProductSheet] = useState(false);
  const [showDateSheet, setShowDateSheet] = useState(false);
  const [draft, setDraft] = useState(() => readSaleDraft());
  const contactsQuery = useQuery({ queryKey: ['contacts'], queryFn: () => db.Contact.list() });
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => db.Product.list() });
  const salesQuery = useQuery({ queryKey: ['sales'], queryFn: () => db.Sale.list('-purchase_date') });
  const contacts = contactsQuery.data || [];
  const products = productsQuery.data || [];
  const sales = salesQuery.data || [];

  const filteredSales = useMemo(() => {
    const { start, end } = dateBounds(dateRange);
    return sales.filter(sale => {
      const date = parseLocalDate(sale.purchase_date);
      return date >= start && date <= end && (!selectedProducts.length || selectedProducts.includes(sale.product_id));
    });
  }, [dateRange, sales, selectedProducts]);
  const filteredOrders = useMemo(() => groupSaleRows(filteredSales), [filteredSales]);
  const activeOrders = useMemo(() => groupSaleRows(sales).filter(order => !order.cancelled), [sales]);

  const names = useMemo(() => ({
    contacts: new Map(contacts.map(contact => [contact.id, contact.full_name || 'Contacto'])),
    products: new Map(products.map(product => [product.id, product.name || 'Producto'])),
  }), [contacts, products]);

  const beginSale = () => {
    if (hasSaleDraft(draft)) {
      navigate(saleDraftUrl(saleDraftStep(draft), draft));
      return;
    }
    const next = updateSaleDraft({});
    setDraft(next);
    navigate(saleDraftUrl('NewSale1', next));
  };

  const discardDraft = () => {
    if (!window.confirm('¿Descartar la venta que dejaste sin terminar?')) return;
    clearSaleDraft();
    setDraft({});
  };

  return (
    <main className="min-h-dvh px-5 pb-32 pt-8">
      <MainHeader title="Ventas" />

      {hasSaleDraft(draft) && (
        <section className="mb-5 rounded-3xl border border-[#BFD0FF] bg-[#F5F8FF] p-5" aria-labelledby="sale-draft-title">
          <p className="text-[15px] font-bold text-[#004AFE]">VENTA SIN TERMINAR</p>
          <h2 id="sale-draft-title" className="mt-1 text-[19px] font-bold text-[#0F172A]">Continúa donde te quedaste</h2>
          <p className="mt-1 text-[15px] leading-6 text-[#64748B]">Lo que ya elegiste sigue guardado.</p>
          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <button type="button" onClick={beginSale} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#004AFE] px-4 text-[16px] font-bold text-white"><RotateCcw className="h-5 w-5" /> Continuar</button>
            <button type="button" onClick={discardDraft} className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#D7E1F0] bg-white text-red-700" aria-label="Descartar venta sin terminar"><Trash2 className="h-5 w-5" /></button>
          </div>
        </section>
      )}

      <section className="mb-5 grid grid-cols-2 gap-3" aria-label="Resumen de ventas">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm"><p className="text-[15px] text-[#64748B]">Pedidos en periodo</p><p className="mt-1 text-3xl font-bold text-[#0F172A]">{salesQuery.isPending ? '—' : filteredOrders.filter(order => !order.cancelled).length}</p></div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm"><p className="text-[15px] text-[#64748B]">Unidades históricas</p><p className="mt-1 text-3xl font-bold text-[#0F172A]">{salesQuery.isPending ? '—' : activeOrders.reduce((total, order) => total + order.quantity, 0)}</p></div>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setShowProductSheet(true)} className={`flex min-h-12 items-center justify-between rounded-xl px-3 text-[15px] font-semibold ${selectedProducts.length ? 'bg-[#EAF0FF] text-[#004AFE]' : 'bg-[#EEF0F3] text-[#334155]'}`} aria-haspopup="dialog" aria-expanded={showProductSheet}>
          <span className="truncate">{selectedProducts.length ? `${selectedProducts.length} producto${selectedProducts.length === 1 ? '' : 's'}` : 'Todos los productos'}</span><ChevronDown className="h-5 w-5 shrink-0" />
        </button>
        <button type="button" onClick={() => setShowDateSheet(true)} className="flex min-h-12 items-center justify-between rounded-xl bg-[#EEF0F3] px-3 text-[15px] font-semibold text-[#334155]" aria-haspopup="dialog" aria-expanded={showDateSheet}>
          <span>{dateLabels[dateRange]}</span><ChevronDown className="h-5 w-5" />
        </button>
      </div>

      <ProductFilterSheet isOpen={showProductSheet} onClose={() => setShowProductSheet(false)} products={products} selectedProducts={selectedProducts} onApply={setSelectedProducts} />
      <DateFilterSheet isOpen={showDateSheet} onClose={() => setShowDateSheet(false)} selectedDate={dateRange} onSelect={setDateRange} />

      <section aria-labelledby="recent-sales-title">
        <h2 id="recent-sales-title" className="mb-3 text-[19px] font-bold text-[#0F172A]">Ventas recientes</h2>
        {salesQuery.isPending && <StateView state="loading" title="Cargando ventas" />}
        {salesQuery.isError && <StateView state="error" title="No pudimos cargar tus ventas" description="Tus registros siguen guardados. Revisa tu conexión e intenta de nuevo." actionLabel="Intentar de nuevo" onAction={() => salesQuery.refetch()} />}
        {!salesQuery.isPending && !salesQuery.isError && (contactsQuery.isError || productsQuery.isError) && <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-4" role="status"><p className="text-[15px] text-amber-900">No pudimos mostrar algunos nombres. Las ventas siguen guardadas.</p><button type="button" onClick={() => Promise.all([contactsQuery.refetch(), productsQuery.refetch()])} className="mt-2 min-h-12 rounded-xl px-3 text-[15px] font-bold text-[#004AFE]">Intentar de nuevo</button></div>}
        {!salesQuery.isPending && !salesQuery.isError && filteredOrders.length === 0 && <StateView state="empty" title="No hay ventas en este periodo" description="Cambia los filtros o registra una venta nueva." />}
        <div className="space-y-3">
          {!salesQuery.isPending && !salesQuery.isError && filteredOrders.slice(0, 30).map(order => (
            <article key={order.id} className="flex min-h-20 items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-sm">
              <div className="min-w-0 flex-1"><h3 className="truncate text-[17px] font-bold text-[#0F172A]">{names.contacts.get(order.contact_id) || 'Contacto'}</h3><p className="mt-0.5 text-[15px] text-[#64748B]">{order.items.map(item => `${Number(item.quantity) || 1} × ${names.products.get(item.product_id) || 'Producto'}`).join(' · ')}</p></div>
              <div className="shrink-0 text-right"><p className="text-[15px] font-semibold text-[#475569]">{readableDate(order.purchase_date)}</p>{order.cancelled ? <span className="text-[15px] font-semibold text-red-700">Cancelada</span> : <span className="text-[15px] font-semibold text-[#15805D]">{order.sale_type === 'recompra' ? 'Recompra' : 'Nueva'}</span>}</div>
            </article>
          ))}
        </div>
      </section>

      <button type="button" onClick={beginSale} className="fixed bottom-24 right-5 z-30 flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#004AFE] px-5 text-[16px] font-bold text-white shadow-lg active:scale-[0.98]" aria-label={hasSaleDraft(draft) ? 'Continuar venta' : 'Registrar una venta'}>
        {hasSaleDraft(draft) ? <RotateCcw className="h-5 w-5" /> : <Plus className="h-6 w-6" />} {hasSaleDraft(draft) ? 'Continuar venta' : 'Registrar venta'}
      </button>
    </main>
  );
}
