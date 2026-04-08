import { CheckSquare, Users, TrendingUp, Network, Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';

const FEATURES = [
  {
    icon: CheckSquare,
    color: 'text-[#004AFE]',
    bg: 'bg-[#004AFE]/8',
    border: 'border-[#004AFE]/12',
    title: 'Tareas automáticas',
    description:
      'La pantalla principal de la app. Ve tus tareas pendientes del día, la semana y el mes. Filtra por categoría y marca completadas con un tap.',
    tag: 'Módulo principal',
    tagColor: 'text-[#004AFE]',
  },
  {
    icon: Users,
    color: 'text-purple-600',
    bg: 'bg-purple-500/8',
    border: 'border-purple-200',
    title: 'Gestión de contactos',
    description:
      'Organiza a todos tus contactos por tipo: Prospecto, Cliente, Partner. Al cambiar el tipo, la app genera la secuencia de seguimiento correcta.',
    tag: 'Automatización',
    tagColor: 'text-purple-600',
  },
  {
    icon: TrendingUp,
    color: 'text-green-600',
    bg: 'bg-green-500/8',
    border: 'border-green-200',
    title: 'Registro de ventas',
    description:
      'Registra ventas nuevas y recompras. La app calcula cuándo vencerá el siguiente pedido y genera recordatorios automáticos.',
    tag: 'Recompras inteligentes',
    tagColor: 'text-green-600',
  },
  {
    icon: Network,
    color: 'text-amber-600',
    bg: 'bg-amber-500/8',
    border: 'border-amber-200',
    title: 'Panel de partners',
    description:
      'Rastrea el avance de cada partner en el programa Fast Start. Visualiza en qué fase está, cuántos días le quedan y qué necesita para el siguiente bono.',
    tag: 'Fast Start',
    tagColor: 'text-amber-600',
  },
  {
    icon: Megaphone,
    color: 'text-rose-600',
    bg: 'bg-rose-500/8',
    border: 'border-rose-200',
    title: 'Herramientas de marketing',
    description:
      'Generador de QR personalizado, catálogo de productos con links y plantillas de mensajes WhatsApp en 3 tonos: general, amigable y directo.',
    tag: 'WhatsApp + QR',
    tagColor: 'text-rose-600',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function Features() {
  return (
    <section id="features" className="bg-[#F8FAFC] py-20 px-5">
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
            Los 5 módulos
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] leading-tight mb-4">
            Todo lo que necesitas en un solo lugar
          </h2>
          <p className="text-[#64748B] max-w-xl mx-auto">
            Cinco módulos integrados que trabajan juntos para que tu negocio funcione sin caos.
          </p>
        </motion.div>

        {/* Feature cards grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: '-60px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover={{ y: -5, boxShadow: '0 16px 40px rgba(0,0,0,0.09)' }}
                className={`bg-white rounded-2xl p-6 border border-gray-100 shadow-sm cursor-default ${
                  index === 4 ? 'sm:col-span-2 lg:col-span-1' : ''
                }`}
              >
                {/* Icon */}
                <div className={`w-11 h-11 ${feature.bg} rounded-xl flex items-center justify-center mb-4 border ${feature.border}`}>
                  <Icon className={`w-5 h-5 ${feature.color}`} />
                </div>

                {/* Tag */}
                <span className={`text-xs font-semibold ${feature.tagColor} bg-white border border-gray-100 px-2.5 py-1 rounded-full`}>
                  {feature.tag}
                </span>

                {/* Title */}
                <h3 className="text-lg font-bold text-[#0F172A] mt-3 mb-2">{feature.title}</h3>

                {/* Description */}
                <p className="text-[#64748B] text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
