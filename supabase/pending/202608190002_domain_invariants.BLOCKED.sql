-- DO NOT move this file into migrations until the production schema-only export is reviewed.
-- It is deliberately fail-closed: JSX field names are not a database contract.

do $$
begin
  raise exception using
    errcode = 'P0001',
    message = 'DEPLOYMENT_BLOCKED: export and review the production schema before implementing record_sale and anonymize_contact';
end;
$$;

-- Required implementation contract after the schema review:
-- 1. record_sale: authenticated ownership, one operation ID, one transaction, owned contact,
--    validated enum/domain values, and deterministic task side effects.
-- 2. anonymize_contact: authenticated ownership, explicit retention decision for sales,
--    PII scrubbing, safe partner/task references, idempotency, and no cross-user mutation.
-- 3. Both functions: SECURITY DEFINER with an empty search_path, minimal grants, RLS tests,
--    concurrency tests, retry tests, and adversarial cross-tenant tests.
-- 4. Audit and version every legacy RPC called by the mobile client: lookup_partner_code,
--    register_as_partner, get_partner_sales_data, get_partner_partners_count, set_parent_id,
--    get_partners_activity, get_partners_fs_metrics, and import_partner_clients.
-- 5. Domain RLS must enforce both ownership and current entitlement; hiding screens in React
--    is not authorization. Define a fail-closed has_app_entitlement() helper and use it in
--    every exposed domain policy. NewSale4 must call record_sale instead of direct writes.
-- 6. Deletion tests must replay the user's previously issued JWT after Auth deletion and prove
--    it cannot select, insert, update, invoke a domain RPC, or recreate any user-owned row.
