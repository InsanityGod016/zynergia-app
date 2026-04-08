import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductFilterSheet({ isOpen, onClose, products, selectedProducts, onApply }) {
  const [tempSelected, setTempSelected] = useState(selectedProducts);

  const toggleProduct = (productId) => {
    setTempSelected(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleReset = () => {
    setTempSelected([]);
  };

  const handleApply = () => {
    onApply(tempSelected);
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
            <div className="px-6 py-4 border-b border-[#F1F5F9]">
              <h3 className="text-[18px] font-semibold text-[#0F172A]">Filtrar por producto</h3>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {products.map(product => (
                <button
                  key={product.id}
                  onClick={() => toggleProduct(product.id)}
                  className="w-full flex items-center justify-between py-3"
                >
                  <span className="text-[15px] text-[#0F172A]">{product.name}</span>
                  <div 
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      tempSelected.includes(product.id)
                        ? 'border-[#004AFE] bg-[#004AFE]' 
                        : 'border-[#CBD5E1]'
                    }`}
                  >
                    {tempSelected.includes(product.id) && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-[#F1F5F9] flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 h-11 rounded-full bg-[#F1F5F9] text-[#64748B] text-[15px] font-medium hover:bg-[#E2E8F0] transition-colors"
              >
                Reiniciar
              </button>
              <button
                onClick={handleApply}
                className="flex-1 h-11 rounded-full bg-[#004AFE] text-white text-[15px] font-medium hover:bg-[#0039CC] transition-colors"
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