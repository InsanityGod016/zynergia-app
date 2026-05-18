import { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';

async function startCheckout(plan, setLoading) {
  setLoading(true);
  try {
    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || 'Error al iniciar el pago. Intenta de nuevo.');
    }
  } catch {
    alert('Error de conexión. Por favor intenta de nuevo.');
  } finally {
    setLoading(false);
  }
}

export default function CTA() {
  const [loading, setLoading] = useState(false);

  return (
    <section className="bg-[#0A0F1E] py-24 px-5">
      <div className="max-w-3xl mx-auto text-center">

        {/* Icon */}
        <div className="w-16 h-16 bg-[#004AFE]/10 border border-[#004AFE]/20 rounded-2xl flex items-center justify-center mx-auto mb-7">
          <Zap className="w-7 h-7 text-[#004AFE]" />
        </div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-5">
          Empieza hoy y organiza tu negocio{' '}
          <span className="text-[#004AFE]">desde el primer día</span>
        </h2>

        {/* Subtext */}
        <p className="text-white/60 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          Deja de gestionar tu red en notas y grupos de WhatsApp. Zynergia lo hace
          automáticamente para que tú te enfoques en crecer.
        </p>

        {/* Pricing cards */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
          <button
            onClick={() => startCheckout('monthly', setLoading)}
            disabled={loading}
            className="flex-1 max-w-xs bg-[#004AFE] hover:bg-[#0039CC] text-white font-semibold px-8 py-5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors hover:shadow-[0_0_32px_rgba(0,74,254,0.45)] disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mb-1" /> : null}
            <span className="text-[22px] font-bold">$17</span>
            <span className="text-[13px] text-white/80">por mes</span>
            <span className="text-[12px] text-white/60 mt-1">Ideal para empezar</span>
          </button>

          <button
            onClick={() => startCheckout('annual', setLoading)}
            disabled={loading}
            className="flex-1 max-w-xs border-2 border-[#004AFE]/50 hover:border-[#004AFE] hover:bg-[#004AFE]/10 text-white font-semibold px-8 py-5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-70 relative overflow-hidden"
          >
            <span className="absolute top-3 right-3 text-[10px] font-bold text-white bg-[#004AFE] px-2 py-0.5 rounded-full">
              Ahorra 17%
            </span>
            <span className="text-[22px] font-bold">$170</span>
            <span className="text-[13px] text-white/80">por año</span>
            <span className="text-[12px] text-white/60 mt-1">≈ $14.17/mes</span>
          </button>
        </div>

        {/* Trust */}
        <div className="flex items-center justify-center gap-6 text-white/40 text-xs">
          <span>✓ Sin contrato</span>
          <span className="w-px h-4 bg-white/10"></span>
          <span>✓ Cancela cuando quieras</span>
          <span className="w-px h-4 bg-white/10"></span>
          <span>✓ Pago seguro con Stripe</span>
        </div>
      </div>
    </section>
  );
}
