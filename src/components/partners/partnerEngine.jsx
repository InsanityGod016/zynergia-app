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
 * @param {{qteamKits?: number, xteamKits?: number, premierClients?: number, directPartners?: number, directBranches?: Array<{qteamKits?: number|null, qteam_kits?: number|null, premierClients?: number|null, premier_clients?: number|null}>, startDate?: string|null, now?: Date}} metrics
 */
export function calculateFastStartProgress({
  qteamKits,
  xteamKits,
  premierClients = 0,
  directPartners = 0,
  directBranches = [],
  startDate = null,
  now = new Date(),
} = {}) {
  const qteam = Math.max(0, Number(qteamKits ?? premierClients) || 0);
  const xteam = Math.max(0, Number(xteamKits ?? qteamKits ?? premierClients) || 0);
  const partners = Math.max(0, Number(directPartners) || 0);
  const branches = Array.isArray(directBranches) ? directBranches : [];
  const branchKits = branch => branch?.qteamKits ?? branch?.qteam_kits ?? branch?.premierClients ?? branch?.premier_clients;
  const knownBranches = branches.filter(branch => Number.isFinite(branchKits(branch)));
  const qteamBranches = knownBranches.filter(branch => Number(branchKits(branch)) >= 4).length;
  const unknownBranches = Math.max(0, partners - knownBranches.length);

  const qteamCompleted = qteam >= 4;
  const fs1Completed = qteamCompleted && partners >= 2;
  const fs2Completed = fs1Completed && qteamBranches >= 2;
  const missingDataCouldCompleteFs2 = qteamBranches < 2 && qteamBranches + unknownBranches >= 2;
  const xteamCompleted = xteam >= 10;

  const qteamStatus = qteamCompleted ? 'completado' : 'en_progreso';
  const fs1Status = !qteamCompleted ? 'bloqueado' : fs1Completed ? 'completado' : 'en_progreso';
  const fs2Status = !fs1Completed
    ? 'bloqueado'
    : fs2Completed
      ? 'completado'
      : missingDataCouldCompleteFs2
        ? 'sin_datos'
        : 'en_progreso';
  const xteamStatus = xteamCompleted ? 'completado' : 'en_progreso';
  const timeline = calculateFastStartTimeline(startDate, now);

  return {
    qteamKits: qteam,
    xteamKits: xteam,
    premierClients: qteam,
    directPartners: partners,
    knownBranches: knownBranches.length,
    unknownBranches,
    qteamBranches,
    timeline,
    completed: qteamCompleted && fs1Completed && fs2Completed && xteamCompleted,
    stages: {
      qteam: { completed: qteamCompleted, status: qteamStatus, current: qteam, target: 4 },
      fs_nivel1: { completed: fs1Completed, status: fs1Status, current: partners, target: 2 },
      fs_nivel2: { completed: fs2Completed, status: fs2Status, current: qteamBranches, target: 2 },
      xteam: { completed: xteamCompleted, status: xteamStatus, current: xteam, target: 10 },
    },
  };
}
