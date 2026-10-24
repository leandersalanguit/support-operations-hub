BEGIN;
SELECT plan(22);

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'agent-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'agent-b@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'lead@example.test', '', now(), '{}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO private.staff_access(user_id, role, active, password_change_required)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'support_agent', true, false),
  ('20000000-0000-4000-8000-000000000002', 'support_agent', true, false),
  ('20000000-0000-4000-8000-000000000003', 'team_lead', true, false);
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
INSERT INTO public.catalog_products(id, name) VALUES ('20000000-0000-4000-8000-000000000030', 'Widget');
INSERT INTO public.interactions
  (id, date, day_of_week, agent, agent_id, client_name, channel, client_product, case_classification, status)
VALUES
  ('20000000-0000-4000-8000-000000000011', current_date, 'Monday', 'Same Name', '20000000-0000-4000-8000-000000000001', 'Synthetic A', 'Call', 'Widget', 'General', 'Open'),
  ('20000000-0000-4000-8000-000000000012', current_date, 'Monday', 'Same Name', '20000000-0000-4000-8000-000000000002', 'Synthetic B', 'Call', 'Widget', 'General', 'Open'),
  ('20000000-0000-4000-8000-000000000013', current_date, 'Monday', 'Unresolved', NULL, 'Synthetic null owner', 'Chat', 'Widget', 'General', 'Open');
INSERT INTO public.clients(id, name) VALUES
  ('20000000-0000-4000-8000-000000000020', 'Synthetic shared update'),
  ('20000000-0000-4000-8000-000000000021', 'Synthetic lead deletion');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
SELECT is((SELECT count(*)::integer FROM public.interactions
  WHERE id IN (
    '20000000-0000-4000-8000-000000000011',
    '20000000-0000-4000-8000-000000000012',
    '20000000-0000-4000-8000-000000000013'
  )), 3, 'active staff can read shared interactions');
SELECT lives_ok($$INSERT INTO public.interactions(date, day_of_week, agent, agent_id, client_name, channel, client_product, case_classification, status)
  VALUES (current_date, 'Monday', 'Same Name', auth.uid(), 'Synthetic own insert', 'Call', 'Widget', 'General', 'Open')$$,
  'agent can insert an interaction owned by their UUID');
SELECT throws_ok($$INSERT INTO public.interactions(date, day_of_week, agent, agent_id, client_name, channel, client_product, case_classification, status)
  VALUES (current_date, 'Monday', 'Same Name', '20000000-0000-4000-8000-000000000002', 'Forged owner', 'Call', 'Widget', 'General', 'Open')$$,
  '42501', NULL, 'agent cannot insert for another UUID');
WITH changed AS (UPDATE public.interactions SET status = 'Updated'
  WHERE id = '20000000-0000-4000-8000-000000000011' RETURNING 1) SELECT is((SELECT count(*)::integer FROM changed), 1,
  'agent can update own UUID even when display name is shared');
WITH changed AS (UPDATE public.interactions SET status = 'Stolen'
  WHERE id = '20000000-0000-4000-8000-000000000012' RETURNING 1) SELECT is((SELECT count(*)::integer FROM changed), 0,
  'same display name does not grant another owner update');
SELECT throws_ok($$UPDATE public.interactions SET agent_id = '20000000-0000-4000-8000-000000000002'
  WHERE id = '20000000-0000-4000-8000-000000000011'$$, '42501', NULL, 'owner UUID cannot be reassigned');
WITH changed AS (DELETE FROM public.interactions WHERE id = '20000000-0000-4000-8000-000000000013' RETURNING 1) SELECT is((SELECT count(*)::integer FROM changed), 0, 'agent cannot delete an unresolved-owner interaction');
SELECT lives_ok($$INSERT INTO public.clients(name) VALUES ('Synthetic agent insert')$$,
  'agent can add a shared client');
WITH changed AS (UPDATE public.clients SET last_logged_by = 'Agent A'
  WHERE id = '20000000-0000-4000-8000-000000000020' RETURNING 1) SELECT is((SELECT count(*)::integer FROM changed), 1, 'agent can update a shared client');
SELECT lives_ok($$INSERT INTO public.client_products(id, client_id, product_name)
  VALUES ('20000000-0000-4000-8000-000000000022', '20000000-0000-4000-8000-000000000020', 'Widget')$$,
  'agent can add a shared client product link');
WITH changed AS (UPDATE public.client_products SET product_name = 'Widget v2'
  WHERE id = '20000000-0000-4000-8000-000000000022' RETURNING 1) SELECT is((SELECT count(*)::integer FROM changed), 1, 'agent can update a shared client product link');
WITH changed AS (DELETE FROM public.clients WHERE name = 'Synthetic agent insert' RETURNING 1) SELECT is((SELECT count(*)::integer FROM changed), 0, 'agent cannot delete a shared client');
WITH changed AS (UPDATE public.catalog_products SET category = 'agent edit'
  WHERE name = 'Widget' RETURNING 1) SELECT is((SELECT count(*)::integer FROM changed), 0,
  'agent cannot update catalog data');
SELECT throws_ok($$INSERT INTO public.marketing_resources(name, categories, url)
  VALUES ('Agent resource', ARRAY['Synthetic'], 'https://example.test/resource')$$,
  '42501', NULL, 'agent cannot insert a resource');

SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', true);
WITH changed AS (UPDATE public.interactions SET status = 'Lead update'
  WHERE id = '20000000-0000-4000-8000-000000000012' RETURNING 1) SELECT is((SELECT count(*)::integer FROM changed), 1, 'lead can update another owner interaction');
WITH changed AS (DELETE FROM public.interactions WHERE id = '20000000-0000-4000-8000-000000000013' RETURNING 1) SELECT is((SELECT count(*)::integer FROM changed), 1, 'lead can delete unresolved-owner interaction');
WITH changed AS (UPDATE public.catalog_products SET category = 'lead edit' WHERE name = 'Widget' RETURNING 1) SELECT is((SELECT count(*)::integer FROM changed), 1, 'lead can update catalog data');
WITH changed AS (DELETE FROM public.clients WHERE id = '20000000-0000-4000-8000-000000000021' RETURNING 1) SELECT is((SELECT count(*)::integer FROM changed), 1, 'lead can delete a shared client');
SELECT is((SELECT count(*)::integer FROM public.interactions WHERE id = '20000000-0000-4000-8000-000000000012'), 1,
  'lead retains shared read access');
RESET ROLE;
DELETE FROM auth.users WHERE id = '20000000-0000-4000-8000-000000000001';
SELECT is((SELECT agent_id FROM public.interactions WHERE id = '20000000-0000-4000-8000-000000000011'),
  '20000000-0000-4000-8000-000000000001'::uuid, 'deleting an auth user keeps historical interaction owner UUID');
SELECT is((SELECT actor_user_id FROM public.interaction_audit_events
  WHERE interaction_id = '20000000-0000-4000-8000-000000000011' AND action = 'insert'),
  '20000000-0000-4000-8000-000000000001'::uuid, 'deleting an auth user keeps audit actor UUID');
SELECT ok(NOT (SELECT active FROM private.staff_access
  WHERE user_id = '20000000-0000-4000-8000-000000000001'), 'deleting an auth user deactivates current staff access');

SELECT * FROM finish();
ROLLBACK;
