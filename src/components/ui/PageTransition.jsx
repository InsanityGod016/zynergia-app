import { motion } from 'framer-motion';

const easeOutCubic = [0.33, 1, 0.68, 1];

export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: easeOutCubic }}
    >
      {children}
    </motion.div>
  );
}