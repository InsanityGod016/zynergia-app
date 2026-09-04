import { MessageCircle, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { taskDetail, taskReasonLabel, taskTimeLabel } from '@/lib/taskPresentation';

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function TaskCard({ task, contact, product, onComplete, isUpdating = false, highlighted = false }) {
  const navigate = useNavigate();
  const today = localDateString();
  const isOverdue = !task.completed && task.due_date < today;
  const detail = taskDetail(task, product);

  const handleWhatsAppClick = () => {
    navigate(createPageUrl('SelectMessageTone') + '?taskId=' + task.id);
  };

  return (
    <article id={`task-${task.id}`} className={`rounded-2xl border bg-card p-4 shadow-card ${highlighted ? 'border-primary ring-4 ring-primary/15' : isOverdue ? 'border-amber-300' : 'border-border/80'}`}>
      <div className="min-w-0">
        <h3 className={`truncate text-[17px] font-bold leading-snug ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
          {contact?.full_name || 'Contacto no disponible'}
        </h3>
        <p className="mt-1 text-[15px] font-semibold leading-snug text-primary">
          {taskReasonLabel(task)}{detail ? ` · ${detail}` : ''}
        </p>
        <p className={`mt-1 text-[15px] leading-snug ${isOverdue ? 'font-semibold text-amber-800' : 'text-muted-foreground'}`}>
          {taskTimeLabel(task, today)}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleWhatsAppClick}
          disabled={!contact}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 text-[15px] font-bold text-emerald-800 outline-none hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          WhatsApp
        </button>

        <button
          type="button"
          onClick={() => onComplete(task.id, task.completed)}
          disabled={isUpdating}
          aria-pressed={task.completed}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-muted px-3 text-[15px] font-bold text-foreground outline-none hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
        >
          <Check className="h-5 w-5 text-primary" strokeWidth={3} aria-hidden="true" />
          {task.completed ? 'Deshacer' : 'Hecha'}
        </button>
      </div>
    </article>
  );
}
