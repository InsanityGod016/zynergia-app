import { db } from '@/api/db';

const DAY_MS = 86400000;

function localDate(value) {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null;
}

export function countActivePremierClients(sales = [], products = []) {
  const premierProductIds = new Set(
    products.filter(product => product.category === 'Premier Kits').map(product => product.id),
  );

  return new Set(
    sales
      .filter(sale => sale.status !== 'cancelled' && premierProductIds.has(sale.product_id) && sale.contact_id)
      .map(sale => sale.contact_id),
  ).size;
}

export function calculateFastStartTimeline(startDate, now = new Date()) {
  const start = localDate(startDate);
  const current = localDate(now);
  if (!start || !current) return null;

  const daysElapsed = Math.max(0, Math.floor((current.getTime() - start.getTime()) / DAY_MS));
  return {
    daysElapsed,
    daysRemaining: Math.max(0, 120 - daysElapsed),
    expired: daysElapsed > 120,
  };
}

/**
 * Calculates Fast Start only from explicit metrics. A missing branch metric is
 * unknown, not zero: it can never complete or fake progress for an unlinked user.
 */
export function calculateFastStartProgress({
  premierClients = 0,
  directPartners = 0,
  directBranches = [],
  startDate = null,
  now = new Date(),
} = {}) {
  const clients = Math.max(0, Number(premierClients) || 0);
  const partners = Math.max(0, Number(directPartners) || 0);
  const branches = Array.isArray(directBranches) ? directBranches : [];
  const knownBranches = branches.filter(branch => Number.isFinite(branch?.premierClients));
  const qteamBranches = knownBranches.filter(branch => branch.premierClients >= 4).length;
  const unknownBranches = Math.max(0, partners - knownBranches.length);

  const qteamCompleted = clients >= 4;
  const fs1Completed = qteamCompleted && partners >= 2;
  const fs2Completed = fs1Completed && qteamBranches >= 2;
  const missingDataCouldCompleteFs2 = qteamBranches < 2 && qteamBranches + unknownBranches >= 2;
  const xteamCompleted = clients >= 10;

  const qteamStatus = qteamCompleted ? 'completado' : 'en_progreso';
  const fs1Status = !qteamCompleted ? 'bloqueado' : fs1Completed ? 'completado' : 'en_progreso';
  const fs2Status = !fs1Completed
    ? 'bloqueado'
    : fs2Completed
      ? 'completado'
      : missingDataCouldCompleteFs2
        ? 'sin_datos'
        : 'en_progreso';
  const xteamStatus = !fs1Completed ? 'bloqueado' : xteamCompleted ? 'completado' : 'en_progreso';
  const timeline = calculateFastStartTimeline(startDate, now);

  return {
    premierClients: clients,
    directPartners: partners,
    knownBranches: knownBranches.length,
    unknownBranches,
    qteamBranches,
    timeline,
    completed: qteamCompleted && fs1Completed && fs2Completed && xteamCompleted,
    stages: {
      qteam: { completed: qteamCompleted, status: qteamStatus, current: clients, target: 4 },
      fs_nivel1: { completed: fs1Completed, status: fs1Status, current: partners, target: 2 },
      fs_nivel2: { completed: fs2Completed, status: fs2Status, current: qteamBranches, target: 2 },
      xteam: { completed: xteamCompleted, status: xteamStatus, current: clients, target: 10 },
    },
  };
}

/**
 * Legacy entry point kept for sale registration. It updates only linked
 * partners with an authoritative metrics row supplied by the caller.
 */
export async function recalculateAllPartners(_sales, partners = [], _products, authoritativeMetrics = []) {
  const metricsByUser = new Map(authoritativeMetrics.map(metric => [metric.user_id, metric]));
  const applied = [];

  for (const partner of partners) {
    if (!partner.partner_user_id) continue;
    const metric = metricsByUser.get(partner.partner_user_id);
    if (!metric || !Number.isFinite(metric.premier_clients) || !Number.isFinite(metric.partners_count)) continue;

    const branches = Array.isArray(metric.direct_branches)
      ? metric.direct_branches.map(branch => ({ premierClients: Number.isFinite(branch?.premier_clients) ? branch.premier_clients : null }))
      : [];
    const progress = calculateFastStartProgress({
      premierClients: metric.premier_clients,
      directPartners: metric.partners_count,
      directBranches: branches,
      startDate: metric.fast_start_started_at || partner.start_date,
    });
    const updates = {
      qteam_completed: progress.stages.qteam.completed,
      fs_level1_completed: progress.stages.fs_nivel1.completed,
      xteam_completed: progress.stages.xteam.completed,
    };

    if (Array.isArray(metric.direct_branches)) {
      updates.fs_level2_completed = progress.stages.fs_nivel2.completed;
    }

    const changed = Object.fromEntries(
      Object.entries(updates).filter(([key, value]) => partner[key] !== value),
    );
    if (Object.keys(changed).length === 0) continue;
    await db.Partner.update(partner.id, changed);
    applied.push({ id: partner.id, updates: changed });
  }

  return applied;
}
