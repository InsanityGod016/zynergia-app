import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen({ onComplete }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Logo animation: 0.2s delay + 1.6s spinGrow = ~1.8s
    // Wordmark appears at 1.4s, stays ~0.7s = ~2.1s total
    // Wait 3s then exit (matching original HTML)
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 520); // match splashOut duration
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ backgroundColor: '#004AFE' }}
        >
          {/* Logo with spinGrow animation */}
          <motion.img
            src="/icons/icon-512.png"
            alt="Zynergia"
            initial={{ opacity: 0, scale: 0.08, rotate: -360 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{
              delay: 0.2,
              duration: 1.6,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="w-[150px] h-[150px] object-contain rounded-[30px]"
          />

          {/* Wordmark at the bottom */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.7, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              bottom: 60,
              fontFamily: 'Inter, sans-serif',
              fontSize: 16,
              fontWeight: 400,
              letterSpacing: '0.12em',
              color: '#ffffff',
            }}
          >
            Zynergia
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}