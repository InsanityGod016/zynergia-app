import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { scheduleTaskReminders } from '@/lib/notifications';
import { AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import MainHeader from '@/components/ui/MainHeader';
import ProgressCircle from '@/components/tasks/ProgressCircle';
import TaskCard from '@/components/tasks/TaskCard';
import CategoryFilterSheet from '@/components/tasks/CategoryFilterSheet';
import TimeFilterSheet from '@/components/tasks/TimeFilterSheet';
import AreaFilterSheet from '@/components/tasks/AreaFilterSheet';

const timeLabels = {
  overdue: 'Atrasadas',
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes'
};

const categoryLabels = {
  all: 'Todas',
  recompra: 'Recompra',
  seguimiento: 'Seguimiento',
  reactivacion: 'Reactivación'
};

const areaLabels = {
  all: 'Todas',
  producto: 'Producto',
  partner: 'Partner',
  prospecto_producto: 'Prosp. producto',
  prospecto_partner: 'Prosp. partner'
};

export default function Tasks() {
  const [timeFilter, setTimeFilter] = useState('today');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showTimeSheet, setShowTimeSheet] = useState(false);
  const [showAreaSheet, setShowAreaSheet] = useState(false);
  const queryClient = useQueryClient();

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

  // Schedule push reminders whenever tasks load (only runs on native device)
  useEffect(() => {
    if (tasks.length > 0) {
      scheduleTaskReminders(tasks);
    }
  }, [tasks]);

  const completeMutation = useMutation({
    mutationFn: ({ taskId, completed }) => {
      return db.Task.update(taskId, { completed: !completed });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return tasks.filter(task => {
      // Parse task date from string format "YYYY-MM-DD"
      const [year, month, day] = task.due_date.split('-').map(Number);
      const taskDate = new Date(year, month - 1, day);
      
      // Time filter
      let passesTimeFilter = false;
      if (timeFilter === 'overdue') {
        passesTimeFilter = taskDate < today && !task.completed;
      } else if (timeFilter === 'today') {
        passesTimeFilter = taskDate.toDateString() === today.toDateString();
      } else if (timeFilter === 'week') {
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        passesTimeFilter = taskDate >= today && taskDate <= weekEnd;
      } else if (timeFilter === 'month') {
        const monthEnd = new Date(today);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        passesTimeFilter = taskDate >= today && taskDate <= monthEnd;
      }

      // Category filter
      const passesCategoryFilter = categoryFilter === 'all' || task.category === categoryFilter;

      // Area filter (tasks without task_area default to 'producto')
      const taskArea = task.task_area || 'producto';
      const passesAreaFilter = areaFilter === 'all' || taskArea === areaFilter;

      return passesTimeFilter && passesCategoryFilter && passesAreaFilter;
    });
  }, [tasks, timeFilter, categoryFilter, areaFilter]);

  const taskCounts = useMemo(() => {
    return {
      recompra: filteredTasks.filter(t => t.category === 'recompra').length,
      reactivacion: filteredTasks.filter(t => t.category === 'reactivacion').length,
      seguimiento: filteredTasks.filter(t => t.category === 'seguimiento').length,
      completed: filteredTasks.filter(t => t.completed).length,
      total: filteredTasks.length
    };
  }, [filteredTasks]);

  // Determine which category rows to show in the progress section
  const visibleCategories = useMemo(() => {
    if (areaFilter === 'producto') {
      return ['recompra', 'reactivacion', 'seguimiento'];
    }
    if (areaFilter === 'partner' || areaFilter === 'prospecto_producto' || areaFilter === 'prospecto_partner') {
      return ['seguimiento'];
    }
    // areaFilter === 'all': show only categories that exist in current filtered set
    const cats = [];
    if (taskCounts.recompra > 0) cats.push('recompra');
    if (taskCounts.reactivacion > 0) cats.push('reactivacion');
    if (taskCounts.seguimiento > 0) cats.push('seguimiento');
    return cats;
  }, [areaFilter, taskCounts]);

  const handleWhatsApp = (phone) => {
    if (phone) {
      window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
    }
  };

  const getContact = (contactId) => contacts.find(c => c.id === contactId);
  const getProduct = (productId) => products.find(p => p.id === productId);

  return (
    <div className="px-5 pt-8 pb-6">
      <MainHeader title="Lista de tareas" />

      {/* Progress Section */}
      <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm p-4 flex items-center gap-5 mb-6">
        <ProgressCircle completed={taskCounts.completed} total={taskCounts.total} />
        <div className="flex-1 space-y-2">
          {visibleCategories.includes('recompra') && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#64748B]">Recompras</span>
              <span className="text-[13px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{taskCounts.recompra}</span>
            </div>
          )}
          {visibleCategories.includes('reactivacion') && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#64748B]">Reactivación</span>
              <span className="text-[13px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{taskCounts.reactivacion}</span>
            </div>
          )}
          {visibleCategories.includes('seguimiento') && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#64748B]">Seguimiento</span>
              <span className="text-[13px] font-bold text-[#004AFE] bg-blue-50 px-2 py-0.5 rounded-full">{taskCounts.seguimiento}</span>
            </div>
          )}
          {visibleCategories.length === 0 && (
            <p className="text-[13px] text-[#94A3B8]">Sin tareas</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-center gap-3 mb-5">
        {/* Time Filter */}
        <button
          onClick={() => setShowTimeSheet(true)}
          className="flex items-center gap-2 px-4 h-10 bg-[#EEF0F3] rounded-full text-[14px] font-medium text-[#0F172A] hover:bg-[#E5E7EB] transition-colors"
        >
          <span>{timeLabels[timeFilter]}</span>
          <ChevronDown className="w-4 h-4 text-[#64748B]" />
        </button>

        {/* Category Filter */}
        <button
          onClick={() => setShowCategorySheet(true)}
          className="flex items-center gap-2 px-4 h-10 bg-[#EEF0F3] rounded-full text-[14px] font-medium text-[#0F172A] hover:bg-[#E5E7EB] transition-colors"
        >
          <span>{categoryLabels[categoryFilter]}</span>
          <ChevronDown className="w-4 h-4 text-[#64748B]" />
        </button>

        {/* Area Filter */}
        <button
          onClick={() => setShowAreaSheet(true)}
          className="flex items-center gap-2 px-4 h-10 bg-[#EEF0F3] rounded-full text-[14px] font-medium text-[#0F172A] hover:bg-[#E5E7EB] transition-colors"
        >
          <span>{areaLabels[areaFilter]}</span>
          <ChevronDown className="w-4 h-4 text-[#64748B]" />
        </button>
      </div>

      {/* Time Filter Sheet */}
      <TimeFilterSheet
        isOpen={showTimeSheet}
        onClose={() => setShowTimeSheet(false)}
        selectedTime={timeFilter}
        onSelect={setTimeFilter}
      />

      {/* Category Filter Sheet */}
      <CategoryFilterSheet
        isOpen={showCategorySheet}
        onClose={() => setShowCategorySheet(false)}
        selectedCategory={categoryFilter}
        onSelect={setCategoryFilter}
      />

      {/* Area Filter Sheet */}
      <AreaFilterSheet
        isOpen={showAreaSheet}
        onClose={() => setShowAreaSheet(false)}
        selectedArea={areaFilter}
        onSelect={setAreaFilter}
      />

      {/* Task List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              contact={getContact(task.contact_id)}
              product={getProduct(task.product_id)}
              onComplete={(taskId, completed) => completeMutation.mutate({ taskId, completed })}
              onWhatsApp={handleWhatsApp}
            />
          ))}
        </AnimatePresence>
        
        {filteredTasks.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#64748B] text-[15px]">No hay tareas para mostrar</p>
          </div>
        )}
      </div>
    </div>
  );
}