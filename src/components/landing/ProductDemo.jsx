import { motion } from 'framer-motion';
import HeroTaskAnimation from './HeroTaskAnimation';

export default function ProductDemo() {
  return (
    <section className="bg-white py-20 px-5">
      <div className="max-w-3xl mx-auto text-center">

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] leading-tight mb-4">
            Así se ve Zynergia en acción
          </h2>
          <p className="text-[#64748B] text-lg leading-relaxed max-w-[640px] mx-auto">
            Zynergia organiza automáticamente tus seguimientos para que siempre sepas a quién hablarle.
          </p>
        </motion.div>

        {/* Frame animation */}
        <HeroTaskAnimation />
      </div>
    </section>
  );
}
