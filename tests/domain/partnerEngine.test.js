import { beforeEach, describe, expect, it, vi } from 'vitest';

const partnerApi = { update: vi.fn(async value => value) };
vi.mock('@/api/db', () => ({ db: { Partner: partnerApi } }));

const {
  calculateFastStartProgress,
  calculateFastStartTimeline,
  countActivePremierClients,
  recalculateAllPartners,
} = await import('@/components/partners/partnerEngine.jsx');
const { BONUS_TABLE, formatBonus } = await import('@/components/partners/bonusTable.jsx');

describe('Fast Start', () => {
  beforeEach(() => partnerApi.update.mockClear());

  it('preserves every approved amount', () => {
    expect(BONUS_TABLE.qteam).toMatchObject({ MXN: 1900, USD: 110, EUR: 100, COP: 450000, PEN: 380 });
    expect(BONUS_TABLE.fs_nivel1).toMatchObject({ MXN: 7600, USD: 430, EUR: 400, COP: 1800000, PEN: 1500 });
    expect(BONUS_TABLE.fs_nivel2).toMatchObject({ MXN: 22800, USD: 1300, EUR: 1200, COP: 5400000, PEN: 4600 });
    expect(BONUS_TABLE.xteam).toMatchObject({ MXN: 2850, USD: 160, EUR: 150, COP: 680000, PEN: 570 });
    expect(formatBonus('fs_nivel2', 'MXN')).toBe('$22,800 MXN');
  });

  it('counts unique active Premier clients without duplicating repeat sales', () => {
    const products = [{ id: 'kit', category: 'Premier Kits' }, { id: 'single', category: 'Compra Única' }];
    const sales = [
      { contact_id: 'a', product_id: 'kit', status: 'active' },
      { contact_id: 'a', product_id: 'kit', status: 'active' },
      { contact_id: 'b', product_id: 'kit', status: 'cancelled' },
      { contact_id: 'c', product_id: 'single', status: 'active' },
    ];
    expect(countActivePremierClients(sales, products)).toBe(1);
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

  it('never updates unlinked or unverified partners', async () => {
    const partners = [
      { id: 'unlinked', partner_user_id: null },
      { id: 'linked', partner_user_id: 'user-1' },
    ];

    await recalculateAllPartners([], partners, [], []);
    expect(partnerApi.update).not.toHaveBeenCalled();
  });

  it('uses authoritative branch metrics when they are supplied', async () => {
    const partner = {
      id: 'linked',
      partner_user_id: 'user-1',
      qteam_completed: false,
      fs_level1_completed: false,
      fs_level2_completed: false,
      xteam_completed: false,
    };
    const metrics = [{
      user_id: 'user-1',
      premier_clients: 10,
      partners_count: 2,
      direct_branches: [{ premier_clients: 4 }, { premier_clients: 5 }],
    }];

    await recalculateAllPartners([], [partner], [], metrics);
    expect(partnerApi.update).toHaveBeenCalledWith('linked', {
      qteam_completed: true,
      fs_level1_completed: true,
      xteam_completed: true,
      fs_level2_completed: true,
    });
  });
});
