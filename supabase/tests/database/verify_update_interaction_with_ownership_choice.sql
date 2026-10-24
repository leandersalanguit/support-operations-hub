-- Regression test for typed JSON assignments and interaction ownership choices.
BEGIN;
SELECT plan(6);

CREATE TEMP TABLE ownership_rpc_fixture (
  interaction_id uuid NOT NULL,
  client_id uuid NOT NULL,
  old_product text NOT NULL,
  retained_product text NOT NULL,
  next_product text NOT NULL
) ON COMMIT DROP;

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000',
  '33000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'ownership-rpc-regression@example.test', '',
  now(), '{}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO private.staff_access(user_id, role, active, password_change_required)
VALUES ('33000000-0000-4000-8000-000000000001', 'team_lead', true, false)
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role, active = true, password_change_required = false;

WITH new_client AS (
  INSERT INTO public.clients (name)
  VALUES ('Codex RPC Client 33000000-0000-4000-8000-000000000011')
  RETURNING id
)
INSERT INTO ownership_rpc_fixture
SELECT '33000000-0000-4000-8000-000000000011',
  new_client.id,
  'Codex RPC Old 33000000-0000-4000-8000-000000000011',
  'Codex RPC Retained 33000000-0000-4000-8000-000000000011',
  'Codex RPC Next 33000000-0000-4000-8000-000000000011'
FROM new_client;
GRANT SELECT ON ownership_rpc_fixture TO authenticated;

SELECT set_config('request.jwt.claim.sub', '33000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

INSERT INTO public.interactions
  (id, date, day_of_week, agent, agent_id, client_name, channel, client_product,
   case_classification, status)
SELECT fixture.interaction_id, current_date, 'Monday', 'Ownership RPC Regression',
  '33000000-0000-4000-8000-000000000001',
  'Codex RPC Client 33000000-0000-4000-8000-000000000011',
  'Call', fixture.old_product, 'General', 'Open'
FROM ownership_rpc_fixture AS fixture;


SELECT public.update_interaction_with_ownership_choice(
  fixture.interaction_id,
  (SELECT to_jsonb(interaction) || jsonb_build_object(
     'date', '2026-10-24',
     'time', '14:30:17',
     'client_product', fixture.retained_product
   )
   FROM public.interactions AS interaction
   WHERE interaction.id = fixture.interaction_id),
  true
)
FROM ownership_rpc_fixture AS fixture;

SELECT is(
  (SELECT date FROM public.interactions
   WHERE id = '33000000-0000-4000-8000-000000000011'),
  DATE '2026-10-24',
  'typed date assignment round-trips'
);
SELECT is(
  (SELECT time FROM public.interactions
   WHERE id = '33000000-0000-4000-8000-000000000011'),
  TIME '14:30:17',
  'typed time assignment round-trips'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.client_products AS product
    JOIN ownership_rpc_fixture AS fixture ON fixture.client_id = product.client_id
    WHERE product.product_name = fixture.old_product
  ),
  'retain_previous_product=true retains the previous product'
);

RESET ROLE;
INSERT INTO public.client_products (client_id, product_name)
SELECT client_id, retained_product FROM ownership_rpc_fixture;
SET LOCAL ROLE authenticated;

SELECT public.update_interaction_with_ownership_choice(
  fixture.interaction_id,
  (SELECT to_jsonb(interaction) || jsonb_build_object(
     'client_product', fixture.next_product
   )
   FROM public.interactions AS interaction
   WHERE interaction.id = fixture.interaction_id),
  false
)
FROM ownership_rpc_fixture AS fixture;

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.client_products AS product
    JOIN ownership_rpc_fixture AS fixture ON fixture.client_id = product.client_id
    WHERE product.product_name = fixture.retained_product
  ),
  'retain_previous_product=false removes the previous product'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.client_products AS product
    JOIN ownership_rpc_fixture AS fixture ON fixture.client_id = product.client_id
    WHERE product.product_name = fixture.old_product
  ),
  'the false choice preserves an unrelated retained product'
);
SELECT is(
  (SELECT link.product_name FROM public.client_product_interactions AS link
   WHERE link.interaction_id = '33000000-0000-4000-8000-000000000011'),
  (SELECT next_product FROM ownership_rpc_fixture),
  'the interaction ownership link follows the updated product'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
