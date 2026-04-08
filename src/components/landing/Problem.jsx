import { AlertCircle, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const PAIN_POINTS = [
  {
    icon: Clock,
    color: 'text-red-500',
    iconBg: 'bg-red-500/10',
    title: 'Se me olvida el seguimiento',
    description:
      'Tienes decenas de prospectos en distintos estados. Sin un sistema, los mensajes se quedan pendientes y los prospectos se enfrían.',
    mockup: (
      <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-100 rounded-full" />
            <span className="text-[10px] font-semibold text-[#0F172A]">Ana García</span>
          </div>
          <span className="text-[8px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
            Vencida
          </span>
        </div>
        <div className="text-[9px] text-red-400 font-medium">Hace 3 días · Follow up pendiente</div>
        <div className="w-full h-px bg-red-100 my-2" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-100 rounded-full" />
            <span className="text-[10px] font-semibold text-[#0F172A]">Luis Ramírez</span>
          </div>
          <span className="text-[8px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
            Vencida
          </span>
        </div>
        <div className="text-[9px] text-red-400 font-medium mt-1">Hace 7 días · Sin contacto</div>
      </div>
    ),
  },
  {
    icon: AlertCircle,
    color: 'text-amber-500',
    iconBg: 'bg-amber-500/10',
    title: 'Pierdo recompras sin darme cuenta',
    description:
      'Tus clientes necesitan reordenar cada cierto tiempo. Sin recordatorios automáticos, pierdes ventas recurrentes que ya tenías ganadas.',
    mockup: (
      <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3">
        <div className="text-[9px] text-amber-600 font-semibold mb-2">Pedido de María L. venció hace:</div>
        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold text-amber-600">-5</span>
          <span className="text-xs text-amber-500 mb-1 font-medium">días</span>
        </div>
        <div className="text-[9px] text-amber-400 mt-1">Sin recordatorio · Recompra perdida</div>
        <div className="mt-2 w-full bg-amber-100 rounded-full h-1.5">
          <div className="bg-amber-400 h-1.5 rounded-full w-full" />
        </div>
      </div>
    ),
  },
  {
    icon: Users,
    color: 'text-purple-500',
    iconBg: 'bg-purple-500/10',
    title: 'No sé cómo va mi red',
    description:
      'Tus partners están en distintas fases del programa Fast Start y no tienes visibilidad de quién necesita apoyo para llegar al siguiente bono.',
    mockup: (
      <div className="mt-4 bg-purple-50 border border-purple-100 rounded-xl p-3">
        <div className="text-[9px] text-purple-600 font-semibold mb-2">Partners en Fast Start</div>
        {[
          { name: 'Carlos M.', pct: 40 },
          { name: 'Sofía R.', pct: 15 },
        ].map((p) => (
          <div key={p.name} className="flex items-center gap-2 mb-2">
            <span className="text-[9px] text-[#64748B] w-14 flex-shrink-0">{p.name}</span>
            <div className="flex-1 h-1.5 bg-purple-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-300 rounded-full"
                style={{ width: `${p.pct}%` }}
              />
            </div>
            <span className="text-[9px] text-purple-400 font-bold">?</span>
          </div>
        ))}
        <div className="text-[9px] text-purple-400 mt-1">Sin visibilidad del avance real</div>
      </div>
    ),
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function Problem() {
  return (
    <section className="bg-[#F8FAFC] py-20 px-5">
      <div className="max-w-6xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-[#004AFE] text-sm font-semibold uppercase tracking-widest mb-3">
            El problema
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] leading-tight">
            Gestionar tu red sin una herramienta{' '}
            <br className="hidden sm:block" />
            es caos puro
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: '-60px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {PAIN_POINTS.map((point) => {
            const Icon = point.icon;
            return (
              <motion.div
                key={point.title}
                variants={cardVariants}
                whileHover={{ y: -5, boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}
                className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm cursor-default"
              >
                <div className={`w-11 h-11 ${point.iconBg} rounded-xl flex items-center justify-center mb-5`}>
                  <Icon className={`w-5 h-5 ${point.color}`} />
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] mb-3">{point.title}</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">{point.description}</p>
                {point.mockup}
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-14"
        >
          <p className="text-[#64748B] text-sm">
            ¿Te suena familiar?{' '}
            <span className="text-[#0F172A] font-semibold">Zynergia lo resuelve automáticamente.</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
