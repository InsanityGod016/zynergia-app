import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function SplashScreen({ onComplete }) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [exiting, setExiting] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const exit = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setGone(true);
        onCompleteRef.current?.();
      }, 480);
    }, 2800);
    return () => clearTimeout(exit);
  }, []); // empty deps — timer runs exactly once regardless of prop changes

  if (gone) return null;

  return (
    <motion.div
      animate={exiting ? { opacity: 0, scale: 1.03 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.48, ease: 'easeInOut' }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        backgroundColor: '#004AFE',
        // Never block touches once fading — prevents blank-screen-but-frozen bug on iPadOS
        pointerEvents: exiting ? 'none' : 'auto',
      }}
    >
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
  );
}