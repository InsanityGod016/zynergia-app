import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQ_ITEMS = [
  {
    question: '¿Necesito conocimientos técnicos para usar Zynergia?',
    answer:
      'No. Zynergia está diseñado para distribuidores, no para programadores. Si sabes usar WhatsApp, sabes usar Zynergia. La app es intuitiva y en español.',
  },
  {
    question: '¿Cómo genera la app los mensajes automáticamente?',
    answer:
      'Cuando agregas un contacto y seleccionas su tipo (Prospecto, Cliente o Partner), Zynergia crea una secuencia de tareas con fechas y mensajes predefinidos. Solo tienes que entrar a la app, ver la tarea del día y presionar "Enviar por WhatsApp".',
  },
  {
    question: '¿Funciona para cualquier empresa de red de mercadeo?',
    answer:
      'Sí. Zynergia es una herramienta de gestión genérica. No importa la empresa que distribuyas: puedes configurar tus propios productos, links y mensajes. Las plantillas son totalmente editables.',
  },
  {
    question: '¿Qué pasa si cancelo mi suscripción?',
    answer:
      'Puedes cancelar en cualquier momento desde la App Store o Google Play. Tus datos permanecen seguros. Si decides regresar, los recuperas donde los dejaste.',
  },
  {
    question: '¿En qué plataformas está disponible Zynergia?',
    answer:
      'Zynergia está disponible en iOS (App Store), Android (Google Play) y como aplicación web. Puedes usarla desde tu teléfono o computadora y los datos se sincronizan automáticamente.',
  },
];

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-[#0F172A] text-sm pr-4">{item.question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.22 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-[#64748B]" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-6 pb-5 pt-1">
              <p className="text-[#64748B] text-sm leading-relaxed">{item.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="bg-white py-20 px-5">
      <div className="max-w-3xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-[#004AFE] text-sm font-semibold uppercase tracking-widest mb-3">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] leading-tight">
            Preguntas frecuentes
          </h2>
        </motion.div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: '-40px' }}
              transition={{ duration: 0.4, delay: index * 0.07 }}
            >
              <FAQItem
                item={item}
                isOpen={openIndex === index}
                onToggle={() => toggle(index)}
              />
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-[#64748B] text-sm">
            ¿Tienes otra pregunta?{' '}
            <a
              href="mailto:hola@zynergia.app"
              className="text-[#004AFE] font-semibold hover:underline"
            >
              Escríbenos
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
