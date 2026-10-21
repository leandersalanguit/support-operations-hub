BEGIN;
SELECT plan(13);

INSERT INTO private.staff_access(user_id, role, active, password_change_required)
VALUES
  ('40000000-0000-4000-8000-000000000001', 'support_agent', true, true),
  ('40000000-0000-4000-8000-000000000002', 'support_agent', false, true),
  ('40000000-0000-4000-8000-000000000003', 'support_agent', true, false);

SET LOCAL ROLE service_role;
SELECT ok(public.consume_password_change_attempt('40000000-0000-4000-8000-000000000001'), 'attempt 1 is allowed');
SELECT ok(public.consume_password_change_attempt('40000000-0000-4000-8000-000000000001'), 'attempt 2 is allowed');
SELECT ok(public.consume_password_change_attempt('40000000-0000-4000-8000-000000000001'), 'attempt 3 is allowed');
SELECT ok(public.consume_password_change_attempt('40000000-0000-4000-8000-000000000001'), 'attempt 4 is allowed');
SELECT ok(public.consume_password_change_attempt('40000000-0000-4000-8000-000000000001'), 'attempt 5 is allowed');
SELECT ok(NOT public.consume_password_change_attempt('40000000-0000-4000-8000-000000000001'), 'attempt 6 is denied');
UPDATE private.password_change_attempt_windows
SET window_started_at = pg_catalog.clock_timestamp() - interval '16 minutes', attempt_count = 5
WHERE user_id = '40000000-0000-4000-8000-000000000001';
SELECT ok(public.consume_password_change_attempt('40000000-0000-4000-8000-000000000001'), 'attempt window resets after 15 minutes');
SELECT ok(public.complete_required_password_change('40000000-0000-4000-8000-000000000001'), 'active staff requirement can be cleared');
SELECT ok(NOT (SELECT password_change_required FROM private.staff_access
  WHERE user_id = '40000000-0000-4000-8000-000000000001'), 'successful completion clears current requirement');
SELECT is((SELECT count(*)::integer FROM private.staff_access_events
  WHERE user_id = '40000000-0000-4000-8000-000000000001'
    AND event_type = 'password_change_completed'), 1, 'completion creates one event without password data');
SELECT ok(NOT public.complete_required_password_change('40000000-0000-4000-8000-000000000002'),
  'inactive staff cannot complete password change');
SELECT ok(public.complete_required_password_change('40000000-0000-4000-8000-000000000003'),
  'active staff retry succeeds after the provider update already completed');
SELECT ok(public.complete_required_password_change('40000000-0000-4000-8000-000000000003'),
  'repeated active completion remains safe');

SELECT * FROM finish();
ROLLBACK;
