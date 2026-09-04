import { useMemo } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, CircleHelp, Lock, TrendingUp } from 'lucide-react';
import { FAST_START_STAGES, formatBonus } from './bonusTable';
import { calculateFastStartProgress, countActivePremierClients } from './partnerEngine';

function StatusBadge({ status }) {
  const config = {
    completado: { label: 'Completado', className: 'bg-emerald-100 text-emerald-800', Icon: CheckCircle2 },
    en_progreso: { label: 'En progreso', className: 'bg-primary/10 text-primary', Icon: TrendingUp },
    bloqueado: { label: 'Pendiente', className: 'bg-slate-100 text-slate-600', Icon: Lock },
    en_riesgo: { label: 'En riesgo', className: 'bg-amber-100 text-amber-900', Icon: AlertTriangle },
    sin_datos: { label: 'Sin datos', className: 'bg-amber-100 text-amber-900', Icon: CircleHelp },
  }[status] || { label: status, className: 'bg-slate-100 text-slate-600', Icon: CircleHelp };

  return (
    <span className={`inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 py-1 text-[15px] font-semibold ${config.className}`}>
      <config.Icon className="h-4 w-4" aria-hidden="true" />
      {config.label}
    </span>
  );
}

function ProgressBar({ current, target, status }) {
  const percentage = Math.min(100, Math.round((current / target) * 100));
  const color = status === 'completado' ? 'bg-emerald-600' : status === 'en_riesgo' ? 'bg-amber-600' : 'bg-primary';

  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={`${current} de ${target}`} aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(current, target)}>
      <div className={`h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none ${color}`} style={{ width: `${percentage}%` }} />
    </div>
  );
}

function StageCard({ stageKey, stage, currency, detail }) {
  const config = FAST_START_STAGES[stageKey];
  const showProgress = !['bloqueado', 'sin_datos'].includes(stage.status);

  return (
    <article className={`rounded-2xl border-2 bg-card p-4 ${stage.status === 'completado' ? 'border-emerald-500' : stage.status === 'sin_datos' ? 'border-amber-300' : 'border-border'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-muted-foreground">{config.subtitle}</p>
          <h3 className="mt-0.5 text-[17px] font-bold text-foreground">{config.label}</h3>
        </div>
        <StatusBadge status={stage.status} />
      </div>

      <p className="mt-3 text-[22px] font-bold tracking-tight text-primary">{formatBonus(stageKey, currency)}</p>
      <p className="mt-1 text-[15px] text-muted-foreground">{config.goal}</p>

      {showProgress && (
        <div className="mt-3">
          <ProgressBar current={stage.current} target={stage.target} status={stage.status} />
          <p className="mt-2 text-[15px] font-bold text-foreground">{stage.current} de {stage.target}</p>
        </div>
      )}

      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{detail}</p>
    </article>
  );
}

function startDateLabel(value) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-419', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export default function FastStartDashboard({
  partners = [],
  sales = [],
  products = [],
  currency = 'MXN',
  startDate = null,
  directBranchMetrics = [],
  metricsLoading = false,
  metricsError = false,
  onEditStartDate,
}) {
  const progress = useMemo(() => calculateFastStartProgress({
    premierClients: countActivePremierClients(sales, products),
    directPartners: partners.length,
    directBranches: directBranchMetrics,
    startDate,
  }), [directBranchMetrics, partners.length, products, sales, startDate]);

  const { stages, timeline } = progress;
  const globalStatus = !timeline
    ? 'Fecha pendiente'
    : progress.completed
      ? 'Completado'
      : timeline.expired
        ? 'Periodo concluido'
        : 'Activo';
  const formattedStartDate = startDateLabel(startDate);

  const branchDetail = !stages.fs_nivel1.completed
    ? 'Primero completa Q-Team y registra 2 partners directos.'
    : stages.fs_nivel2.completed
      ? 'Dos ramas directas tienen Q-Team verificado.'
      : metricsLoading
        ? 'Estamos verificando el avance de tus ramas directas.'
        : metricsError
          ? 'No pudimos verificar tus ramas. Intenta de nuevo más tarde.'
          : progress.unknownBranches > 0
            ? `${progress.qteamBranches} de 2 ramas verificadas. Vincula a tus partners para consultar su avance real.`
            : `Te ${2 - progress.qteamBranches === 1 ? 'falta 1 rama' : `faltan ${Math.max(0, 2 - progress.qteamBranches)} ramas`} con Q-Team.`;

  return (
    <div className="mb-6">
      <section className="mb-4 rounded-3xl bg-gradient-to-br from-primary to-[#0039CC] p-5 text-white" aria-labelledby="fast-start-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="fast-start-heading" className="text-xl font-bold">Fast Start</h2>
          <span className="rounded-full bg-white/20 px-3 py-1 text-[15px] font-semibold">{globalStatus}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            [timeline ? `Día ${Math.min(timeline.daysElapsed, 120)}` : '—', 'de 120'],
            [timeline ? timeline.daysRemaining : '—', 'días restantes'],
            [progress.premierClients, 'clientes Premier'],
            [progress.directPartners, progress.directPartners === 1 ? 'partner directo' : 'partners directos'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-white/15 px-3 py-2.5">
              <p className="text-[22px] font-bold leading-tight">{value}</p>
              <p className="mt-0.5 text-[15px] leading-tight text-blue-100">{label}</p>
            </div>
          ))}
        </div>

        {!timeline && (
          <p className="mt-3 rounded-2xl bg-white/15 px-3 py-2.5 text-[15px] leading-relaxed text-blue-50">
            Falta configurar tu fecha de inicio para mostrar los días y vencimientos.
          </p>
        )}

        <button
          type="button"
          onClick={onEditStartDate}
          className="mt-3 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 text-left text-[15px] font-semibold text-primary transition-transform active:scale-[0.98]"
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarDays className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="truncate">{formattedStartDate ? `Inicio: ${formattedStartDate}` : 'Configurar fecha de inicio'}</span>
          </span>
          <span className="shrink-0">{formattedStartDate ? 'Cambiar' : 'Elegir'}</span>
        </button>
      </section>

      <div className="space-y-3">
        <StageCard
          stageKey="qteam"
          stage={stages.qteam}
          currency={currency}
          detail={stages.qteam.completed ? 'Meta registrada con tus clientes activos.' : `Te ${4 - stages.qteam.current === 1 ? 'falta 1 cliente Premier' : `faltan ${Math.max(0, 4 - stages.qteam.current)} clientes Premier`}.`}
        />
        <StageCard
          stageKey="fs_nivel1"
          stage={stages.fs_nivel1}
          currency={currency}
          detail={!stages.qteam.completed ? 'Primero completa Q-Team.' : stages.fs_nivel1.completed ? 'Meta registrada con tu equipo directo.' : `Te ${2 - stages.fs_nivel1.current === 1 ? 'falta 1 partner directo' : `faltan ${Math.max(0, 2 - stages.fs_nivel1.current)} partners directos`}.`}
        />
        <StageCard stageKey="fs_nivel2" stage={stages.fs_nivel2} currency={currency} detail={branchDetail} />
        <StageCard
          stageKey="xteam"
          stage={stages.xteam}
          currency={currency}
          detail={!stages.fs_nivel1.completed ? 'Primero completa el Nivel 1.' : stages.xteam.completed ? 'Meta registrada con tus clientes activos.' : `Te faltan ${Math.max(0, 10 - stages.xteam.current)} clientes Premier.`}
        />
      </div>
    </div>
  );
}
