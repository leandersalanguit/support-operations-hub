BEGIN;
SELECT plan(14);

ALTER TABLE public.interactions ADD COLUMN synthetic_sensitive_secret text;

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'audit-agent@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-4000-8000-000000000002',
  'authenticated', 'authenticated', 'audit-lead@example.test', '', now(), '{}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO private.staff_access(user_id, role, active, password_change_required)
VALUES ('30000000-0000-4000-8000-000000000001', 'support_agent', true, false),
  ('30000000-0000-4000-8000-000000000002', 'team_lead', true, false);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
INSERT INTO public.interactions
  (id, date, day_of_week, agent, agent_id, client_name, channel, client_product, case_classification, status)
VALUES ('30000000-0000-4000-8000-000000000011', current_date, 'Monday', 'Audit Agent', auth.uid(),
  'Synthetic audit', 'Call', 'Widget', 'General', 'Open');
RESET ROLE;
SELECT is((SELECT count(*)::integer FROM public.interaction_audit_events
  WHERE interaction_id = '30000000-0000-4000-8000-000000000011' AND action = 'insert'), 1,
  'insert creates one audit event in the same transaction');
SELECT ok((SELECT NOT (after_snapshot ? 'synthetic_sensitive_secret') FROM public.interaction_audit_events
  WHERE interaction_id = '30000000-0000-4000-8000-000000000011' AND action = 'insert'),
  'audit snapshots omit columns added after the reviewed allowlist');
SELECT is((SELECT actor_user_id FROM public.interaction_audit_events
  WHERE interaction_id = '30000000-0000-4000-8000-000000000011'),
  '30000000-0000-4000-8000-000000000001'::uuid, 'audit actor comes from auth.uid');
SELECT ok((SELECT occurred_at <= pg_catalog.clock_timestamp() FROM public.interaction_audit_events
  WHERE interaction_id = '30000000-0000-4000-8000-000000000011'), 'audit time is database time');
SET LOCAL ROLE authenticated;
UPDATE public.interactions SET status = 'Closed'
WHERE id = '30000000-0000-4000-8000-000000000011';
RESET ROLE;
SELECT is((SELECT count(*)::integer FROM public.interaction_audit_events
  WHERE interaction_id = '30000000-0000-4000-8000-000000000011' AND action = 'update'), 1,
  'each committed update creates one audit event');
SELECT is((SELECT before_snapshot ->> 'status' FROM public.interaction_audit_events
  WHERE interaction_id = '30000000-0000-4000-8000-000000000011' AND action = 'update'), 'Open', 'update stores old snapshot');
SELECT is((SELECT after_snapshot ->> 'status' FROM public.interaction_audit_events
  WHERE interaction_id = '30000000-0000-4000-8000-000000000011' AND action = 'update'), 'Closed', 'update stores new snapshot');
SET LOCAL ROLE authenticated;
UPDATE public.interactions SET status = 'Resolved'
WHERE id = '30000000-0000-4000-8000-000000000011';
SELECT throws_ok($$INSERT INTO public.interaction_audit_events(interaction_id, actor_user_id, action)
  VALUES ('30000000-0000-4000-8000-000000000011', auth.uid(), 'insert')$$,
  '42501', NULL, 'browser cannot forge an audit event');
DELETE FROM public.interactions WHERE id = '30000000-0000-4000-8000-000000000011';
RESET ROLE;
SELECT is((SELECT count(*)::integer FROM public.interaction_audit_events
  WHERE interaction_id = '30000000-0000-4000-8000-000000000011' AND action = 'update'), 2,
  'each successful retry creates its own audit event');
SELECT is((SELECT count(*)::integer FROM public.interaction_audit_events
  WHERE interaction_id = '30000000-0000-4000-8000-000000000011' AND action = 'delete'), 1,
  'delete creates an audit event without cascading history');

SELECT set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);
SET LOCAL ROLE authenticated;
INSERT INTO public.catalog_products(name) VALUES ('Synthetic catalog audit');
RESET ROLE;
SELECT is((SELECT count(*)::integer FROM public.catalog_audit_logs
  WHERE old_value IS NULL AND new_value = 'Synthetic catalog audit' AND action = 'create'), 1,
  'catalog changes remain transactionally audited');

CREATE OR REPLACE FUNCTION private.fail_test_audit_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'synthetic audit failure' USING ERRCODE = 'P0001';
END;
$$;
CREATE TRIGGER trg_test_fail_interaction_audit BEFORE INSERT ON public.interaction_audit_events
  FOR EACH ROW EXECUTE FUNCTION private.fail_test_audit_insert();
SELECT set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$INSERT INTO public.interactions
  (id, date, day_of_week, agent, agent_id, client_name, channel, client_product, case_classification, status)
  VALUES ('30000000-0000-4000-8000-000000000012', current_date, 'Monday', 'Audit Agent', auth.uid(),
  'Synthetic failure', 'Call', 'Widget', 'General', 'Open')$$,
  'P0001', NULL, 'audit failure aborts the business write');
RESET ROLE;
DROP TRIGGER trg_test_fail_interaction_audit ON public.interaction_audit_events;
DROP FUNCTION private.fail_test_audit_insert();
SELECT is((SELECT count(*)::integer FROM public.interactions
  WHERE id = '30000000-0000-4000-8000-000000000012'), 0, 'audit failure leaves no committed interaction');
SELECT is((SELECT count(*)::integer FROM public.interaction_audit_events
  WHERE interaction_id = '30000000-0000-4000-8000-000000000012'), 0, 'failed business write leaves no audit event');

SELECT * FROM finish();
ROLLBACK;
