import { UserPlus, Tag, ListChecks, MessageSquare } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const STEPS = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Agrega un contacto',
    description: 'Crea el contacto con su nombre y teléfono de WhatsApp. Solo tarda 10 segundos.',
    detail: 'Juan Pérez · +52 55 1234 5678',
  },
  {
    number: '02',
    icon: Tag,
    title: 'Selecciona el tipo',
    description: 'Define si es un Prospecto Producto, Prospecto Partner, Cliente o Partner.',
    detail: 'Tipo: Prospecto Producto →',
  },
  {
    number: '03',
    icon: ListChecks,
    title: 'Zynergia genera las tareas',
    description: 'Automáticamente crea la secuencia de 6 mensajes con fechas perfectas.',
    detail: '6 tareas creadas en 0.5 segundos',
  },
  {
    number: '04',
    icon: MessageSquare,
    title: 'Envías por WhatsApp',
    description: 'Elige el tono del mensaje (general, amigable o directo) y WhatsApp se abre listo.',
    detail: '"Hola Juan, ¿cómo has estado?..."',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const stepVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function DemoFlow() {
  const lineRef = useRef(null);
  const lineInView = useInView(lineRef, { once: true, margin: '-100px' });

  return (
    <section id="como-funciona" className="bg-white py-20 px-5">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-[#004AFE] text-sm font-semibold uppercase tracking-widest mb-3">
            Cómo funciona
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] leading-tight mb-4">
            De contacto a mensaje en 4 pasos
          </h2>
          <p className="text-[#64748B] max-w-xl mx-auto">
            El flujo completo tarda menos de un minuto la primera vez. Después, Zynergia lo hace solo.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative" ref={lineRef}>
          {/* Animated connecting line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-16 right-16 h-px bg-gray-100">
            <motion.div
              initial={{ scaleX: 0, originX: 0 }}
              animate={lineInView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 0.9, ease: 'easeInOut', delay: 0.2 }}
              className="h-full bg-[#004AFE]/30 origin-left"
            />
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 lg:grid-cols-4 gap-8"
          >
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  variants={stepVariants}
                  className="relative flex flex-col items-center lg:items-start text-center lg:text-left"
                >
                  {/* Mobile connector */}
                  {index < STEPS.length - 1 && (
                    <div className="lg:hidden absolute left-1/2 top-20 w-px h-8 bg-gray-200 -translate-x-1/2"></div>
                  )}

                  {/* Icon circle */}
                  <motion.div
                    whileHover={{ scale: 1.08, boxShadow: '0 0 0 6px rgba(0,74,254,0.08)' }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="relative z-10 w-20 h-20 bg-white border-2 border-[#004AFE]/20 rounded-2xl flex items-center justify-center mb-5 shadow-sm cursor-default"
                  >
                    <Icon className="w-8 h-8 text-[#004AFE]" />
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-[#004AFE] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {step.number.replace('0', '')}
                    </span>
                  </motion.div>

                  <h3 className="text-base font-bold text-[#0F172A] mb-2">{step.title}</h3>
                  <p className="text-[#64748B] text-sm leading-relaxed mb-3">{step.description}</p>

                  {/* Detail chip */}
                  <div className="bg-[#F8FAFC] border border-gray-100 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-[#64748B] font-medium">{step.detail}</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
