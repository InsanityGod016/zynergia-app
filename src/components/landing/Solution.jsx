import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const BENEFITS = [
  'Genera tareas automáticamente según el tipo de contacto',
  'Mensajes de WhatsApp listos con 3 tonos diferentes',
  'Calcula cuándo vence cada recompra antes de que se te olvide',
  'Rastrea el avance de tus partners hacia cada bono en tiempo real',
  'Alertas inteligentes cuando hay riesgo de perder clientes',
];

const STEPS = [
  { step: '1', label: 'Agregas un contacto', sub: 'Juan Pérez — Prospecto Producto', color: 'bg-[#004AFE]' },
  { step: '2', label: 'Seleccionas el tipo', sub: 'Prospecto Producto →', color: 'bg-[#004AFE]' },
  { step: '3', label: 'Zynergia crea las tareas', sub: '6 mensajes programados automáticamente', color: 'bg-green-500' },
  { step: '4', label: 'Envías por WhatsApp', sub: '"Hola Juan, ¿cómo has estado?..."', color: 'bg-green-500' },
];

export default function Solution() {
  return (
    <section className="bg-white py-20 px-5">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-16">

          {/* Left: flow visual */}
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="flex-1 w-full"
          >
            <div className="bg-[#F8FAFC] rounded-3xl p-8 border border-gray-100">
              <div className="space-y-3">
                {STEPS.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    {/* Step indicator + connector */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 ${item.color} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {item.step}
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className="w-px h-8 bg-gray-200 mt-1"></div>
                      )}
                    </div>
                    {/* Content */}
                    <div className="pt-1">
                      <div className="text-sm font-semibold text-[#0F172A]">{item.label}</div>
                      <div className="text-xs text-[#64748B] mt-0.5">{item.sub}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Result highlight */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: false }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="mt-6 bg-[#004AFE]/5 border border-[#004AFE]/10 rounded-xl p-4"
              >
                <p className="text-xs text-[#004AFE] font-semibold text-center">
                  ✓ Zynergia hizo todo el trabajo pesado por ti
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Right: copy */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: '-80px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex-1"
          >
            <p className="text-[#004AFE] text-sm font-semibold uppercase tracking-widest mb-4">
              La solución
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] leading-tight mb-6">
              Tu actividad se convierte en tareas automáticas
            </h2>
            <p className="text-[#64748B] leading-relaxed mb-8">
              Zynergia monitorea cada contacto, venta y partner de tu red. Cada vez que
              algo cambia — tipo de contacto, nueva venta, avance en el programa — genera
              automáticamente las tareas de seguimiento correctas con mensajes listos
              para enviar.
            </p>

            <ul className="space-y-3">
              {BENEFITS.map((benefit, i) => (
                <motion.li
                  key={benefit}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: false }}
                  transition={{ duration: 0.35, delay: i * 0.07 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-[#004AFE] flex-shrink-0 mt-0.5" />
                  <span className="text-[#0F172A] text-sm">{benefit}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
