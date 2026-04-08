import { motion } from 'framer-motion';
import { MessageCircle, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const categoryColors = {
  recompra: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Recompra' },
  seguimiento: { bg: 'bg-blue-50', text: 'text-[#004AFE]', label: 'Seguimiento' },
  reactivacion: { bg: 'bg-purple-50', text: 'text-purple-600', label: 'Reactivación' }
};

function getTaskLabel(task) {
  if (task.task_name) return task.task_name;
  return task.subcategory;
}

export default function TaskCard({ task, contact, product, onComplete, onWhatsApp }) {
  const navigate = useNavigate();
  const cat = categoryColors[task.category] || { bg: 'bg-gray-50', text: 'text-gray-500', label: task.category };

  const handleWhatsAppClick = () => {
    navigate(createPageUrl('SelectMessageTone') + '?taskId=' + task.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`bg-white rounded-2xl p-4 border border-[#F1F5F9] shadow-sm ${task.completed ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Complete button */}
        <button
          onClick={() => onComplete(task.id, task.completed)}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
            task.completed
              ? 'bg-[#004AFE] border-[#004AFE]'
              : 'border-[#CBD5E1]'
          }`}
        >
          {task.completed && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}>
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </motion.div>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-semibold text-[15px] leading-tight truncate ${task.completed ? 'line-through text-[#94A3B8]' : 'text-[#0F172A]'}`}>
              {contact?.full_name || 'Sin nombre'}
            </h3>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cat.bg} ${cat.text}`}>
              {cat.label}
            </span>
          </div>

          <p className="text-[12px] font-medium text-[#004AFE] mt-0.5">{getTaskLabel(task)}</p>
          {product && <p className="text-[12px] text-[#94A3B8] mt-0.5 truncate">{product.name}</p>}

          <button
            onClick={handleWhatsAppClick}
            className="mt-2.5 flex items-center gap-1.5 text-[12px] font-semibold text-[#25D366]"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Enviar mensaje
          </button>
        </div>
      </div>
    </motion.div>
  );
}