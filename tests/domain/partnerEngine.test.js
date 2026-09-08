import { describe, expect, it } from 'vitest';

const {
  calculateFastStartProgress,
  calculateFastStartTimeline,
} = await import('@/components/partners/partnerEngine.jsx');
const { BONUS_TABLE, formatBonus } = await import('@/components/partners/bonusTable.jsx');

describe('Fast Start', () => {
  it('preserves every approved amount', () => {
    expect(BONUS_TABLE.qteam).toMatchObject({ MXN: 1900, USD: 110, EUR: 100, COP: 450000, PEN: 380 });
    expect(BONUS_TABLE.fs_nivel1).toMatchObject({ MXN: 7600, USD: 430, EUR: 400, COP: 1800000, PEN: 1500 });
    expect(BONUS_TABLE.fs_nivel2).toMatchObject({ MXN: 22800, USD: 1300, EUR: 1200, COP: 5400000, PEN: 4600 });
    expect(BONUS_TABLE.xteam).toMatchObject({ MXN: 2850, USD: 160, EUR: 150, COP: 680000, PEN: 570 });
    expect(formatBonus('fs_nivel2', 'MXN')).toBe('$22,800 MXN');
  });

  it('uses separate 30-day and 120-day kit totals', () => {
    const progress = calculateFastStartProgress({
      qteamKits: 4,
      xteamKits: 9,
      directPartners: 2,
      directBranches: [{ qteamKits: 4 }, { qteamKits: 4 }],
    });
    expect(progress.stages.qteam.completed).toBe(true);
    expect(progress.stages.fs_nivel2.completed).toBe(true);
    expect(progress.stages.xteam).toMatchObject({ completed: false, current: 9 });
  });

  it('reads server branch metrics and keeps X-Team independent from Nivel 1', () => {
    const progress = calculateFastStartProgress({
      qteamKits: 3,
      xteamKits: 10,
      directPartners: 2,
      directBranches: [{ qteam_kits: 4 }, { qteam_kits: 5 }],
    });

    expect(progress.qteamBranches).toBe(2);
    expect(progress.stages.fs_nivel1.status).toBe('bloqueado');
    expect(progress.stages.xteam).toMatchObject({ completed: true, status: 'completado', current: 10 });
  });

  it('completes Level 2 only from two real direct branches that completed Q-Team', () => {
    const progress = calculateFastStartProgress({
      premierClients: 6,
      directPartners: 2,
      directBranches: [{ premierClients: 4 }, { premierClients: 7 }],
    });

    expect(progress.stages.qteam.completed).toBe(true);
    expect(progress.stages.fs_nivel1.completed).toBe(true);
    expect(progress.stages.fs_nivel2).toMatchObject({ completed: true, current: 2, target: 2 });
    expect(progress.stages.xteam.completed).toBe(false);
  });

  it('reports unknown branch data instead of inventing zero progress', () => {
    const progress = calculateFastStartProgress({
      premierClients: 4,
      directPartners: 2,
      directBranches: [{ premierClients: 4 }, { premierClients: null }],
    });

    expect(progress.knownBranches).toBe(1);
    expect(progress.unknownBranches).toBe(1);
    expect(progress.stages.fs_nivel2).toMatchObject({ completed: false, status: 'sin_datos', current: 1 });
  });

  it('reports definite incomplete progress when missing data cannot satisfy Level 2', () => {
    const progress = calculateFastStartProgress({
      premierClients: 4,
      directPartners: 2,
      directBranches: [{ premierClients: 1 }, { premierClients: null }],
    });

    expect(progress.stages.fs_nivel2).toMatchObject({ completed: false, status: 'en_progreso', current: 0 });
  });

  it('calculates the 120-day timeline in local calendar days', () => {
    expect(calculateFastStartTimeline('2026-08-01', new Date(2026, 7, 31))).toEqual({
      daysElapsed: 30,
      daysRemaining: 90,
      expired: false,
    });
    expect(calculateFastStartTimeline('2026-02-31', new Date(2026, 2, 1))).toBeNull();
  });

  it('uses the configured account date for the Fast Start timeline', () => {
    const progress = calculateFastStartProgress({
      startDate: '2026-09-01',
      now: new Date(2026, 8, 31),
    });

    expect(progress.timeline).toEqual({
      daysElapsed: 30,
      daysRemaining: 90,
      expired: false,
    });
  });

});
