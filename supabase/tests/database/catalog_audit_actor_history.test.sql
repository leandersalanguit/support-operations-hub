BEGIN;
SELECT plan(8);

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000',
  '20000000-0000-4000-8000-000000000990', 'authenticated', 'authenticated',
  'catalog-audit-actor@example.test', '', now(), '{}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO private.staff_access(user_id, role, active, password_change_required)
VALUES ('20000000-0000-4000-8000-000000000990', 'support_agent', true, false);
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000990', true);
INSERT INTO public.catalog_products(id, name)
VALUES ('20000000-0000-4000-8000-000000000991', 'Catalog audit actor history test');

CREATE TEMP TABLE expected_catalog_audit_snapshot ON COMMIT DROP AS
SELECT * FROM public.catalog_audit_logs
WHERE details ->> 'record_id' = '20000000-0000-4000-8000-000000000991'
  AND performed_by_id = '20000000-0000-4000-8000-000000000990';
SELECT is((SELECT count(*)::integer FROM expected_catalog_audit_snapshot), 1,
  'catalog insert creates an audit row for the active actor');

SELECT lives_ok($$DELETE FROM auth.users
  WHERE id = '20000000-0000-4000-8000-000000000990'$$,
  'deleting the actor auth account succeeds');
SELECT ok((SELECT pg_catalog.to_jsonb(current_row) = pg_catalog.to_jsonb(expected_row)
  FROM public.catalog_audit_logs AS current_row
  JOIN expected_catalog_audit_snapshot AS expected_row USING (id)),
  'auth deletion leaves the complete catalog audit row unchanged');
SELECT is((SELECT performed_by_id FROM public.catalog_audit_logs
  WHERE details ->> 'record_id' = '20000000-0000-4000-8000-000000000991'),
  '20000000-0000-4000-8000-000000000990'::uuid,
  'auth deletion preserves the historical catalog actor UUID');
SELECT throws_ok($$UPDATE public.catalog_audit_logs SET performed_by = 'Changed actor'
  WHERE details ->> 'record_id' = '20000000-0000-4000-8000-000000000991'$$,
  '42501', NULL, 'catalog audit rows reject updates after auth deletion');
SELECT throws_ok($$DELETE FROM public.catalog_audit_logs
  WHERE details ->> 'record_id' = '20000000-0000-4000-8000-000000000991'$$,
  '42501', NULL, 'catalog audit rows reject deletes after auth deletion');
SELECT ok(NOT (SELECT active FROM private.staff_access
  WHERE user_id = '20000000-0000-4000-8000-000000000990'),
  'auth deletion deactivates staff access');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000990', true);
SELECT is((SELECT count(*)::integer FROM public.catalog_products
  WHERE id = '20000000-0000-4000-8000-000000000991'), 0,
  'deleted auth subject cannot access catalog rows');

SELECT * FROM finish();
ROLLBACK;
