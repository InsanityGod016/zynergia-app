import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const toneLabels = {
  general: 'General',
  amigable: 'Amigable',
  directo: 'Directo'
};

export default function SelectMessageTone() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get('taskId');
  
  const [selectedTone, setSelectedTone] = useState(null);
  const [task, setTask] = useState(null);
  const [contact, setContact] = useState(null);
  const [product, setProduct] = useState(null);
  const [templates, setTemplates] = useState([]);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => db.Task.list()
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => db.Contact.list()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.Product.list()
  });

  const { data: allTemplates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => db.Template.list()
  });

  useEffect(() => {
    if (taskId && tasks.length > 0) {
      const foundTask = tasks.find(t => t.id === taskId);
      setTask(foundTask);
      
      if (foundTask) {
        const foundContact = contacts.find(c => c.id === foundTask.contact_id);
        const foundProduct = products.find(p => p.id === foundTask.product_id);
        setContact(foundContact);
        setProduct(foundProduct);

        // Filter templates by category and template_subcategory (or subcategory as fallback)
        const templateSubcat = foundTask.template_subcategory || foundTask.subcategory;
        const matchingTemplates = allTemplates.filter(
          t => t.category === foundTask.category && t.subcategory === templateSubcat
        );
        setTemplates(matchingTemplates);
      }
    }
  }, [taskId, tasks, contacts, products, allTemplates]);

  const replaceVariables = (content) => {
    if (!content) return '';
    return content
      .replace(/\{\{contact\.full_name\}\}/g, contact?.full_name || '')
      .replace(/\{\{product\.name\}\}/g, product?.name || '')
      .replace(/\{\{product\.link_URL\}\}/g, product?.link_url || '')
      .replace(/\{\{product\.link_url\}\}/g, product?.link_url || '');
  };

  const handleSelectTone = (template) => {
    setSelectedTone(template.tone);
    
    // Replace variables and open WhatsApp
    const message = replaceVariables(template.content);
    const phone = contact?.phone?.replace(/\D/g, '') || '';
    
    if (phone && message) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const formatTitle = () => {
    if (!task) return '';
    if (task.task_name) return task.task_name;

    const categoryLabels = {
      seguimiento: 'Seguimiento',
      recompra: 'Recompra',
      reactivacion: 'Reactivación'
    };

    const subcategoryFormatted = (task.template_subcategory || task.subcategory)
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return `${categoryLabels[task.category]} – ${subcategoryFormatted}`;
  };

  if (!task || !contact) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[#6E6E73]">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(createPageUrl('Tasks'))}
          className="w-10 h-10 flex items-center justify-center -ml-2"
        >
          <ArrowLeft className="w-6 h-6 text-[#27251f]" />
        </button>
        <h1 className="text-lg font-semibold text-[#27251f]">{formatTitle()}</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 space-y-3 pb-6">
        {templates.map(template => (
          <div
            key={template.id}
            onClick={() => handleSelectTone(template)}
            className={`bg-white rounded-2xl p-5 border-2 cursor-pointer transition-all ${
              selectedTone === template.tone
                ? 'border-[#004afe] shadow-lg'
                : 'border-[#EAEAEA] hover:border-[#CBD5E1]'
            }`}
          >
            <h3 className="text-[15px] font-semibold text-[#27251f] mb-3">
              {toneLabels[template.tone]}
            </h3>
            <p className="text-[14px] text-[#64748B] leading-relaxed whitespace-pre-wrap">
              {replaceVariables(template.content)}
            </p>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#6E6E73] text-sm">
              No hay plantillas disponibles para esta tarea
            </p>
          </div>
        )}
      </div>
    </div>
  );
}