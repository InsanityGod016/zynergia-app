import { describe, expect, it } from 'vitest';
import {
  matchesTaskTime,
  taskDetail,
  taskReasonLabel,
  taskTimeLabel,
  todayProgress,
} from '@/lib/taskPresentation';

describe('task presentation', () => {
  it('explains why a person should be contacted', () => {
    expect(taskReasonLabel({ category: 'recompra', task_area: 'producto' })).toBe('Recompra');
    expect(taskReasonLabel({ category: 'seguimiento', task_area: 'partner' })).toBe('Partner / Fast Start');
    expect(taskDetail({ task_name: 'Fast Start – Q-Team Día 7' })).toBe('Q-Team Día 7');
  });

  it('keeps overdue work out of today progress', () => {
    expect(todayProgress([
      { due_date: '2026-08-30', completed: false },
      { due_date: '2026-08-31', completed: true },
      { due_date: '2026-08-31', completed: false },
    ], '2026-08-31')).toEqual({ completed: 1, total: 2 });
  });

  it('separates pending, overdue, today, upcoming and completed', () => {
    const overdue = { due_date: '2026-08-30', completed: false };
    const today = { due_date: '2026-08-31', completed: false };
    const upcoming = { due_date: '2026-09-01', completed: false };
    const done = { due_date: '2026-08-31', completed: true };

    expect([overdue, today, upcoming, done].filter(task => matchesTaskTime(task, 'due', '2026-08-31'))).toEqual([overdue, today, upcoming]);
    expect(matchesTaskTime(overdue, 'overdue', '2026-08-31')).toBe(true);
    expect(matchesTaskTime(today, 'today', '2026-08-31')).toBe(true);
    expect(matchesTaskTime(upcoming, 'upcoming', '2026-08-31')).toBe(true);
    expect(matchesTaskTime(done, 'completed', '2026-08-31')).toBe(true);
    expect(taskTimeLabel(today, '2026-08-31')).toBe('Hoy');
  });
});
