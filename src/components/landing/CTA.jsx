import { Zap } from 'lucide-react';
import DownloadChoices from '@/components/DownloadChoices';

export default function CTA() {
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

        <a
          href="/crear-cuenta"
          className="inline-flex items-center justify-center gap-2 bg-[#004AFE] hover:bg-[#0039CC] text-white font-semibold px-10 py-4 rounded-full text-base transition-colors hover:shadow-[0_0_32px_rgba(0,74,254,0.45)]"
        >
          Crear mi cuenta — 17 USD/mes
        </a>

        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-white/70">
          <span>✓ Precio final</span>
          <span className="w-px h-4 bg-white/10"></span>
          <span>✓ Cancela cuando quieras</span>
          <span className="w-px h-4 bg-white/10"></span>
          <span>✓ Gestiona el pago desde tu cuenta web</span>
        </div>

        <div className="mt-10 rounded-3xl border border-white/10 bg-white p-5 text-left shadow-2xl">
          <p className="mb-4 text-center text-[15px] font-semibold text-slate-600">
            ¿Ya tienes cuenta? Descarga la app oficial.
          </p>
          <DownloadChoices className="landing-downloads" showQr={false} />
        </div>
      </div>
    </section>
  );
}
