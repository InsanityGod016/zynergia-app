const reasonByArea = {
  producto: 'Seguimiento de producto',
  prospecto_producto: 'Prospecto de producto',
  prospecto_partner: 'Prospecto de negocio',
  partner: 'Partner / Fast Start',
  referidos: 'Referidos',
  manual: 'Manual',
};

export const TASK_REASONS = [
  { value: 'all', label: 'Todos los motivos' },
  { value: 'recompra', label: 'Recompra' },
  { value: 'producto', label: 'Seguimiento de producto' },
  { value: 'prospecto_producto', label: 'Prospecto de producto' },
  { value: 'prospecto_partner', label: 'Prospecto de negocio' },
  { value: 'partner', label: 'Partner / Fast Start' },
  { value: 'referidos', label: 'Referidos' },
  { value: 'manual', label: 'Manual' },
];

export function taskReasonValue(task) {
  if (task?.category === 'recompra') return 'recompra';
  return task?.task_area || 'manual';
}

export function taskReasonLabel(task) {
  if (task?.category === 'recompra') return 'Recompra';
  return reasonByArea[taskReasonValue(task)] || 'Seguimiento';
}

export function taskDetail(task, product) {
  if (product?.name) return product.name;
  const name = String(task?.task_name || '').trim();
  if (!name) return '';
  return name
    .replace(/^Fast Start\s*[–—-]\s*/i, '')
    .replace(/^Prospecto (Producto|Partner)\s*[–—-]\s*/i, '');
}

export function taskTimeLabel(task, today) {
  const date = task?.due_date;
  if (!date) return 'Sin fecha';
  const prefix = date < today ? 'Atrasada' : date === today ? 'Hoy' : formatDate(date);
  return task?.due_time ? `${prefix} · ${String(task.due_time).slice(0, 5)}` : prefix;
}

export function formatDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-419', { day: 'numeric', month: 'short' })
    .format(new Date(year, month - 1, day));
}

export function matchesTaskTime(task, filter, today) {
  if (!task?.due_date) return false;
  if (filter === 'completed') return Boolean(task.completed);
  if (task.completed) return false;
  if (filter === 'overdue') return task.due_date < today;
  if (filter === 'today') return task.due_date === today;
  if (filter === 'upcoming') return task.due_date > today;
  return true;
}

export function todayProgress(tasks, today) {
  const todaysTasks = tasks.filter(task => task.due_date === today);
  return {
    completed: todaysTasks.filter(task => task.completed).length,
    total: todaysTasks.length,
  };
}
