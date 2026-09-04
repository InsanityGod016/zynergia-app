import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const FEATURES_LIST = [
  'Contactos y seguimientos ilimitados',
  'Generación automática de tareas',
  'Mensajes WhatsApp en 3 tonos',
  'Registro y análisis de ventas',
  'Panel de partners con Fast Start',
  'Generador de QR personalizado',
  'Recordatorios inteligentes de recompra',
  'App para iOS y Android',
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

        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(0,0,0,0.08)' }}
            className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm"
          >
            <div className="mb-6">
              <h3 className="text-base font-semibold text-[#64748B] mb-1">Plan mensual</h3>
              <p className="text-4xl font-bold text-[#0F172A]">17 USD</p>
              <p className="text-sm text-[#64748B] mt-2">al mes, precio final</p>
            </div>

            <a
              href="/crear-cuenta"
              className="block w-full text-center border border-[#004AFE] text-[#004AFE] hover:bg-[#004AFE] hover:text-white font-semibold py-3.5 rounded-full transition-colors text-sm mb-6"
            >
              Crear mi cuenta
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
        </div>

        {/* Trust note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center text-sm text-[#94A3B8] mt-8"
        >
          Crea la cuenta antes de pagar. Puedes cancelar la renovación desde la app o desde tu cuenta web.
        </motion.p>
      </div>
    </section>
  );
}
