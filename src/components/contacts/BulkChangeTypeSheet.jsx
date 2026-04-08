import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const CONTACT_TYPES = [
  { value: '', label: 'Sin tipo' },
  { value: 'prospecto_producto', label: 'Prospecto producto' },
  { value: 'prospecto_partner', label: 'Prospecto partner' },
  { value: 'cliente_producto', label: 'Cliente producto' },
  { value: 'partner', label: 'Partner' },
];

export default function BulkChangeTypeSheet({ isOpen, onClose, onConfirm, isLoading }) {
  const [selected, setSelected] = useState(null);

  // Hide bottom nav while open
  useEffect(() => {
    const nav = document.querySelector('nav');
    if (!nav) return;
    if (isOpen) {
      nav.style.display = 'none';
    } else {
      nav.style.display = '';
    }
    return () => { nav.style.display = ''; };
  }, [isOpen]);

  const handleConfirm = () => {
    if (selected === null) return;
    onConfirm(selected);
    setSelected(null);
  };

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 pb-8"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <h2 className="text-[17px] font-semibold text-[#0F172A]">Cambiar tipo de contacto</h2>
              <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F1F5F9]">
                <X className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>

            <div className="px-5">
              {CONTACT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelected(type.value)}
                  className={`w-full flex items-center justify-between py-3.5 text-[15px] transition-colors ${
                    selected === type.value ? 'text-[#004AFE] font-medium' : 'text-[#0F172A] font-normal'
                  }`}
                >
                  {type.label}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    selected === type.value ? 'border-[#004AFE]' : 'border-[#CBD5E1]'
                  }`}>
                    {selected === type.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#004AFE]" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="px-5 mt-4">
              <button
                onClick={handleConfirm}
                disabled={selected === null || isLoading}
                className="w-full h-12 bg-[#004AFE] text-white rounded-full text-[15px] font-semibold disabled:opacity-40 transition-opacity"
              >
                {isLoading ? 'Aplicando...' : 'Confirmar'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}