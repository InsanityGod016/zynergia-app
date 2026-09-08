-- Environment-specific scheduler for the push worker. Store both values in
-- Supabase Vault before running this script; never paste a secret into this file.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $requirements$
begin
  if not exists (
    select 1 from vault.decrypted_secrets
     where name = 'zynergia_notification_worker_url'
       and decrypted_secret = 'https://zynergia.pro/api/notifications/process'
  ) then
    raise exception 'zynergia_notification_worker_url_missing_or_invalid';
  end if;
  if not exists (
    select 1 from vault.decrypted_secrets
     where name = 'zynergia_notification_worker_secret'
       and char_length(decrypted_secret) >= 24
  ) then
    raise exception 'zynergia_notification_worker_secret_missing_or_invalid';
  end if;
end;
$requirements$;

select cron.unschedule(jobid)
  from cron.job
 where jobname = 'zynergia-push-worker';

select cron.schedule(
  'zynergia-push-worker',
  '*/10 * * * *',
  $worker$
    select net.http_post(
      url := (
        select decrypted_secret
          from vault.decrypted_secrets
         where name = 'zynergia_notification_worker_url'
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
            from vault.decrypted_secrets
           where name = 'zynergia_notification_worker_secret'
        )
      ),
      body := '{}'::jsonb
    ) as request_id;
  $worker$
);
