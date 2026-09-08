import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { db } from '@/api/db';
import StateView from '@/components/ui/StateView';
import { clearSaleDraft, isValidSaleDate, normalizeSaleItems, readSaleDraft, saleDraftUrl, saleUnitCount, updateSaleDraft } from '@/lib/saleDraft';
import { supabase } from '@/lib/supabaseClient';
import { createPageUrl } from '@/utils';

export default function NewSale4() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const query = new URLSearchParams(location.search);
  const stored = readSaleDraft();
  const contactId = query.get('contactId') || location.state?.contactId || stored.contactId;
  const items = normalizeSaleItems(stored.items, query.get('productId') || location.state?.productId || stored.productId);
  const purchaseDate = query.get('purchaseDate') || location.state?.purchaseDate || stored.purchaseDate;
  const today = format(new Date(), 'yyyy-MM-dd');
  const [operationId] = useState(() => stored.operationId || updateSaleDraft({ contactId, items, purchaseDate }).operationId);
  const selectedType = stored.saleType || null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submissionLock = useRef(false);

  const contactsQuery = useQuery({ queryKey: ['contacts'], queryFn: () => db.Contact.list() });
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => db.Product.list() });
  const operationQuery = useQuery({ queryKey: ['sale-order-operation', operationId], queryFn: () => db.SaleOrder.filter({ operation_id: operationId }), enabled: Boolean(operationId) });
  const contacts = contactsQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const contact = contacts.find(item => item.id === contactId);
  const selectedProducts = items.map(item => ({ ...item, product: products.find(product => product.id === item.productId) }));
  const hasAllProducts = selectedProducts.length > 0 && selectedProducts.every(item => item.product);
  const alreadySaved = Boolean(operationQuery.data?.length);

  if (!contactId || !items.length || !purchaseDate || !selectedType) {
    return (
      <main className="min-h-dvh bg-white px-6 pt-[calc(3rem+env(safe-area-inset-top))]">
        <StateView state="error" title="Falta información de la venta" description="Tu borrador sigue guardado. Vuelve para elegir la fecha y el tipo de venta." actionLabel="Completar venta" onAction={() => navigate(saleDraftUrl('NewSale3'), { replace: true })} />
      </main>
    );
  }

  if (!isValidSaleDate(purchaseDate, today)) {
    return <main className="min-h-dvh bg-white px-6 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="error" title="La fecha no es válida" description="Tu borrador sigue guardado. Vuelve y elige una fecha que no sea futura." actionLabel="Elegir fecha" onAction={() => navigate(saleDraftUrl('NewSale3'), { replace: true })} /></main>;
  }

  const cancel = () => {
    if (alreadySaved || operationQuery.isError) {
      navigate(createPageUrl('Sales'));
      return;
    }
    if (!window.confirm('¿Cancelar y borrar esta venta sin terminar?')) return;
    clearSaleDraft();
    navigate(createPageUrl('Sales'));
  };

  const submit = async () => {
    if (!selectedType || !isValidSaleDate(purchaseDate, today) || submissionLock.current) return;
    submissionLock.current = true;
    setIsSubmitting(true);
    setError('');
    try {
      if (alreadySaved) {
        clearSaleDraft();
        navigate(createPageUrl('Sales'), { replace: true });
        return;
      }
      const { error: recordError } = await supabase.rpc('record_sale_order', {
        p_operation_id: operationId,
        p_contact_id: contactId,
        p_items: items.map(item => ({ product_id: item.productId, quantity: item.quantity })),
        p_purchase_date: purchaseDate,
        p_sale_type: selectedType,
      });
      if (recordError) throw recordError;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['partners'] }),
        queryClient.invalidateQueries({ queryKey: ['fast_start_snapshots_v2'] }),
      ]);

      clearSaleDraft();
      navigate(createPageUrl('Sales'), { replace: true });
    } catch (submitError) {
      console.error('[Sale] Submit failed', submitError);
      setError('No pudimos registrar el pedido. Tu borrador sigue guardado. Intenta de nuevo; no se duplicará.');
      setIsSubmitting(false);
      submissionLock.current = false;
    }
  };

  if (contactsQuery.isLoading || productsQuery.isLoading) return <main className="min-h-dvh bg-white px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="loading" title="Preparando el resumen…" /></main>;
  if (contactsQuery.isError || productsQuery.isError) return <main className="min-h-dvh bg-white px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="error" title="No pudimos preparar la venta" description="Tu borrador sigue guardado. Revisa tu conexión e intenta de nuevo." actionLabel="Intentar de nuevo" onAction={() => Promise.all([contactsQuery.refetch(), productsQuery.refetch()])} /></main>;
  if (!contact || !hasAllProducts) return <main className="min-h-dvh bg-white px-5 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="error" title="Ya no encontramos esta información" description="Tu borrador sigue guardado. Vuelve y elige de nuevo el contacto o los productos." actionLabel="Volver al inicio" onAction={() => navigate(createPageUrl('NewSale1'), { replace: true })} /></main>;

  return (
    <main className="flex min-h-dvh flex-col bg-[#F7F9FC]">
      <header className="border-b border-slate-100 bg-white px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(saleDraftUrl('NewSale3'))} className="-ml-2 flex min-h-12 items-center gap-2 rounded-2xl px-2 text-[16px] font-bold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <ArrowLeft className="h-6 w-6" aria-hidden="true" /> Atrás
          </button>
          <p className="min-w-0 flex-1 text-right text-[15px] font-bold text-slate-500">Paso 4 de 4</p>
          <button type="button" onClick={cancel} disabled={isSubmitting || operationQuery.isPending} className="min-h-12 rounded-2xl px-2 text-[15px] font-bold text-muted-foreground disabled:opacity-50">{alreadySaved || operationQuery.isError ? 'Salir' : 'Cancelar'}</button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]"><div className="h-full w-full rounded-full bg-[#004AFE]" /></div>
        <h1 className="mt-4 text-2xl font-bold text-[#0F172A]">Revisa antes de guardar</h1>
        <p className="mt-1 text-[16px] text-[#64748B]">Confirma que todo esté correcto.</p>
      </header>

      <section className="flex-1 space-y-6 px-5 pb-32 pt-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-[17px] font-bold">Resumen</h2>
          <dl className="mt-4 space-y-4 text-[16px]">
            <div><dt className="text-slate-500">Contacto</dt><dd className="font-bold text-slate-950">{contact?.full_name || 'Contacto seleccionado'}</dd></div>
            <div><dt className="text-slate-500">Productos ({saleUnitCount(items)})</dt><dd className="mt-1 space-y-1 font-bold text-slate-950">{selectedProducts.map(item => <span key={item.productId} className="block">{item.quantity} × {item.product.name}</span>)}</dd></div>
            <div><dt className="text-slate-500">Fecha</dt><dd className="font-bold text-slate-950">{format(new Date(`${purchaseDate}T12:00:00`), "d 'de' MMMM, yyyy", { locale: es })}</dd></div>
            <div><dt className="text-slate-500">Tipo</dt><dd className="font-bold text-slate-950">{selectedType === 'recompra' ? 'Recompra' : selectedType === 'nueva' ? 'Nueva venta' : 'Falta elegir'}</dd></div>
          </dl>
        </div>

        {error && <p className="rounded-2xl bg-red-50 p-4 text-[15px] font-semibold text-red-700" role="alert">{error}</p>}
      </section>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
        <button type="button" onClick={submit} disabled={!selectedType || isSubmitting || !contact || !hasAllProducts} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-[17px] font-bold text-white outline-none transition-transform duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50">
          {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
          {isSubmitting ? 'Registrando…' : alreadySaved ? 'Ver ventas' : 'Registrar pedido'}
        </button>
      </footer>
    </main>
  );
}
