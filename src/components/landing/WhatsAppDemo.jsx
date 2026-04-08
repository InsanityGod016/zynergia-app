import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send } from 'lucide-react';

// Steps: 0=idle, 1=task appears, 2=button glows, 3=bubble appears, 4=send tap
export default function WhatsAppDemo() {
  const [step, setStep] = useState(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    let timers = [];

    const observer = new IntersectionObserver(
      ([entry]) => {
        timers.forEach(clearTimeout);
        timers = [];

        if (entry.isIntersecting) {
          setStep(1);
          timers.push(setTimeout(() => setStep(2), 900));
          timers.push(setTimeout(() => setStep(3), 1900));
          timers.push(setTimeout(() => setStep(4), 3200));
        } else {
          setStep(0);
        }
      },
      { threshold: 0.4 }
    );

    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <section className="bg-[#F8FAFC] py-20 px-5 overflow-hidden">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-[#004AFE] text-sm font-semibold uppercase tracking-widest mb-3">
            Un toque. Listo.
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] leading-tight mb-4">
            El mensaje ya está escrito.{' '}
            <span className="text-[#004AFE]">Tú solo envías.</span>
          </h2>
          <p className="text-[#64748B] leading-relaxed max-w-md mx-auto">
            No tienes que pensar qué decir ni cuándo. Zynergia prepara el mensaje correcto
            para cada persona. Tú lo revisas y presionas enviar.
          </p>
        </motion.div>

        {/* Phone UI mockup */}
        <div ref={wrapRef} className="max-w-xs mx-auto">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden">

            {/* App bar */}
            <div className="bg-[#004AFE] px-4 pt-5 pb-4">
              <div className="text-white/60 text-[10px] mb-1">Lunes · Tarea del día</div>
              <div className="text-white font-bold text-sm">Seguimiento — Día 3</div>
            </div>

            {/* Task card */}
            <AnimatePresence>
              {step >= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, type: 'spring', stiffness: 200 }}
                  className="mx-4 mt-4 bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 bg-[#004AFE]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-[#004AFE]">AG</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#0F172A]">Ana García</div>
                      <div className="text-[10px] text-[#64748B]">Prospecto Producto</div>
                    </div>
                    <span className="ml-auto text-[9px] font-semibold bg-[#004AFE]/10 text-[#004AFE] px-2 py-0.5 rounded-full">
                      Día 3
                    </span>
                  </div>
                  <p className="text-[10px] text-[#64748B] italic leading-relaxed border-l-2 border-[#004AFE]/30 pl-2">
                    "Hola Ana! Solo quería preguntarte cómo vas con el producto. ¿Ya lo probaste?"
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* WhatsApp button */}
            <div className="px-4 pt-3 pb-2">
              <AnimatePresence>
                {step >= 2 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                      opacity: 1,
                      scale: step === 4 ? [1, 0.94, 1] : 1,
                      boxShadow: step >= 2 && step < 4
                        ? ['0 0 0 0 rgba(0,74,254,0)', '0 0 0 8px rgba(0,74,254,0.15)', '0 0 0 0 rgba(0,74,254,0)']
                        : '0 0 0 0 rgba(0,74,254,0)',
                    }}
                    transition={{
                      opacity: { duration: 0.3 },
                      scale: step === 4 ? { duration: 0.25 } : { duration: 0.3 },
                      boxShadow: { duration: 1.2, repeat: step >= 2 && step < 4 ? Infinity : 0 },
                    }}
                    className="w-full bg-[#25D366] text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Enviar por WhatsApp
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* WhatsApp chat preview */}
            <AnimatePresence>
              {step >= 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mx-4 mb-4 bg-[#ECF6EC] rounded-2xl p-3"
                >
                  <div className="text-[9px] text-[#64748B] mb-2 font-medium">WhatsApp · Ana García</div>
                  <div className="bg-white rounded-xl rounded-tl-none px-3 py-2 shadow-sm inline-block max-w-full">
                    <p className="text-[10px] text-[#0F172A] leading-relaxed">
                      Hola Ana! Solo quería preguntarte cómo vas con el producto. ¿Ya lo probaste? 😊
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[8px] text-[#94A3B8]">Ahora</span>
                      <AnimatePresence>
                        {step >= 4 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                          >
                            <Send className="w-2.5 h-2.5 text-[#004AFE]" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Caption */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center text-sm text-[#94A3B8] mt-6"
        >
          Cada mensaje tiene 3 tonos: general, amigable o directo. Tú eliges.
        </motion.p>
      </div>
    </section>
  );
}
