import { Trophy, Users, Star, Zap } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const PHASES = [
  {
    phase: 'Q-Team',
    days: 'Días 1–30',
    icon: Users,
    color: 'text-[#004AFE]',
    bg: 'bg-[#004AFE]',
    lightBg: 'bg-[#004AFE]/5',
    border: 'border-[#004AFE]/20',
    goal: '4 clientes activos con pedido automático',
    reward: 'Bono Q-Team',
    bonus: '€100',
  },
  {
    phase: 'Fast Start N1',
    days: 'Días 35–60',
    icon: Star,
    color: 'text-purple-600',
    bg: 'bg-purple-500',
    lightBg: 'bg-purple-50',
    border: 'border-purple-200',
    goal: '2 partners activos reclutados en tu equipo',
    reward: 'Bono Nivel 1',
    bonus: '€400',
  },
  {
    phase: 'Fast Start N2',
    days: 'Días 75–90',
    icon: Trophy,
    color: 'text-amber-600',
    bg: 'bg-amber-500',
    lightBg: 'bg-amber-50',
    border: 'border-amber-200',
    goal: 'Tus 2 partners con 4 clientes activos cada uno',
    reward: 'Bono Nivel 2',
    bonus: '€1,200',
  },
  {
    phase: 'X-Team',
    days: 'Días 110–120',
    icon: Zap,
    color: 'text-green-600',
    bg: 'bg-green-500',
    lightBg: 'bg-green-50',
    border: 'border-green-200',
    goal: '10+ clientes activos en total en la red',
    reward: 'Bono X-Team',
    bonus: '€150',
  },
];

export default function FastStart() {
  const lineRef = useRef(null);
  const lineInView = useInView(lineRef, { once: false, margin: '-100px' });

  return (
    <section id="fast-start" className="bg-white py-20 px-5">
      <div className="max-w-6xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-[#004AFE] text-sm font-semibold uppercase tracking-widest mb-3">
            Programa Fast Start
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] leading-tight mb-4">
            120 días para alcanzar los 4 bonos
          </h2>
          <p className="text-[#64748B] max-w-xl mx-auto">
            Zynergia rastrea en qué fase está cada partner de tu red y genera las tareas
            de apoyo correctas en cada etapa.
          </p>
        </motion.div>

        <div className="relative" ref={lineRef}>
          {/* Animated connecting bar (desktop) */}
          <div className="hidden lg:block absolute top-10 left-12 right-12 h-1 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ scaleX: 0, originX: 0 }}
              animate={lineInView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.2 }}
              className="h-full bg-gradient-to-r from-[#004AFE] via-purple-500 via-amber-500 to-green-500 origin-left"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PHASES.map((phase, index) => {
              const Icon = phase.icon;
              return (
                <motion.div
                  key={phase.phase}
                  initial={{ opacity: 0, y: 32, scale: 0.92 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: false, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: index * 0.12, type: 'spring', stiffness: 180 }}
                  className="flex flex-col items-center text-center relative"
                >
                  {/* Mobile connector */}
                  {index < PHASES.length - 1 && (
                    <div className="lg:hidden absolute left-1/2 -bottom-4 w-px h-4 bg-gray-200" />
                  )}

                  {/* Phase icon */}
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: -4 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className={`relative z-10 w-20 h-20 ${phase.bg} rounded-2xl flex items-center justify-center mb-5 shadow-md cursor-default`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-[#0F172A] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                  </motion.div>

                  {/* Day range chip */}
                  <span className={`text-xs font-semibold ${phase.color} ${phase.lightBg} border ${phase.border} px-3 py-1 rounded-full mb-3`}>
                    {phase.days}
                  </span>

                  {/* Phase name */}
                  <h3 className="text-base font-bold text-[#0F172A] mb-2">{phase.phase}</h3>

                  {/* Goal */}
                  <p className="text-[#64748B] text-sm leading-relaxed mb-3">{phase.goal}</p>

                  {/* Bonus reward */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.4, delay: index * 0.12 + 0.35, type: 'spring', stiffness: 220 }}
                    className={`${phase.lightBg} border ${phase.border} rounded-xl px-3 py-2.5 w-full`}
                  >
                    <p className={`text-[10px] font-semibold ${phase.color} uppercase tracking-wide`}>
                      {phase.reward}
                    </p>
                    <p className={`text-base font-bold ${phase.color} mt-0.5`}>{phase.bonus}</p>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-14 bg-[#F8FAFC] rounded-2xl border border-gray-100 p-6 text-center"
        >
          <p className="text-[#64748B] text-sm">
            Si un partner cae por debajo del Q-Team,{' '}
            <span className="font-semibold text-[#0F172A]">
              Zynergia genera automáticamente una alerta de urgencia
            </span>{' '}
            para que actúes antes de perder el bono.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
