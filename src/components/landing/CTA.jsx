import { ArrowRight, Smartphone } from 'lucide-react';

export default function CTA() {
  return (
    <section className="bg-[#0A0F1E] py-24 px-5">
      <div className="max-w-3xl mx-auto text-center">

        {/* ANIMATION: toda la sección entra con fade-up + glow en fase 2 */}

        {/* Icon */}
        <div className="w-16 h-16 bg-[#004AFE]/10 border border-[#004AFE]/20 rounded-2xl flex items-center justify-center mx-auto mb-7">
          <Smartphone className="w-7 h-7 text-[#004AFE]" />
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

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#"
            className="bg-[#004AFE] hover:bg-[#0039CC] text-white font-semibold px-8 py-4 rounded-full flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            Descargar en App Store
          </a>
          <a
            href="#"
            className="bg-[#004AFE] hover:bg-[#0039CC] text-white font-semibold px-8 py-4 rounded-full flex items-center justify-center gap-2 transition-colors hover:shadow-[0_0_32px_rgba(0,74,254,0.45)]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3.18 23.76c.3.16.65.17.96.02l13.2-7.4-2.83-2.83-11.33 10.21zM.5 1.1C.19 1.42 0 1.9 0 2.53v18.94c0 .63.19 1.11.5 1.43l.08.07 10.61-10.61v-.25L.58 1.03.5 1.1zM20.49 10.51l-2.87-1.6-3.17 3.17 3.17 3.17 2.9-1.63c.83-.46.83-1.22-.03-1.71zM3.18.24l13.2 7.4-2.83 2.83L2.74.26c.13-.08.29-.1.44-.02z"/></svg>
            Descargar en Google Play
          </a>
        </div>

        {/* Badges */}
        <div className="mt-10 flex items-center justify-center gap-6 text-white/40 text-xs">
          <span>🍎 iOS</span>
          <span className="w-px h-4 bg-white/10"></span>
          <span>🤖 Android</span>
        </div>
      </div>
    </section>
  );
}
