alter table if exists public.sales
  add column if not exists operation_id uuid;

do $$
begin
  if to_regclass('public.sales') is not null then
    if not exists (
      select 1
        from information_schema.columns
       where table_schema = 'public'
         and table_name = 'sales'
         and column_name = 'user_id'
    ) then
      raise exception 'sales_user_id_required_for_operation_id';
    end if;
    if not exists (
      select 1
        from information_schema.columns
       where table_schema = 'public'
         and table_name = 'sales'
         and column_name = 'operation_id'
         and udt_name = 'uuid'
    ) then
      raise exception 'sales_operation_id_must_be_uuid';
    end if;

    execute 'create unique index if not exists sales_user_operation_id_idx
      on public.sales (user_id, operation_id)
      where operation_id is not null';
  end if;
end;
$$;
