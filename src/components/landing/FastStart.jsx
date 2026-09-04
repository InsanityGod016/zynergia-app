import { Trophy, Users, Star, Zap } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const PHASES = [
  {
    phase: 'Primeros contactos',
    icon: Users,
    color: 'text-[#004AFE]',
    bg: 'bg-[#004AFE]',
    lightBg: 'bg-[#004AFE]/5',
    border: 'border-[#004AFE]/20',
    goal: 'Ve a quién necesita contactar y cuál es la siguiente acción.',
  },
  {
    phase: 'Primeras ventas',
    icon: Star,
    color: 'text-purple-600',
    bg: 'bg-purple-500',
    lightBg: 'bg-purple-50',
    border: 'border-purple-200',
    goal: 'Mantén visibles las tareas y el avance de cada integrante.',
  },
  {
    phase: 'Duplicación',
    icon: Trophy,
    color: 'text-amber-600',
    bg: 'bg-amber-500',
    lightBg: 'bg-amber-50',
    border: 'border-amber-200',
    goal: 'Detecta pronto quién necesita apoyo para continuar.',
  },
  {
    phase: 'Seguimiento constante',
    icon: Zap,
    color: 'text-green-600',
    bg: 'bg-green-500',
    lightBg: 'bg-green-50',
    border: 'border-green-200',
    goal: 'Consulta el progreso sin depender de notas o memoria.',
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
            Seguimiento de equipo
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] leading-tight mb-4">
            Acompaña a cada partner sin perder de vista lo importante
          </h2>
          <p className="text-[#64748B] max-w-xl mx-auto">
            Zynergia reúne el avance y las tareas de apoyo en una vista sencilla.
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

                  {/* Stage chip */}
                  <span className={`text-xs font-semibold ${phase.color} ${phase.lightBg} border ${phase.border} px-3 py-1 rounded-full mb-3`}>
                    Etapa {index + 1}
                  </span>

                  {/* Phase name */}
                  <h3 className="text-base font-bold text-[#0F172A] mb-2">{phase.phase}</h3>

                  {/* Goal */}
                  <p className="text-[#64748B] text-sm leading-relaxed">{phase.goal}</p>
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
            Los requisitos, plazos e importes de cualquier programa externo pueden cambiar.{' '}
            <span className="font-semibold text-[#0F172A]">
              Confírmalos siempre en la documentación oficial vigente
            </span>{' '}
            de tu empresa.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
