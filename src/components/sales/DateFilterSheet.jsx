import { motion, AnimatePresence } from 'framer-motion';

const dateOptions = [
  { value: 'today', label: 'Hoy' },
  { value: 'last7', label: 'Últimos 7 días' },
  { value: 'thisMonth', label: 'Este mes' },
  { value: 'lastMonth', label: 'Mes pasado' },
  { value: 'last30', label: 'Últimos 30 días' }
];

export default function DateFilterSheet({ isOpen, onClose, selectedDate, onSelect }) {
  const handleSelect = (value) => {
    onSelect(value);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[70] max-h-[70vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
          >
            {/* Header */}
            <div className="px-6 py-4">
              <h3 className="text-[18px] font-semibold text-[#0F172A]">Filtros</h3>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {dateOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className="w-full flex items-center justify-between py-3"
                >
                  <span className="text-[15px] text-[#0F172A]">{option.label}</span>
                  <div 
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedDate === option.value
                        ? 'border-[#004AFE] bg-[#004AFE]' 
                        : 'border-[#CBD5E1]'
                    }`}
                  >
                    {selectedDate === option.value && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
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