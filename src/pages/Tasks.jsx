import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Filter, Plus } from 'lucide-react';
import { db } from '@/api/db';
import { createPageUrl } from '@/utils';
import MainHeader from '@/components/ui/MainHeader';
import StateView from '@/components/ui/StateView';
import TaskCard from '@/components/tasks/TaskCard';
import TaskFilterSheet from '@/components/tasks/TaskFilterSheet';
import {
  matchesTaskTime,
  TASK_REASONS,
  taskReasonValue,
  todayProgress,
} from '@/lib/taskPresentation';

const timeOptions = [
  { value: 'due', label: 'Pendientes' },
  { value: 'overdue', label: 'Atrasadas' },
  { value: 'today', label: 'Hoy' },
  { value: 'upcoming', label: 'Próximas' },
  { value: 'completed', label: 'Hechas' },
];

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Tasks() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightedTaskId = searchParams.get('taskId');
  const [timeFilter, setTimeFilter] = useState('due');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [contactFilter, setContactFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({ queryKey: ['tasks'], queryFn: () => db.Task.list() });
  const contactsQuery = useQuery({ queryKey: ['contacts'], queryFn: () => db.Contact.list() });
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => db.Product.list() });
  const tasks = tasksQuery.data ?? [];
  const contacts = contactsQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const today = localDateString();
  const isLoading = tasksQuery.isLoading || contactsQuery.isLoading || productsQuery.isLoading;
  const loadError = tasksQuery.error || contactsQuery.error || productsQuery.error;

  const completeMutation = useMutation({
    mutationFn: (/** @type {{ taskId: string, completed: boolean }} */ { taskId, completed }) => db.Task.update(taskId, { completed: !completed }),
    onMutate: async (/** @type {{ taskId: string, completed: boolean }} */ { taskId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = /** @type {any[] | undefined} */ (queryClient.getQueryData(['tasks']));
      queryClient.setQueryData(['tasks'], (/** @type {any[] | undefined} */ current = []) => current.map(task => (
        task.id === taskId ? { ...task, completed: !completed } : task
      )));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(['tasks'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const getContact = contactId => contacts.find(contact => contact.id === contactId);
  const getProduct = productId => products.find(product => product.id === productId);

  const filteredTasks = useMemo(() => tasks
    .filter(task => matchesTaskTime(task, timeFilter, today))
    .filter(task => reasonFilter === 'all' || taskReasonValue(task) === reasonFilter)
    .filter(task => contactFilter === 'all' || task.contact_id === contactFilter)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return String(a.due_date || '').localeCompare(String(b.due_date || ''));
    }), [contactFilter, reasonFilter, tasks, timeFilter, today]);

  useEffect(() => {
    if (!highlightedTaskId || isLoading) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`task-${highlightedTaskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [highlightedTaskId, isLoading, filteredTasks]);

  const progress = useMemo(() => todayProgress(tasks, today), [tasks, today]);
  const percentage = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;

  const taskGroups = useMemo(() => {
    if (timeFilter === 'completed') return [{ key: 'completed', title: 'Hechas', tasks: filteredTasks }];
    return [
      { key: 'overdue', title: 'Atrasadas', tasks: filteredTasks.filter(task => task.due_date < today) },
      { key: 'today', title: 'Hoy', tasks: filteredTasks.filter(task => task.due_date === today) },
      { key: 'upcoming', title: 'Próximas', tasks: filteredTasks.filter(task => task.due_date > today) },
    ].filter(group => group.tasks.length);
  }, [filteredTasks, timeFilter, today]);

  const contactOptions = useMemo(() => [
    { value: 'all', label: 'Todos los contactos' },
    ...contacts
      .filter(contact => contact.id && contact.full_name)
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'es'))
      .map(contact => ({ value: contact.id, label: contact.full_name })),
  ], [contacts]);

  const activeFilterCount = Number(reasonFilter !== 'all') + Number(contactFilter !== 'all');
  const retry = () => Promise.all([tasksQuery.refetch(), contactsQuery.refetch(), productsQuery.refetch()]);
  const clearFilters = () => {
    setReasonFilter('all');
    setContactFilter('all');
  };

  return (
    <div className="px-4 pb-32 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-5">
      <MainHeader title="Hoy" />

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card" aria-labelledby="today-progress-title">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="today-progress-title" className="text-[17px] font-bold text-foreground">
              {progress.completed} de {progress.total} tareas de hoy
            </h2>
            <p className="mt-1 text-[15px] text-muted-foreground">
              {progress.total === 0 ? 'No tienes tareas programadas para hoy.' : percentage === 100 ? 'Terminaste todo lo de hoy.' : 'Avanza una tarea a la vez.'}
            </p>
          </div>
          <span className="shrink-0 text-[17px] font-bold text-primary">{percentage}%</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${percentage}%` }} />
        </div>
      </section>

      <section className="mt-6" aria-labelledby="tasks-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="tasks-title" className="text-2xl font-bold tracking-tight text-foreground">Tus tareas</h2>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="relative flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-3 text-[15px] font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Filter className="h-5 w-5" aria-hidden="true" />
            Filtrar
            {activeFilterCount > 0 && <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1 text-[15px] font-bold text-primary-foreground">{activeFilterCount}</span>}
          </button>
        </div>

        <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Estado de las tareas">
          <div className="flex w-max gap-2">
            {timeOptions.map(option => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={timeFilter === option.value}
                onClick={() => setTimeFilter(option.value)}
                className={`min-h-12 shrink-0 rounded-full px-4 text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  timeFilter === option.value ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {completeMutation.isError && (
          <div className="mt-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-[15px] text-destructive" role="alert">
            No pudimos guardar. Tus datos siguen aquí. Intenta de nuevo.
          </div>
        )}

        <div className="mt-4">
          {isLoading ? (
            <StateView state="loading" title="Preparando tu día" description="Estamos reuniendo tus tareas y contactos." />
          ) : loadError ? (
            <StateView state="error" actionLabel="Intentar de nuevo" onAction={retry} />
          ) : filteredTasks.length === 0 ? (
            <StateView
              state="empty"
              title={activeFilterCount ? 'No hay coincidencias' : 'No hay tareas aquí'}
              description={activeFilterCount ? 'Prueba con otro contacto o motivo.' : 'Cambia de categoría o crea una tarea nueva.'}
              actionLabel={activeFilterCount ? 'Limpiar filtros' : 'Crear tarea'}
              onAction={activeFilterCount ? clearFilters : () => navigate(createPageUrl('NewTask'))}
            />
          ) : (
            <div className="space-y-6">
              {taskGroups.map(group => (
                <section key={group.key} aria-labelledby={`task-group-${group.key}`}>
                  <div className="mb-2 flex items-center justify-between gap-3 px-1">
                    <h3 id={`task-group-${group.key}`} className={`text-[17px] font-bold ${group.key === 'overdue' ? 'text-amber-900' : 'text-foreground'}`}>
                      {group.title}
                    </h3>
                    <span className="text-[15px] font-semibold text-muted-foreground">{group.tasks.length}</span>
                  </div>
                  <div className="space-y-3">
                    {group.tasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        contact={getContact(task.contact_id)}
                        product={getProduct(task.product_id)}
                        onComplete={(taskId, completed) => completeMutation.mutate({ taskId, completed })}
                        isUpdating={completeMutation.isPending && completeMutation.variables?.taskId === task.id}
                        highlighted={String(task.id) === String(highlightedTaskId)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>

      <TaskFilterSheet
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtrar tareas"
        description="Elige un motivo o una persona. Puedes usar ambos."
        sections={[
          { key: 'reason', label: 'Motivo', options: TASK_REASONS, selected: reasonFilter, onSelect: setReasonFilter },
          { key: 'contact', label: 'Contacto', options: contactOptions, selected: contactFilter, onSelect: setContactFilter },
        ]}
        onClear={clearFilters}
      />

      <Link
        to={createPageUrl('NewTask')}
        className="fixed bottom-24 right-5 z-30 flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#004AFE] px-5 text-[16px] font-bold text-white shadow-lg outline-none transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Crear una tarea nueva"
      >
        <Plus className="h-6 w-6" aria-hidden="true" /> Nueva tarea
      </Link>
    </div>
  );
}
