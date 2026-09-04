-- Full per-user products and message templates used by the 1.1 UI.
-- Historical sales/tasks keep their stable text product/template IDs.

create table if not exists public.user_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  name text,
  category text,
  subcategory text,
  image_url text,
  link_url text,
  cycle_days integer check (cycle_days is null or cycle_days between 0 and 730),
  frequency_months integer check (frequency_months is null or frequency_months between 1 and 24),
  repurchase_enabled boolean,
  origin text not null default 'user' check (origin in ('system', 'user')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id),
  check (origin = 'system' or nullif(btrim(name), '') is not null),
  check (link_url is null or link_url = '' or link_url ~ '^https?://'),
  check (image_url is null or image_url = '' or image_url ~ '^https?://')
);

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null,
  name text,
  content text not null default '',
  situation text,
  category text,
  subcategory text,
  tone text,
  contact_id uuid references public.contacts(id) on delete set null,
  origin text not null default 'user' check (origin in ('system', 'user')),
  is_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, template_id),
  check (origin = 'system' or nullif(btrim(name), '') is not null)
);

create index if not exists user_products_active_idx
  on public.user_products (user_id, created_at desc)
  where archived_at is null;

create index if not exists message_templates_active_idx
  on public.message_templates (user_id, situation, created_at desc)
  where archived_at is null;

create unique index if not exists message_templates_default_general_idx
  on public.message_templates (user_id, situation)
  where is_default and contact_id is null and archived_at is null;

create unique index if not exists message_templates_default_contact_idx
  on public.message_templates (user_id, situation, contact_id)
  where is_default and contact_id is not null and archived_at is null;

create or replace function public.zynergia_clear_previous_template_default()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_default and new.archived_at is null and new.situation is not null then
    update public.message_templates
       set is_default = false
     where user_id = new.user_id
       and id <> new.id
       and situation = new.situation
       and contact_id is not distinct from new.contact_id
       and is_default = true
       and archived_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists user_products_set_updated_at on public.user_products;
create trigger user_products_set_updated_at
before update on public.user_products
for each row execute function public.zynergia_set_updated_at();

drop trigger if exists message_templates_set_updated_at on public.message_templates;
create trigger message_templates_set_updated_at
before update on public.message_templates
for each row execute function public.zynergia_set_updated_at();

drop trigger if exists message_templates_clear_previous_default on public.message_templates;
create trigger message_templates_clear_previous_default
before insert or update of is_default, situation, contact_id, archived_at
on public.message_templates
for each row execute function public.zynergia_clear_previous_template_default();

alter table public.user_products enable row level security;
alter table public.message_templates enable row level security;

drop policy if exists user_products_entitled_own on public.user_products;
create policy user_products_entitled_own
  on public.user_products
  for all
  to authenticated
  using (
    auth.uid() = user_id
    and public.has_app_entitlement(auth.uid())
  )
  with check (
    auth.uid() = user_id
    and public.has_app_entitlement(auth.uid())
  );

drop policy if exists message_templates_entitled_own on public.message_templates;
create policy message_templates_entitled_own
  on public.message_templates
  for all
  to authenticated
  using (
    auth.uid() = user_id
    and public.has_app_entitlement(auth.uid())
  )
  with check (
    auth.uid() = user_id
    and public.has_app_entitlement(auth.uid())
    and (
      contact_id is null
      or exists (
        select 1
          from public.contacts c
         where c.id = message_templates.contact_id
           and c.user_id = auth.uid()
      )
    )
  );

revoke all on table public.user_products from public, anon;
revoke all on table public.message_templates from public, anon;
grant select, insert, update, delete on table public.user_products to authenticated;
grant select, insert, update, delete on table public.message_templates to authenticated;

revoke all on function public.zynergia_clear_previous_template_default()
  from public, anon, authenticated;

-- Preserve existing per-user edits. Built-in metadata stays in the app bundle;
-- these rows overlay only the content/link that the user had already changed.
insert into public.message_templates (
  user_id, template_id, content, origin
)
select user_id, template_id, coalesce(content, ''), 'system'
  from public.user_templates
on conflict (user_id, template_id) do nothing;

insert into public.user_products (
  user_id, product_id, link_url, origin
)
select user_id, product_id, coalesce(link_url, ''), 'system'
  from public.product_links
on conflict (user_id, product_id) do nothing;
