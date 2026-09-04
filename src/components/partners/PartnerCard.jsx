import { ChevronRight, Smartphone } from 'lucide-react';
import { calculateFastStartProgress } from './partnerEngine';

function progressText(progress) {
  if (!progress.stages.qteam.completed) {
    return `Q-Team · ${progress.stages.qteam.current} de 4 clientes`;
  }
  if (!progress.stages.fs_nivel1.completed) {
    return `Nivel 1 · ${progress.stages.fs_nivel1.current} de 2 partners`;
  }
  if (!progress.stages.fs_nivel2.completed) {
    return progress.stages.fs_nivel2.status === 'sin_datos'
      ? 'Nivel 2 · Falta verificar sus ramas'
      : `Nivel 2 · ${progress.stages.fs_nivel2.current} de 2 ramas`;
  }
  if (!progress.stages.xteam.completed) {
    return `X-Team · ${progress.stages.xteam.current} de 10 clientes`;
  }
  return 'Fast Start completado';
}

export default function PartnerCard({
  partner,
  contact,
  activityStatus,
  fastStartMetrics,
  metricsLoading,
  metricsError,
  onClick,
}) {
  const hasApp = Boolean(partner.partner_user_id);
  const isInactive = activityStatus === 'inactivo';
  const hasMetrics = hasApp && Number.isFinite(fastStartMetrics?.premier_clients) && Number.isFinite(fastStartMetrics?.partners_count);
  const progress = hasMetrics ? calculateFastStartProgress({
    premierClients: fastStartMetrics.premier_clients,
    directPartners: fastStartMetrics.partners_count,
    directBranches: Array.isArray(fastStartMetrics.direct_branches)
      ? fastStartMetrics.direct_branches.map(branch => ({ premierClients: Number.isFinite(branch?.premier_clients) ? branch.premier_clients : null }))
      : [],
    startDate: fastStartMetrics.fast_start_started_at || null,
  }) : null;

  const connectionLabel = !hasApp ? 'No vinculado' : isInactive ? 'Inactivo' : 'Activo en app';
  const connectionClass = !hasApp
    ? 'bg-slate-100 text-slate-700'
    : isInactive
      ? 'bg-red-100 text-red-800'
      : 'bg-primary/10 text-primary';
  const detail = !hasApp
    ? 'Vincúlalo para ver su avance real.'
    : metricsLoading
      ? 'Consultando su progreso…'
      : metricsError
        ? 'No pudimos cargar su progreso.'
        : progress
          ? progressText(progress)
          : 'Progreso no disponible.';

  return (
    <article className={`rounded-2xl border bg-card p-4 shadow-card ${isInactive ? 'border-red-300' : 'border-border'}`}>
      <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center gap-3 text-left outline-none active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[17px] font-bold text-foreground">{contact?.full_name || 'Contacto desconocido'}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[15px] font-semibold ${connectionClass}`}>
              {hasApp && <Smartphone className="h-4 w-4" aria-hidden="true" />}
              {connectionLabel}
            </span>
          </span>
          <span className="mt-2 block text-[15px] leading-relaxed text-muted-foreground">{detail}</span>
          {progress?.timeline && (
            <span className="mt-1 block text-[15px] text-muted-foreground">
              Día {Math.min(progress.timeline.daysElapsed, 120)} · {progress.timeline.daysRemaining} días restantes
            </span>
          )}
        </span>
        <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    </article>
  );
}
