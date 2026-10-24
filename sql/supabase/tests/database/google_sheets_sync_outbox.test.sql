BEGIN;
SELECT plan(25);

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', '35000000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'sheets-agent@example.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '35000000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'sheets-lead@example.test', '', now(), '{}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO private.staff_access(user_id, role, active, password_change_required)
VALUES
  ('35000000-0000-4000-8000-000000000001', 'support_agent', true, false),
  ('35000000-0000-4000-8000-000000000002', 'team_lead', true, false)
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role, active = true, password_change_required = false;

SELECT ok(NOT has_table_privilege('authenticated', 'private.google_sheets_sync_outbox', 'SELECT'),
  'authenticated staff cannot read the outbox');
SELECT ok(NOT has_function_privilege('authenticated', 'private.claim_google_sheets_sync_events(integer)', 'EXECUTE'),
  'authenticated staff cannot claim outbox events');
SELECT ok(NOT has_function_privilege('anon', 'private.claim_google_sheets_sync_events(integer)', 'EXECUTE'),
  'anonymous callers cannot claim outbox events');
SELECT ok(has_function_privilege('service_role', 'public.claim_google_sheets_sync_events(integer)', 'EXECUTE'),
  'only the service worker can claim queued events');
SELECT ok(NOT has_function_privilege('anon', 'public.get_google_sheets_sync_status()', 'EXECUTE'),
  'anonymous callers cannot inspect sync status');

SELECT set_config('request.jwt.claim.sub', '35000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

INSERT INTO public.interactions
  (id, date, day_of_week, time, agent, agent_id, client_name, channel, channel_details,
   client_product, case_classification, status, license, in_event, first_time_user, additional_notes)
VALUES ('35000000-0000-4000-8000-000000000011', DATE '2026-10-24', 'Saturday', '09:30:00',
  'Sheets Agent', auth.uid(), 'Sheets Test Client', 'Call', 'Ticket 123', 'Widget', 'Other',
  'Solved', 'support_active', false, true, 'Initial notes');

RESET ROLE;
SELECT is((SELECT count(*)::integer FROM private.google_sheets_sync_outbox), 1,
  'an interaction insert creates one outbox event');
SELECT is((SELECT action FROM private.google_sheets_sync_outbox LIMIT 1), 'insert',
  'an interaction insert creates an insert event');
SELECT is((SELECT actor_id FROM private.google_sheets_sync_outbox LIMIT 1), auth.uid(),
  'the outbox actor comes from the database session');
SELECT is((SELECT payload->>'additionalNotes' FROM private.google_sheets_sync_outbox LIMIT 1), 'Initial notes',
  'the event contains the approved interaction notes');
SELECT ok(NOT ((SELECT payload FROM private.google_sheets_sync_outbox LIMIT 1) ? 'agentId'),
  'the event does not contain an auth identity');

SET LOCAL ROLE authenticated;
UPDATE public.interactions SET additional_notes = 'Changed notes'
WHERE id = '35000000-0000-4000-8000-000000000011';
RESET ROLE;
SELECT is((SELECT version FROM private.google_sheets_sync_outbox ORDER BY id DESC LIMIT 1), 2::bigint,
  'an update increments the interaction version');
SELECT is((SELECT payload->>'additionalNotes' FROM private.google_sheets_sync_outbox ORDER BY id DESC LIMIT 1), 'Changed notes',
  'an update stores its committed snapshot');

SELECT set_config('request.jwt.claim.sub', '35000000-0000-4000-8000-000000000002', true);
SET LOCAL ROLE authenticated;
SELECT is((SELECT pending_count FROM public.get_google_sheets_sync_status()), 0,
  'another agent cannot see this actor pending event count');
SELECT is((SELECT pending_count FROM public.get_google_sheets_sync_status()), 2,
  'a Team Lead can see global pending event counts');

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '35000000-0000-4000-8000-000000000001', true);
SET LOCAL ROLE authenticated;
DELETE FROM public.interactions WHERE id = '35000000-0000-4000-8000-000000000011';
RESET ROLE;
SELECT is((SELECT action FROM private.google_sheets_sync_outbox ORDER BY id DESC LIMIT 1), 'delete',
  'an interaction delete creates a delete event');
SELECT is((SELECT version FROM private.google_sheets_sync_outbox ORDER BY id DESC LIMIT 1), 3::bigint,
  'a delete advances the interaction version');
SELECT is((SELECT payload->>'clientName' FROM private.google_sheets_sync_outbox ORDER BY id DESC LIMIT 1), 'Sheets Test Client',
  'a delete keeps the old approved snapshot for removal');

CREATE TEMP TABLE first_claims ON COMMIT DROP AS
SELECT * FROM public.claim_google_sheets_sync_events(5);
SELECT is((SELECT count(*)::integer FROM first_claims), 3,
  'the service worker claims the insert, update, and delete events');

UPDATE private.google_sheets_sync_outbox AS queue
SET lease_until = now() - interval '1 second'
FROM first_claims AS claimed
WHERE queue.event_id = claimed.event_id;
CREATE TEMP TABLE reclaimed ON COMMIT DROP AS
SELECT * FROM public.claim_google_sheets_sync_events(5);
SELECT is((SELECT count(*)::integer FROM reclaimed), 3,
  'a new worker reclaims every expired lease');
SELECT ok(NOT EXISTS (
  SELECT 1 FROM first_claims AS old_claim
  JOIN reclaimed AS new_claim USING (event_id)
  WHERE old_claim.lease_id = new_claim.lease_id
), 'a reclaimed event receives a new lease ID');
SELECT is(public.complete_google_sheets_sync_event(
  (SELECT event_id FROM first_claims ORDER BY event_id LIMIT 1),
  (SELECT lease_id FROM first_claims ORDER BY event_id LIMIT 1)
), false, 'a stale worker cannot complete a re-leased event');
SELECT is(public.retry_google_sheets_sync_event(
  (SELECT event_id FROM reclaimed ORDER BY event_id OFFSET 1 LIMIT 1),
  (SELECT lease_id FROM reclaimed ORDER BY event_id OFFSET 1 LIMIT 1),
  'upstream_failure'
), true, 'the worker can return a failed delivery to the retry queue');
SELECT is((SELECT status FROM private.google_sheets_sync_outbox
  WHERE event_id = (SELECT event_id FROM reclaimed ORDER BY event_id OFFSET 1 LIMIT 1)),
  'pending', 'a retry waits in the pending state');
SELECT is(public.complete_google_sheets_sync_event(
  (SELECT event_id FROM reclaimed ORDER BY event_id LIMIT 1),
  (SELECT lease_id FROM reclaimed ORDER BY event_id LIMIT 1)
), true, 'the current worker lease can complete an event');
SELECT is((SELECT count(*)::integer FROM private.google_sheets_sync_outbox
  WHERE event_id = (SELECT event_id FROM reclaimed ORDER BY event_id LIMIT 1)),
  0, 'a completed outbox event is removed');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
