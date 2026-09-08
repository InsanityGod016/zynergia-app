import { describe, expect, it } from 'vitest';
import { buildTaskNotifications, notificationPermissionState, taskNotificationId } from '@/lib/localNotifications';

describe('local task notifications', () => {
  it('assigns a stable app-owned id to each task', () => {
    expect(taskNotificationId('task-123')).toBe(taskNotificationId('task-123'));
    expect(taskNotificationId('task-123')).not.toBe(taskNotificationId('task-124'));
  });

  it('schedules each real task with entity navigation data', () => {
    const notifications = buildTaskNotifications(
      [{ id: 'task-1', contact_id: 'contact-1', product_id: 'product-1', category: 'recompra', task_area: 'producto', due_date: '2026-09-01', due_time: '10:30', completed: false }],
      [{ id: 'contact-1', full_name: 'Carlos Ramírez' }],
      [{ id: 'product-1', name: 'BalanceOil+' }],
      new Date(2026, 7, 31, 8, 0),
      'user-1',
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      title: 'Carlos Ramírez',
      body: 'Recompra · BalanceOil+',
      schedule: { at: new Date(2026, 8, 1, 10, 30), allowWhileIdle: true },
      extra: { source: 'zynergia', userId: 'user-1', entityType: 'task', entityId: 'task-1' },
    });
  });

  it('never schedules completed, expired or very distant tasks', () => {
    const notifications = buildTaskNotifications([
      { id: 'old', due_date: '2026-08-30', due_time: '09:00', completed: false },
      { id: 'done', due_date: '2026-09-01', due_time: '09:00', completed: true },
      { id: 'far', due_date: '2027-01-01', due_time: '09:00', completed: false },
    ], [], [], new Date(2026, 7, 31, 8, 0));
    expect(notifications).toEqual([]);
  });

  it('does not invent a reminder time when a task has none', () => {
    expect(buildTaskNotifications([
      { id: 'missing-time', due_date: '2026-09-01', completed: false },
    ], [], [], new Date(2026, 7, 31, 8, 0))).toEqual([]);
  });

  it('distinguishes requestable permission from a denial', () => {
    expect(notificationPermissionState({ display: 'granted' })).toBe('granted');
    expect(notificationPermissionState({ display: 'unavailable' })).toBe('unavailable');
    expect(notificationPermissionState({ display: 'denied' })).toBe('blocked');
    expect(notificationPermissionState({ display: 'prompt' })).toBe('prompt');
    expect(notificationPermissionState({ display: 'prompt-with-rationale' })).toBe('prompt');
    expect(notificationPermissionState()).toBe('unknown');
  });
});
