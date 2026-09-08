import { describe, expect, it } from 'vitest';
import { defaultTaskSchedule, isFutureTaskSchedule, taskScheduleDate } from '@/lib/taskSchedule';

describe('task schedules', () => {
  it('parses the exact local date and time returned by Supabase', () => {
    expect(taskScheduleDate('2026-09-08', '14:35:00')).toEqual(new Date(2026, 8, 8, 14, 35));
  });

  it('rejects missing or invalid values instead of normalizing them silently', () => {
    expect(taskScheduleDate('2026-09-08', '')).toBeNull();
    expect(taskScheduleDate('2026-02-30', '09:00')).toBeNull();
    expect(taskScheduleDate('2026-09-08', '25:00')).toBeNull();
  });

  it('defaults a new task to one hour in the future, including day rollover', () => {
    expect(defaultTaskSchedule(new Date(2026, 8, 8, 23, 30))).toEqual({ date: '2026-09-09', time: '00:30' });
  });

  it('allows only future schedules', () => {
    const now = new Date(2026, 8, 8, 10, 0);
    expect(isFutureTaskSchedule('2026-09-08', '10:01', now)).toBe(true);
    expect(isFutureTaskSchedule('2026-09-08', '10:00', now)).toBe(false);
  });
});
