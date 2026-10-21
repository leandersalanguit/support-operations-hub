BEGIN;
SELECT plan(10);

INSERT INTO private.staff_access(user_id, role, active, password_change_required)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'support_agent', false, false),
  ('10000000-0000-4000-8000-000000000002', 'support_agent', true, true),
  ('10000000-0000-4000-8000-000000000003', 'support_agent', true, false),
  ('10000000-0000-4000-8000-000000000004', 'team_lead', true, false);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000099', true);
SELECT ok(NOT public.can_use_support_hub(), 'unknown staff cannot use the hub');
SELECT is((SELECT count(*)::integer FROM public.get_my_access_state()), 0, 'unknown staff receives no access-state row');

SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
SELECT ok(NOT public.can_use_support_hub(), 'inactive staff cannot use the hub');
SELECT ok(NOT public.is_support_lead(), 'inactive lead status is never granted');
SELECT is((SELECT active FROM public.get_my_access_state()), false, 'inactive caller can read only own state');

SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
SELECT ok(NOT public.can_use_support_hub(), 'required password change blocks hub access');
SELECT is((SELECT password_change_required FROM public.get_my_access_state()), true, 'caller sees own password requirement');

SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
SELECT ok(public.can_use_support_hub(), 'active agent can use the hub');
SELECT ok(NOT public.is_support_lead(), 'active agent is not a lead');

SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
SELECT ok(public.can_use_support_hub() AND public.is_support_lead(), 'active team lead can use the hub');

SELECT * FROM finish();
ROLLBACK;
