import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const taskApi = {
  create: vi.fn(async value => value),
  delete: vi.fn(async () => undefined),
  update: vi.fn(async (_id, value) => value),
};

vi.mock('@/api/db', () => ({ db: { Task: taskApi } }));

const {
  createPartnerTasks,
  createProspectoProductoTasks,
  createReferralTask,
  createSaleTasks,
  refreshSmartPartnerTasks,
} = await import('@/components/tasks/taskEngine.jsx');

describe('taskEngine characterization', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 19, 12));
    taskApi.create.mockClear();
    taskApi.delete.mockClear();
    taskApi.update.mockClear();
  });

  afterEach(() => vi.useRealTimers());

  it('keeps the current 30-day repurchase sequence for a new one-time product sale', async () => {
    await createSaleTasks({
      contactId: 'contact-1',
      productId: 'product-1',
      purchaseDate: '2026-08-19',
      saleType: 'nueva',
      product: { category: 'Compra Única' },
      existingTasks: [
        { id: 'replace-me', contact_id: 'contact-1', product_id: 'product-1', due_date: '2026-08-20', completed: false },
        { id: 'keep-me', contact_id: 'contact-2', product_id: 'product-1', due_date: '2026-08-20', completed: false },
      ],
    });

    expect(taskApi.delete).toHaveBeenCalledTimes(1);
    expect(taskApi.delete).toHaveBeenCalledWith('replace-me');
    expect(taskApi.create.mock.calls.map(([task]) => [task.template_subcategory, task.due_date])).toEqual([
      ['producto_dia_3', '2026-08-22'],
      ['producto_7_dias_antes', '2026-09-11'],
      ['producto_3_dias_antes', '2026-09-15'],
      ['producto_5_dias_despues', '2026-09-23'],
      ['producto_reactivacion', '2026-10-23'],
    ]);
  });

  it('does not duplicate an active prospect follow-up sequence', async () => {
    await createProspectoProductoTasks({
      contactId: 'contact-1',
      existingTasks: [{
        contact_id: 'contact-1',
        task_area: 'prospecto_producto',
        due_date: '2026-08-20',
        completed: false,
      }],
    });

    expect(taskApi.create).not.toHaveBeenCalled();
  });

  it('uses the product cycle instead of guessing it from the category', async () => {
    await createSaleTasks({
      contactId: 'contact-1',
      productId: 'product-1',
      purchaseDate: '2026-08-19',
      saleType: 'recompra',
      product: { category: 'Compra Única', cycle_days: 45 },
      existingTasks: [],
    });

    expect(taskApi.create.mock.calls.map(([task]) => [task.template_subcategory, task.due_date])).toEqual([
      ['producto_7_dias_antes', '2026-09-26'],
      ['producto_3_dias_antes', '2026-09-30'],
      ['producto_5_dias_despues', '2026-10-08'],
      ['producto_reactivacion', '2026-11-07'],
    ]);
  });

  it('creates one honest invitation instead of fake Fast Start checkpoints for an unlinked partner', async () => {
    await createPartnerTasks({ contactId: 'contact-1', startDate: '2026-08-19' });

    expect(taskApi.create).toHaveBeenCalledTimes(1);
    expect(taskApi.create).toHaveBeenCalledWith(expect.objectContaining({
      template_subcategory: 'partner_invitar_zynergia',
      due_date: '2026-08-19',
    }));
  });

  it('keeps only one real next action and closes overdue tasks when a partner advances', async () => {
    await refreshSmartPartnerTasks({
      contactId: 'contact-1',
      contactName: 'Sofía',
      activePremierClients: 4,
      partnersCount: 2,
      directBranches: [{ premier_clients: 4 }, { premier_clients: 1 }],
      existingTasks: [
        { id: 'overdue-qteam', contact_id: 'contact-1', task_area: 'partner', template_subcategory: 'partner_smart_qteam', due_date: '2026-08-01', completed: false },
        { id: 'future-checkin', contact_id: 'contact-1', task_area: 'partner', template_subcategory: 'partner_smart_checkin', due_date: '2026-08-25', completed: false },
      ],
    });

    expect(taskApi.update).toHaveBeenCalledWith('overdue-qteam', { completed: true });
    expect(taskApi.update).toHaveBeenCalledWith('future-checkin', { completed: true });
    expect(taskApi.create).toHaveBeenCalledTimes(1);
    expect(taskApi.create).toHaveBeenCalledWith(expect.objectContaining({
      template_subcategory: 'partner_smart_fs2',
      task_name: expect.stringContaining('1 rama'),
    }));
  });

  it('does not duplicate the same smart next action on refresh', async () => {
    await refreshSmartPartnerTasks({
      contactId: 'contact-1',
      contactName: 'Sofía',
      activePremierClients: 2,
      partnersCount: 0,
      existingTasks: [{
        id: 'current', contact_id: 'contact-1', task_area: 'partner',
        template_subcategory: 'partner_smart_qteam', task_name: 'mensaje anterior',
        due_date: '2026-08-19', completed: false,
      }],
    });

    expect(taskApi.create).not.toHaveBeenCalled();
    expect(taskApi.update).toHaveBeenCalledWith('current', { task_name: expect.stringContaining('2 clientes') });
  });

  it('never schedules an overdue referral before today', async () => {
    await createReferralTask({
      contactId: 'contact-1',
      contactCreatedAt: '2025-01-01T10:00:00Z',
      existingTasks: [],
    });

    expect(taskApi.create).toHaveBeenCalledWith(expect.objectContaining({ due_date: '2026-08-19' }));
  });
});
