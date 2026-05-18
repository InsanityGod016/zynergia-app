import { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';

async function startCheckout(setLoading) {
  setLoading(true);
  try {
    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'monthly' }),
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

        <div className="w-16 h-16 bg-[#004AFE]/10 border border-[#004AFE]/20 rounded-2xl flex items-center justify-center mx-auto mb-7">
          <Zap className="w-7 h-7 text-[#004AFE]" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-5">
          Empieza hoy y organiza tu negocio{' '}
          <span className="text-[#004AFE]">desde el primer día</span>
        </h2>

        <p className="text-white/60 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          Deja de gestionar tu red en notas y grupos de WhatsApp. Zynergia lo hace
          automáticamente para que tú te enfoques en crecer.
        </p>

        <button
          onClick={() => startCheckout(setLoading)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 bg-[#004AFE] hover:bg-[#0039CC] text-white font-semibold px-10 py-4 rounded-full text-base transition-colors hover:shadow-[0_0_32px_rgba(0,74,254,0.45)] disabled:opacity-70"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          Empezar ahora — $17/mes
        </button>

        <div className="mt-8 flex items-center justify-center gap-6 text-white/40 text-xs">
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
