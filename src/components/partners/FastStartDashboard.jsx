import { useMemo } from 'react';
import { CheckCircle2, Lock, AlertTriangle, TrendingUp } from 'lucide-react';
import { BONUS_TABLE, formatBonus } from './bonusTable';

function ProgressBar({ value, max, color = '#004AFE' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    completado: { label: 'Completado', bg: '#D1FAE5', color: '#065F46', icon: CheckCircle2 },
    en_progreso: { label: 'En progreso', bg: '#EEF2FF', color: '#004AFE', icon: TrendingUp },
    bloqueado: { label: 'Bloqueado', bg: '#F1F5F9', color: '#94A3B8', icon: Lock },
    en_riesgo: { label: 'En riesgo', bg: '#FEF3C7', color: '#92400E', icon: AlertTriangle },
  }[status] || { label: status, bg: '#F1F5F9', color: '#64748B', icon: null };

  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {cfg.label}
    </span>
  );
}

function BonusCard({ bonusKey, currency, status, current, target, motivationalText }) {
  const isBlocked = status === 'bloqueado';
  const isCompleted = status === 'completado';
  const barColor = isCompleted ? '#22C55E' : status === 'en_riesgo' ? '#F59E0B' : '#004AFE';

  return (
    <div className={`rounded-2xl border-2 p-4 ${isBlocked ? 'border-[#E2E8F0] opacity-60' : isCompleted ? 'border-[#22C55E]' : 'border-[#E2E8F0]'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[12px] text-[#64748B] font-medium">{BONUS_TABLE[bonusKey].subtitle}</p>
          <p className="text-[15px] font-bold text-[#0F172A] mt-0.5">{BONUS_TABLE[bonusKey].label}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <p className="text-[22px] font-bold text-[#004AFE] mb-3">{formatBonus(bonusKey, currency)}</p>

      {!isBlocked && (
        <>
          <ProgressBar value={current} max={target} color={barColor} />
          <div className="flex justify-between mt-1.5">
            <p className="text-[12px] text-[#64748B]">{current} / {target}</p>
          </div>
        </>
      )}

      {motivationalText && (
        <p className="text-[12px] text-[#64748B] mt-2 italic">{motivationalText}</p>
      )}
    </div>
  );
}

export default function FastStartDashboard({ partners, sales, products, currency }) {
  const cur = currency || 'MXN';

  const metrics = useMemo(() => {
    // Count active premier kit clients
    const premierKitProductIds = new Set(
      products
        .filter(p => p.category === 'Premier Kits')
        .map(p => p.id)
    );
    const activePremierClients = new Set(
      sales
        .filter(s => s.status !== 'cancelled' && premierKitProductIds.has(s.product_id))
        .map(s => s.contact_id)
    ).size;

    const partnersCount = partners.length;

    // Global fast start dates — based on oldest partner
    let startDateGlobal = null;
    let deadlineGlobal = null;
    let daysElapsed = 0;
    let daysRemaining = 0;

    if (partners.length > 0) {
      const sorted = [...partners].sort((a, b) => a.start_date.localeCompare(b.start_date));
      startDateGlobal = sorted[0].start_date;
      const start = new Date(startDateGlobal);
      const deadline = new Date(start);
      deadline.setDate(deadline.getDate() + 120);
      deadlineGlobal = deadline.toISOString().split('T')[0];

      const today = new Date();
      daysElapsed = Math.max(0, Math.floor((today - start) / 86400000));
      daysRemaining = Math.max(0, Math.floor((deadline - today) / 86400000));
    }

    return { activePremierClients, partnersCount, startDateGlobal, deadlineGlobal, daysElapsed, daysRemaining };
  }, [partners, sales, products]);

  // Determine bono statuses
  const qteamCompleted = metrics.activePremierClients >= 4;
  const fs1Completed = qteamCompleted && metrics.partnersCount >= 2;
  const xteamCompleted = qteamCompleted && metrics.activePremierClients >= 10;

  const today = new Date().toISOString().split('T')[0];
  const isExpired = metrics.deadlineGlobal && today > metrics.deadlineGlobal;

  let globalStatus = 'no_iniciado';
  if (partners.length > 0) {
    if (isExpired && !fs1Completed) globalStatus = 'vencido';
    else if (fs1Completed && xteamCompleted) globalStatus = 'completado';
    else globalStatus = 'activo';
  }

  const qteamStatus = metrics.activePremierClients >= 4
    ? 'completado'
    : metrics.activePremierClients > 0
    ? 'en_progreso'
    : 'en_progreso';

  const fs1Status = !qteamCompleted ? 'bloqueado'
    : metrics.partnersCount >= 2 ? 'completado'
    : 'en_progreso';

  const fs2Status = !fs1Completed ? 'bloqueado' : 'en_progreso';

  const xteamStatus = !fs1Completed ? 'bloqueado'
    : metrics.activePremierClients >= 10 ? 'completado'
    : metrics.activePremierClients >= 4 ? 'en_progreso'
    : 'bloqueado';

  const qteamMotivational = metrics.activePremierClients >= 4
    ? '¡Bono desbloqueado!'
    : `Te ${4 - metrics.activePremierClients === 1 ? 'falta 1 cliente' : `faltan ${4 - metrics.activePremierClients} clientes`} para cobrar ${formatBonus('qteam', cur)}`;

  const fs1Motivational = !qteamCompleted
    ? 'Completa Q-Team primero'
    : metrics.partnersCount >= 2
    ? '¡Bono desbloqueado!'
    : `Te ${2 - metrics.partnersCount === 1 ? 'falta 1 partner' : `faltan ${2 - metrics.partnersCount} partners`} para cobrar ${formatBonus('fs_nivel1', cur)}`;

  const xteamMotivational = !fs1Completed
    ? 'Completa Nivel 1 primero'
    : metrics.activePremierClients >= 10
    ? '¡Bono desbloqueado!'
    : `Te faltan ${10 - metrics.activePremierClients} clientes para cobrar ${formatBonus('xteam', cur)}`;

  const globalStatusLabel = {
    activo: { text: 'Activo', color: '#004AFE' },
    completado: { text: '¡Completado!', color: '#22C55E' },
    vencido: { text: 'Vencido', color: '#EF4444' },
    no_iniciado: { text: 'No iniciado', color: '#94A3B8' },
  }[globalStatus] || { text: '', color: '#64748B' };

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[#004AFE] to-[#0039CC] p-5 mb-4 text-white">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[18px] font-bold">Fast Start (120 días)</p>
          <span
            className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            {globalStatusLabel.text}
          </span>
        </div>
        {globalStatus === 'no_iniciado' ? (
          <p className="text-[13px] opacity-70 mt-2">Agrega tu primer partner para iniciar el conteo de 120 días</p>
        ) : (
          <div className="flex gap-4 mt-3">
            <div>
              <p className="text-[11px] opacity-70">Días transcurridos</p>
              <p className="text-[20px] font-bold">{metrics.daysElapsed}</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-[11px] opacity-70">Días restantes</p>
              <p className={`text-[20px] font-bold ${metrics.daysRemaining <= 10 ? 'text-yellow-300' : ''}`}>{metrics.daysRemaining}</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-[11px] opacity-70">Clientes Premier</p>
              <p className="text-[20px] font-bold">{metrics.activePremierClients}</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-[11px] opacity-70">Partners</p>
              <p className="text-[20px] font-bold">{metrics.partnersCount}</p>
            </div>
          </div>
        )}
      </div>

      {/* Bonus cards */}
      <div className="space-y-3">
        <BonusCard
          bonusKey="qteam"
          currency={cur}
          status={qteamStatus}
          current={metrics.activePremierClients}
          target={4}
          motivationalText={qteamMotivational}
        />
        <BonusCard
          bonusKey="fs_nivel1"
          currency={cur}
          status={fs1Status}
          current={metrics.partnersCount}
          target={2}
          motivationalText={fs1Motivational}
        />
        <BonusCard
          bonusKey="fs_nivel2"
          currency={cur}
          status={fs2Status}
          current={0}
          target={1}
          motivationalText={!fs1Completed ? 'Completa Nivel 1 primero' : 'En progreso: enfócate en duplicación'}
        />
        <BonusCard
          bonusKey="xteam"
          currency={cur}
          status={xteamStatus}
          current={metrics.activePremierClients}
          target={10}
          motivationalText={xteamMotivational}
        />
      </div>
    </div>
  );
}