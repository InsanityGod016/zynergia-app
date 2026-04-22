import { CheckCircle2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const FEATURES_LIST = [
  'Contactos y seguimientos ilimitados',
  'Generación automática de tareas',
  'Mensajes WhatsApp en 3 tonos',
  'Registro y análisis de ventas',
  'Panel de partners con Fast Start',
  'Generador de QR personalizado',
  'Recordatorios inteligentes de recompra',
  'App iOS, Android y Web',
];

export default function Pricing() {
  return (
    <section id="precios" className="bg-[#F8FAFC] py-20 px-5">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-[#004AFE] text-sm font-semibold uppercase tracking-widest mb-3">
            Precios
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] leading-tight mb-4">
            Un solo plan. Todo incluido.
          </h2>
          <p className="text-[#64748B]">
            Sin sorpresas. Sin límites de contactos. Cancela cuando quieras.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="flex flex-col md:flex-row gap-6 max-w-2xl mx-auto">

          {/* Monthly */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(0,0,0,0.08)' }}
            className="flex-1 bg-white rounded-2xl border border-gray-200 p-8 shadow-sm"
          >
            <div className="mb-6">
              <h3 className="text-base font-semibold text-[#64748B] mb-1">Mensual</h3>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-[#0F172A]">$17</span>
                <span className="text-[#64748B] mb-1">/mes</span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-1">Facturado mensualmente</p>
            </div>

            <a
              href="#"
              className="block w-full text-center border border-[#004AFE] text-[#004AFE] hover:bg-[#004AFE] hover:text-white font-semibold py-3.5 rounded-full transition-colors text-sm mb-6"
            >
              Empezar ahora
            </a>

            <ul className="space-y-3">
              {FEATURES_LIST.map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#004AFE] flex-shrink-0" />
                  <span className="text-sm text-[#64748B]">{f}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Annual — highlighted */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: '-60px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ y: -6, boxShadow: '0 24px 60px rgba(0,74,254,0.35)' }}
            className="flex-1 bg-[#004AFE] rounded-2xl p-8 shadow-lg relative overflow-hidden"
          >
            {/* Ambient glow layer */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#004AFE] to-[#7C3AED] opacity-60 pointer-events-none" />

            {/* Shimmer highlight */}
            <motion.div
              initial={{ x: '-100%', opacity: 0.4 }}
              animate={{ x: '200%', opacity: 0 }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
            />

            {/* Best value badge */}
            <div className="absolute top-5 right-5 z-10">
              <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                AHORRA 17%
              </span>
            </div>

            <div className="mb-6 relative z-10">
              <h3 className="text-base font-semibold text-white/70 mb-1">Anual</h3>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-white">$170</span>
                <span className="text-white/70 mb-1">/año</span>
              </div>
              <p className="text-xs text-white/50 mt-1">~$14.17/mes · 2 meses gratis</p>
            </div>

            <a
              href="#"
              className="relative z-10 block w-full text-center bg-white text-[#004AFE] hover:bg-white/90 font-semibold py-3.5 rounded-full transition-colors text-sm mb-6 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" fill="currentColor" />
              Empezar ahora
            </a>

            <ul className="space-y-3 relative z-10">
              {FEATURES_LIST.map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
                  <span className="text-sm text-white/80">{f}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Trust note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center text-sm text-[#94A3B8] mt-8"
        >
          Disponible en App Store y Google Play · Cancela cuando quieras
        </motion.p>
      </div>
    </section>
  );
}
