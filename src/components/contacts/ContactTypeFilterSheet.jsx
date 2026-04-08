import { motion, AnimatePresence } from 'framer-motion';

const typeOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'cliente_producto', label: 'Cliente producto' },
  { value: 'partner', label: 'Partner' },
  { value: 'prospecto_producto', label: 'Prospecto producto' },
  { value: 'prospecto_partner', label: 'Prospecto partner' }
];

export default function ContactTypeFilterSheet({ isOpen, onClose, selectedType, onSelect }) {
  const handleSelect = (value) => {
    onSelect(value);
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
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[70] pb-[env(safe-area-inset-bottom)]"
          >
            <div className="px-6 py-4">
              <h3 className="text-[18px] font-semibold text-[#0F172A]">Tipo de contacto</h3>
            </div>
            <div className="px-6 pb-6 space-y-0">
              {typeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className="w-full flex items-center justify-between py-3"
                >
                  <span className="text-[15px] text-[#0F172A]">{option.label}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedType === option.value ? 'border-[#004AFE] bg-[#004AFE]' : 'border-[#CBD5E1]'
                  }`}>
                    {selectedType === option.value && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}