import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const root = new URL('../../', import.meta.url);
const source = path => readFile(new URL(path, root), 'utf8');

describe('exact task reminder time contract', () => {
  it('backfills old tasks and keeps 1.1.x inserts compatible', async () => {
    const migration = await source('supabase/migrations/202609070005_task_due_time.sql');
    expect(migration).toMatch(/add column if not exists due_time time without time zone/);
    expect(migration).toMatch(/set due_time = time '09:00'[\s\S]+where due_time is null/);
    expect(migration).toMatch(/alter column due_time set default time '09:00'/);
    expect(migration).toMatch(/alter column due_time set not null/);
  });

  it('requires and saves an explicit time in the 1.2 manual task flow', async () => {
    const page = await source('src/pages/NewTask.jsx');
    expect(page).toContain('type="time"');
    expect(page).toMatch(/due_time:\s*dueTime/);
    expect(page).toContain('isFutureTaskSchedule(dueDate, dueTime)');
    expect(page).toContain('dueTime, productId, templateId');
  });
});
