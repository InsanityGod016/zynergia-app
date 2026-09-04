import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const stateCopy = {
  loading: {
    icon: LoaderCircle,
    title: 'Cargando',
    description: 'Un momento, por favor.',
  },
  error: {
    icon: AlertCircle,
    title: 'No pudimos cargar esta información',
    description: 'Revisa tu conexión e inténtalo de nuevo.',
  },
  empty: {
    icon: Inbox,
    title: 'Nada por aquí',
    description: 'Cuando haya información, aparecerá en este espacio.',
  },
};

export default function StateView(/** @type {any} */ {
  state = 'empty',
  title = undefined,
  description = undefined,
  actionLabel = undefined,
  onAction = undefined,
}) {
  const copy = stateCopy[state] || stateCopy.empty;
  const Icon = copy.icon;

  return (
    <div
      className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card px-6 py-10 text-center"
      role={state === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className={`h-6 w-6 ${state === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true" />
      </span>
      <h2 className="text-lg font-bold text-foreground">{title || copy.title}</h2>
      <p className="mt-1 max-w-xs text-base leading-relaxed text-muted-foreground">
        {description || copy.description}
      </p>
      {actionLabel && onAction && (
        <Button type="button" variant="outline" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
