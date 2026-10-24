BEGIN;
SELECT plan(5);

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', '32000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'ownership-regression@example.test', '', now(), '{}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO private.staff_access(user_id, role, active, password_change_required)
VALUES ('32000000-0000-4000-8000-000000000001', 'support_agent', true, false)
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, active = true, password_change_required = false;

SELECT set_config('request.jwt.claim.sub', '32000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

INSERT INTO public.interactions
  (id, date, day_of_week, agent, agent_id, client_name, channel, client_product, case_classification, status)
VALUES ('32000000-0000-4000-8000-000000000011', current_date, 'Monday', 'Ownership Regression', auth.uid(),
  'Codex Ownership Probe 32000000-0000-4000-8000-000000000011', 'Call', 'Original Product', 'General', 'Open');

-- Inserting the first exact owner must link the waiting interaction.
INSERT INTO public.clients(name)
VALUES ('Codex Ownership Probe 32000000-0000-4000-8000-000000000011');
SELECT is(
  (SELECT link.client_id FROM public.client_product_interactions AS link
   WHERE link.interaction_id = '32000000-0000-4000-8000-000000000011'),
  (SELECT client.id FROM public.clients AS client
   WHERE client.name = 'Codex Ownership Probe 32000000-0000-4000-8000-000000000011'),
  'a late unique client insert links the waiting interaction'
);

-- Staff can insert a case variant because the existing constraint is case-sensitive.
INSERT INTO public.clients(name)
VALUES ('codex ownership probe 32000000-0000-4000-8000-000000000011');
SELECT is(
  (SELECT link.client_id FROM public.client_product_interactions AS link
   WHERE link.interaction_id = '32000000-0000-4000-8000-000000000011'),
  (SELECT client.id FROM public.clients AS client
   WHERE client.name = 'Codex Ownership Probe 32000000-0000-4000-8000-000000000011'),
  'a case-variant client insert cannot take an established interaction link'
);

UPDATE public.interactions
SET client_id = (SELECT client.id FROM public.clients AS client
                 WHERE client.name = 'codex ownership probe 32000000-0000-4000-8000-000000000011')
WHERE id = '32000000-0000-4000-8000-000000000011';
SELECT is(
  (SELECT link.client_id FROM public.client_product_interactions AS link
   WHERE link.interaction_id = '32000000-0000-4000-8000-000000000011'),
  (SELECT client.id FROM public.clients AS client
   WHERE client.name = 'Codex Ownership Probe 32000000-0000-4000-8000-000000000011'),
  'a direct client_id update cannot select a case-variant duplicate'
);

UPDATE public.interactions
SET client_name = lower(client_name), client_product = 'Updated Product'
WHERE id = '32000000-0000-4000-8000-000000000011';
SELECT is(
  (SELECT link.client_id FROM public.client_product_interactions AS link
   WHERE link.interaction_id = '32000000-0000-4000-8000-000000000011'),
  (SELECT client.id FROM public.clients AS client
   WHERE client.name = 'Codex Ownership Probe 32000000-0000-4000-8000-000000000011'),
  'an interaction update preserves its existing canonical owner when names are ambiguous'
);

INSERT INTO public.interactions
  (id, date, day_of_week, agent, agent_id, client_name, channel, client_product, case_classification, status)
VALUES ('32000000-0000-4000-8000-000000000012', current_date, 'Monday', 'Ownership Regression', auth.uid(),
  'Codex Ownership Probe 32000000-0000-4000-8000-000000000011', 'Call', 'Ambiguous Product', 'General', 'Open');
SELECT is(
  (SELECT count(*)::integer FROM public.client_product_interactions
   WHERE interaction_id = '32000000-0000-4000-8000-000000000012'),
  0,
  'a new interaction with an ambiguous canonical client name remains unlinked'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
