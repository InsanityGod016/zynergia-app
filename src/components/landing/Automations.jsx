import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const AUTOMATIONS = [
  {
    trigger: 'Prospecto Producto',
    triggerColor: 'bg-[#004AFE]/10 text-[#004AFE]',
    result: 'Secuencia de 6 mensajes de seguimiento (días 0, 3, 7, 12, 18, 25)',
    resultColor: 'bg-blue-50 text-blue-700',
  },
  {
    trigger: 'Prospecto Partner',
    triggerColor: 'bg-purple-100 text-purple-700',
    result: 'Secuencia de 6 mensajes de reclutamiento con copy específico de negocio',
    resultColor: 'bg-purple-50 text-purple-700',
  },
  {
    trigger: 'Nueva venta registrada',
    triggerColor: 'bg-green-100 text-green-700',
    result: 'Recordatorios de recompra: 7 días antes, 3 días antes, 5 días después',
    resultColor: 'bg-green-50 text-green-700',
  },
  {
    trigger: 'Contacto → Cliente o Partner',
    triggerColor: 'bg-amber-100 text-amber-700',
    result: 'Tarea automática de referidos a los 30 días del registro',
    resultColor: 'bg-amber-50 text-amber-700',
  },
  {
    trigger: 'Partner pierde clientes activos',
    triggerColor: 'bg-red-100 text-red-700',
    result: 'Alerta de urgencia: "Recuperar Q-Team" con mensaje de acción inmediata',
    resultColor: 'bg-red-50 text-red-700',
  },
];

const rowVariants = {
  hidden: { opacity: 0, x: -24 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, delay: i * 0.1, ease: 'easeOut' },
  }),
};

export default function Automations() {
  return (
    <section id="automatizaciones" className="bg-[#F8FAFC] py-20 px-5">
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
            Automatizaciones
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] leading-tight mb-4">
            Cada acción dispara la tarea correcta
          </h2>
          <p className="text-[#64748B] max-w-xl mx-auto">
            No tienes que recordar qué mensaje mandar ni cuándo. Zynergia lo sabe por ti.
          </p>
        </motion.div>

        {/* Automation rows */}
        <div className="space-y-4 max-w-3xl mx-auto">
          {AUTOMATIONS.map((auto, index) => (
            <motion.div
              key={index}
              custom={index}
              variants={rowVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, margin: '-40px' }}
              whileHover={{ x: 4 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              {/* Trigger */}
              <div className="flex-shrink-0">
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${auto.triggerColor}`}>
                  {auto.trigger}
                </span>
              </div>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0 hidden sm:block" />

              {/* Result */}
              <div className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg ${auto.resultColor}`}>
                {auto.result}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center text-sm text-[#64748B] mt-10"
        >
          Todas las automatizaciones incluyen{' '}
          <span className="font-semibold text-[#0F172A]">3 versiones del mensaje</span>
          {' '}(general, amigable y directo) para que elijas el tono que funciona con cada persona.
        </motion.p>
      </div>
    </section>
  );
}
