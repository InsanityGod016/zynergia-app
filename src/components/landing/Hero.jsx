import { CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

const FLOAT_CARDS = [
  {
    icon: CheckCircle2,
    iconColor: 'text-green-400',
    label: 'Seguimiento hoy',
    value: '3 mensajes',
    position: 'top-8 -left-32',
    delay: 0.6,
  },
  {
    icon: RefreshCw,
    iconColor: 'text-amber-400',
    label: 'Recompra en',
    value: '3 días',
    position: '-right-32 top-1/2 -translate-y-1/2',
    delay: 0.8,
  },
  {
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    label: 'Partner en riesgo',
    value: 'Acción urgente',
    position: 'bottom-16 -left-32',
    delay: 1.0,
  },
];

export default function Hero() {
  return (
    <section className="bg-[#0A0F1E] min-h-screen flex items-center pt-16 overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 py-20 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-16">

          {/* ── Left: copy ─────────────────────────────── */}
          <div className="flex-1 text-center lg:text-left">

            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-[#004AFE]/10 border border-[#004AFE]/20 text-[#004AFE] text-xs font-semibold px-4 py-1.5 rounded-full mb-6"
            >
              <span className="w-1.5 h-1.5 bg-[#004AFE] rounded-full animate-pulse"></span>
              App para distribuidores de red
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6"
            >
              Crece tu red sin perder{' '}
              <span className="text-[#004AFE]">ningún seguimiento</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-white/60 leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0"
            >
              Zynergia genera automáticamente tus tareas de WhatsApp según el tipo de
              contacto, las ventas y el avance de tus partners.{' '}
              <span className="text-white/80">
                Para que siempre hables con la persona correcta en el momento correcto.
              </span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col gap-3 justify-center lg:justify-start"
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="#"
                  className="bg-[#004AFE] hover:bg-[#0039CC] text-white font-semibold px-7 py-4 rounded-full flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-[0_0_32px_rgba(0,74,254,0.45)] text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  Descargar en App Store
                </a>
                <a
                  href="#"
                  className="border border-white/20 hover:border-white/40 hover:bg-white/5 text-white/80 hover:text-white font-semibold px-7 py-4 rounded-full flex items-center justify-center gap-2 transition-all duration-200 text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3.18 23.76c.3.16.65.17.96.02l13.2-7.4-2.83-2.83-11.33 10.21zM.5 1.1C.19 1.42 0 1.9 0 2.53v18.94c0 .63.19 1.11.5 1.43l.08.07 10.61-10.61v-.25L.58 1.03.5 1.1zM20.49 10.51l-2.87-1.6-3.17 3.17 3.17 3.17 2.9-1.63c.83-.46.83-1.22-.03-1.71zM3.18.24l13.2 7.4-2.83 2.83L2.74.26c.13-.08.29-.1.44-.02z"/></svg>
                  Descargar en Google Play
                </a>
              </div>
              <p className="text-white/30 text-xs text-center lg:text-left mt-1">
                Disponible en App Store y Google Play
              </p>
            </motion.div>
          </div>

          {/* ── Right: phone + glow + floating cards ─────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex-shrink-0 relative hidden lg:block"
          >
            {/* Radial glow azul + morado */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-0">
              <div className="w-80 h-80 bg-[#004AFE] opacity-25 blur-[90px] rounded-full absolute"></div>
              <div className="w-60 h-60 bg-[#7C3AED] opacity-20 blur-[70px] rounded-full absolute translate-x-10 translate-y-10"></div>
            </div>

            {/* Phone frame */}
            <div className="relative z-10 w-64 h-[520px] bg-[#1A1F2E] rounded-[40px] border border-white/10 p-3 shadow-2xl">
              <div className="w-24 h-6 bg-[#0A0F1E] rounded-full mx-auto mb-3"></div>

              <div className="w-full h-full bg-[#F8FAFC] rounded-[28px] overflow-hidden flex flex-col">
                <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
                  <div className="text-[10px] text-gray-400 mb-1">Lunes 9 Mar</div>
                  <div className="text-sm font-bold text-[#0F172A]">Tareas de hoy</div>
                </div>
                <div className="flex items-center justify-center py-4">
                  <div className="w-16 h-16 rounded-full border-4 border-[#004AFE] border-r-gray-100 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-[#004AFE]">3/8</span>
                  </div>
                </div>
                <div className="px-3 space-y-2 flex-1">
                  {[
                    { name: 'Ana García', tag: 'Invitación', color: 'bg-[#004AFE]' },
                    { name: 'Luis Ramírez', tag: 'Follow up', color: 'bg-amber-400' },
                    { name: 'María López', tag: 'Recompra', color: 'bg-green-500' },
                  ].map((task) => (
                    <div key={task.name} className="bg-white rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm border border-gray-50">
                      <div className="w-7 h-7 bg-gray-100 rounded-full flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-semibold text-[#0F172A] truncate">{task.name}</div>
                        <div className={`inline-block text-[8px] font-medium text-white px-1.5 py-0.5 rounded-full mt-0.5 ${task.color}`}>
                          {task.tag}
                        </div>
                      </div>
                      <div className="w-5 h-5 rounded-full border border-gray-200 flex-shrink-0"></div>
                    </div>
                  ))}
                </div>
                <div className="bg-white border-t border-gray-100 h-10 flex items-center justify-around px-4 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`w-5 h-5 rounded ${i === 1 ? 'bg-[#004AFE]' : 'bg-gray-200'}`}></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating glassmorphism cards */}
            {FLOAT_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, scale: 0.75 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, delay: card.delay, type: 'spring', stiffness: 200 }}
                  className={`absolute ${card.position} z-20 w-36 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2.5 shadow-xl`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-3.5 h-3.5 ${card.iconColor}`} />
                    <span className="text-[10px] text-white/50 font-medium">{card.label}</span>
                  </div>
                  <p className="text-xs font-bold text-white">{card.value}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
