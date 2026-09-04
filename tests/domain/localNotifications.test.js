import { describe, expect, it } from 'vitest';
import { buildTaskNotifications, taskNotificationId } from '@/lib/localNotifications';

describe('local task notifications', () => {
  it('assigns a stable app-owned id to each task', () => {
    expect(taskNotificationId('task-123')).toBe(taskNotificationId('task-123'));
    expect(taskNotificationId('task-123')).not.toBe(taskNotificationId('task-124'));
  });

  it('schedules each real task with entity navigation data', () => {
    const notifications = buildTaskNotifications(
      [{ id: 'task-1', contact_id: 'contact-1', product_id: 'product-1', category: 'recompra', task_area: 'producto', due_date: '2026-09-01', completed: false }],
      [{ id: 'contact-1', full_name: 'Carlos Ramírez' }],
      [{ id: 'product-1', name: 'BalanceOil+' }],
      new Date(2026, 7, 31, 8, 0),
      'user-1',
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      title: 'Carlos Ramírez',
      body: 'Recompra · BalanceOil+',
      extra: { source: 'zynergia', userId: 'user-1', entityType: 'task', entityId: 'task-1' },
    });
  });

  it('never schedules completed, expired or very distant tasks', () => {
    const notifications = buildTaskNotifications([
      { id: 'old', due_date: '2026-08-30', completed: false },
      { id: 'done', due_date: '2026-09-01', completed: true },
      { id: 'far', due_date: '2027-01-01', completed: false },
    ], [], [], new Date(2026, 7, 31, 8, 0));
    expect(notifications).toEqual([]);
  });
});
