-- Keep 1.1.x clients compatible while every 1.2 task carries an explicit
-- local reminder time. Existing tasks retain the historical 09:00 behavior.
alter table public.tasks
  add column if not exists due_time time without time zone;

update public.tasks
   set due_time = time '09:00'
 where due_time is null;

alter table public.tasks
  alter column due_time set default time '09:00',
  alter column due_time set not null;
