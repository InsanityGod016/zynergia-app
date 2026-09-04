import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import StateView from '@/components/ui/StateView';
import { clearSaleDraft, readSaleDraft, saleDraftUrl, updateSaleDraft } from '@/lib/saleDraft';
import { createPageUrl } from '@/utils';

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && format(date, 'yyyy-MM-dd') === value;
}

export default function NewSale3() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const stored = readSaleDraft();
  const contactId = query.get('contactId') || location.state?.contactId || stored.contactId;
  const productId = query.get('productId') || location.state?.productId || stored.productId;
  const today = format(new Date(), 'yyyy-MM-dd');
  const draftDate = query.get('purchaseDate') || stored.purchaseDate;
  const [purchaseDate, setPurchaseDate] = useState(validDate(draftDate) && draftDate <= today ? draftDate : today);

  useEffect(() => {
    if (contactId && productId && validDate(purchaseDate)) updateSaleDraft({ contactId, productId, purchaseDate });
  }, [contactId, productId, purchaseDate]);

  if (!contactId || !productId) {
    return <main className="min-h-dvh bg-white px-6 pt-[calc(3rem+env(safe-area-inset-top))]"><StateView state="error" title="Falta información de la venta" description="Vuelve a elegir el contacto y el producto." actionLabel="Volver al inicio" onAction={() => navigate(createPageUrl('NewSale1'), { replace: true })} /></main>;
  }

  const cancel = () => {
    if (!window.confirm('¿Cancelar y borrar esta venta sin terminar?')) return;
    clearSaleDraft();
    navigate(createPageUrl('Sales'));
  };

  const goNext = () => {
    if (!validDate(purchaseDate) || purchaseDate > today) return;
    const draft = updateSaleDraft({ contactId, productId, purchaseDate });
    navigate(saleDraftUrl('NewSale4', draft));
  };

  return (
    <main className="flex min-h-dvh flex-col bg-[#F7F9FC]">
      <header className="border-b border-slate-100 bg-white px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(saleDraftUrl('NewSale2'))} className="-ml-2 flex min-h-12 items-center gap-2 rounded-2xl px-2 text-[16px] font-bold text-primary"><ArrowLeft className="h-6 w-6" /> Atrás</button>
          <p className="min-w-0 flex-1 text-right text-[15px] font-bold text-slate-500">Paso 3 de 4</p>
          <button type="button" onClick={cancel} className="min-h-12 rounded-2xl px-2 text-[15px] font-bold text-muted-foreground">Cancelar</button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]"><div className="h-full w-3/4 rounded-full bg-[#004AFE]" /></div>
        <h1 className="mt-4 text-2xl font-bold text-[#0F172A]">¿Cuándo fue la compra?</h1>
        <p className="mt-1 text-[16px] text-[#64748B]">Puedes registrar hoy o una fecha anterior.</p>
      </header>

      <section className="flex-1 px-5 py-7">
        <label htmlFor="purchase-date" className="block text-[17px] font-bold text-[#0F172A]">Fecha de compra</label>
        <div className="relative mt-3">
          <CalendarDays className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[#64748B]" />
          <Input id="purchase-date" type="date" value={purchaseDate} max={today} onChange={event => setPurchaseDate(event.target.value)} className="h-14 rounded-2xl bg-white pl-12 text-[17px]" />
        </div>
        {validDate(purchaseDate) && purchaseDate <= today && <div className="mt-5 rounded-2xl border border-[#D7E1F0] bg-white p-4"><p className="text-[15px] text-[#64748B]">Fecha seleccionada</p><p className="mt-1 text-[18px] font-bold text-[#0F172A]">{format(new Date(`${purchaseDate}T12:00:00`), "d 'de' MMMM 'de' yyyy", { locale: es })}</p></div>}
        {(!validDate(purchaseDate) || purchaseDate > today) && <p className="mt-3 text-[15px] font-semibold text-red-700" role="alert">Elige una fecha válida que no sea futura.</p>}
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
        <button type="button" onClick={goNext} disabled={!validDate(purchaseDate) || purchaseDate > today} className="flex min-h-14 w-full items-center justify-between rounded-2xl bg-primary px-5 text-[17px] font-bold text-white disabled:opacity-50">Revisar venta <ArrowRight className="h-5 w-5" /></button>
      </footer>
    </main>
  );
}
