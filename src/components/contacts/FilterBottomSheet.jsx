import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function FilterBottomSheet({ 
  isOpen, 
  onClose, 
  title, 
  items, 
  selectedItems, 
  onApply 
}) {
  const handleToggle = (itemId) => {
    if (selectedItems.includes(itemId)) {
      onApply(selectedItems.filter(id => id !== itemId));
    } else {
      onApply([...selectedItems, itemId]);
    }
  };

  const handleReset = () => {
    onApply([]);
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
              <h3 className="text-[18px] font-semibold text-[#0F172A]">{title}</h3>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleToggle(item.id)}
                  className="w-full flex items-center justify-between py-3"
                >
                  <span className="text-[15px] text-[#0F172A]">{item.name}</span>
                  <div 
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedItems.includes(item.id) 
                        ? 'border-[#004AFE] bg-[#004AFE]' 
                        : 'border-[#CBD5E1]'
                    }`}
                  >
                    {selectedItems.includes(item.id) && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Actions - Anclados abajo */}
            <div className="px-6 py-4 pb-safe flex gap-3 bg-white">
              <button
                onClick={handleReset}
                className="flex-1 h-12 rounded-full bg-[#F1F5F9] text-[#64748B] text-[15px] font-medium"
              >
                Reiniciar
              </button>
              <button
                onClick={onClose}
                className="flex-1 h-12 rounded-full bg-[#004AFE] text-white text-[15px] font-medium"
              >
                Aplicar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}