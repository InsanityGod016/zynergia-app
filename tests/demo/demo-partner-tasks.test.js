import { beforeAll, describe, expect, it } from 'vitest';

let deriveDemoPartnerTask;
let buildDemoTasks;

beforeAll(async () => {
  globalThis.window = { self: null, top: null };
  ({ deriveDemoPartnerTask } = await import('../../src/demo/DemoTeamOriginal.jsx'));
  ({ buildDemoTasks } = await import('../../src/demo/DemoToday.jsx'));
});

const partner = metrics => ({
  id: 'partner-demo',
  name: 'Ana García',
  phone: '+52 55 0000 0000',
  partnerUserId: 'user-demo',
  metrics,
});

describe('demo Fast Start follow-up', () => {
  it('does not invent progress before an account is linked', () => {
    const task = deriveDemoPartnerTask({
      id: 'unlinked',
      name: 'Carlos Ruiz',
      phone: '+52 55 0000 0001',
      partnerUserId: null,
      metrics: null,
    });

    expect(task.stage).toBe('link');
    expect(task.action).toContain('Vincular');
    expect(task.message).toContain('código');
  });

  it.each([
    [{ premierClients: 3, partnersCount: 0, duplicatedTeams: 0 }, 'qteam', '3 de 4'],
    [{ premierClients: 4, partnersCount: 1, duplicatedTeams: 0 }, 'fs1', '1 de 2'],
    [{ premierClients: 4, partnersCount: 2, duplicatedTeams: 0 }, 'fs2', 'propio Q-Team'],
    [{ premierClients: 6, partnersCount: 2, duplicatedTeams: 1 }, 'xteam', '6 de 10'],
    [{ premierClients: 10, partnersCount: 2, duplicatedTeams: 1 }, 'completed', 'completado'],
  ])('adapts the task to current metrics %#', (metrics, stage, context) => {
    const task = deriveDemoPartnerTask(partner(metrics));

    expect(task.stage).toBe(stage);
    expect(task.reason.toLowerCase()).toContain(context.toLowerCase());
    expect(task.message).toContain('Ana');
  });

  it('shows every business follow-up source instead of generic reasons', () => {
    const tasks = buildDemoTasks([partner({ premierClients: 3, partnersCount: 0, duplicatedTeams: 0 })]);

    expect(new Set(tasks.map(task => task.area))).toEqual(new Set([
      'producto',
      'prospecto_producto',
      'prospecto_partner',
      'partner',
    ]));
    expect(new Set(tasks.map(task => task.category))).toEqual(new Set([
      'recompra',
      'seguimiento',
      'reactivacion',
    ]));
    expect(tasks.find(task => task.id === 'partner-task-partner-demo')?.context).toContain('3 de 4');
  });

  it('updates the linked partner task when Fast Start metrics change', () => {
    const before = buildDemoTasks([partner({ premierClients: 3, partnersCount: 0, duplicatedTeams: 0 })]);
    const after = buildDemoTasks([partner({ premierClients: 4, partnersCount: 1, duplicatedTeams: 0 })]);

    expect(before.find(task => task.area === 'partner')?.context).toContain('Q-Team');
    expect(after.find(task => task.area === 'partner')?.context).toContain('Nivel 1');
  });
});
