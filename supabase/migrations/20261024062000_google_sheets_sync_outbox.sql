CREATE TABLE private.google_sheets_sync_versions (
  interaction_id uuid PRIMARY KEY,
  version bigint NOT NULL CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE private.google_sheets_sync_outbox (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  interaction_id uuid NOT NULL,
  version bigint NOT NULL CHECK (version > 0),
  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  payload jsonb NOT NULL,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_id uuid,
  lease_until timestamptz,
  last_error_code text CHECK (last_error_code IS NULL OR last_error_code IN (
    'upstream_failure', 'invalid_upstream_response', 'upstream_timeout'
  )),
  UNIQUE (interaction_id, version),
  CHECK ((status = 'processing') = (lease_id IS NOT NULL AND lease_until IS NOT NULL))
);

CREATE INDEX google_sheets_sync_outbox_due_idx
  ON private.google_sheets_sync_outbox (next_attempt_at, event_id)
  WHERE status IN ('pending', 'processing');
CREATE INDEX google_sheets_sync_outbox_actor_idx
  ON private.google_sheets_sync_outbox (actor_id, status);

ALTER TABLE private.google_sheets_sync_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.google_sheets_sync_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.google_sheets_sync_versions,
  private.google_sheets_sync_outbox FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.enqueue_google_sheets_sync_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_interaction public.interactions%ROWTYPE;
  v_action text;
  v_version bigint;
  v_payload jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_interaction := OLD;
    v_action := 'delete';
  ELSE
    v_interaction := NEW;
    v_action := CASE WHEN TG_OP = 'INSERT' THEN 'insert' ELSE 'update' END;
  END IF;

  INSERT INTO private.google_sheets_sync_versions AS version_state (interaction_id, version)
  VALUES (v_interaction.id, 1)
  ON CONFLICT (interaction_id) DO UPDATE
    SET version = version_state.version + 1,
        updated_at = now()
  RETURNING version INTO v_version;

  v_payload := jsonb_build_object(
    'id', v_interaction.id::text,
    'createdAt', v_interaction.created_at,
    'date', to_char(v_interaction.date, 'YYYY-MM-DD'),
    'dayOfWeek', v_interaction.day_of_week,
    'time', coalesce(v_interaction.time::text, ''),
    'agent', v_interaction.agent,
    'clientName', v_interaction.client_name,
    'channel', v_interaction.channel,
    'channelDetails', coalesce(v_interaction.channel_details, ''),
    'clientProduct', v_interaction.client_product,
    'caseClassification', v_interaction.case_classification,
    'status', v_interaction.status,
    'license', coalesce(v_interaction.license, 'support_active'),
    'inEvent', coalesce(v_interaction.in_event, false),
    'firstTimeUser', coalesce(v_interaction.first_time_user, false),
    'additionalNotes', coalesce(v_interaction.additional_notes, '')
  );

  INSERT INTO private.google_sheets_sync_outbox (
    interaction_id, version, action, payload, actor_id
  ) VALUES (
    v_interaction.id, v_version, v_action, v_payload, auth.uid()
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.enqueue_google_sheets_sync_event() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_enqueue_google_sheets_sync_event
AFTER INSERT OR UPDATE OR DELETE ON public.interactions
FOR EACH ROW EXECUTE FUNCTION private.enqueue_google_sheets_sync_event();

CREATE OR REPLACE FUNCTION public.claim_google_sheets_sync_events(p_limit integer DEFAULT 5)
RETURNS TABLE(event_id bigint, lease_id uuid, action text, version bigint, payload jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 5 THEN
    RAISE EXCEPTION 'Invalid batch size' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT queue.event_id
    FROM private.google_sheets_sync_outbox AS queue
    WHERE (queue.status = 'pending' AND queue.next_attempt_at <= now())
       OR (queue.status = 'processing' AND queue.lease_until < now())
    ORDER BY queue.event_id
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  ), claimed AS (
    UPDATE private.google_sheets_sync_outbox AS queue
    SET status = 'processing',
        attempt_count = queue.attempt_count + 1,
        lease_id = extensions.gen_random_uuid(),
        lease_until = now() + interval '3 minutes'
    FROM candidates
    WHERE queue.event_id = candidates.event_id
    RETURNING queue.event_id, queue.lease_id, queue.action, queue.version, queue.payload
  )
  SELECT claimed.event_id, claimed.lease_id, claimed.action, claimed.version, claimed.payload
  FROM claimed
  ORDER BY claimed.event_id;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_google_sheets_sync_events(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_google_sheets_sync_events(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_google_sheets_sync_event(p_event_id bigint, p_lease_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM private.google_sheets_sync_outbox
  WHERE event_id = p_event_id AND status = 'processing' AND lease_id = p_lease_id;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_google_sheets_sync_event(bigint, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_google_sheets_sync_event(bigint, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.retry_google_sheets_sync_event(
  p_event_id bigint,
  p_lease_id uuid,
  p_error_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempt_count integer;
BEGIN
  IF p_error_code NOT IN ('upstream_failure', 'invalid_upstream_response', 'upstream_timeout') THEN
    RETURN false;
  END IF;

  SELECT queue.attempt_count INTO v_attempt_count
  FROM private.google_sheets_sync_outbox AS queue
  WHERE queue.event_id = p_event_id
    AND queue.status = 'processing'
    AND queue.lease_id = p_lease_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE private.google_sheets_sync_outbox AS queue
  SET status = CASE WHEN v_attempt_count >= 8 THEN 'failed' ELSE 'pending' END,
      next_attempt_at = now() + make_interval(secs => least(600, 5 * power(2::numeric, least(v_attempt_count - 1, 7)))::integer),
      lease_id = NULL,
      lease_until = NULL,
      last_error_code = p_error_code
  WHERE queue.event_id = p_event_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.retry_google_sheets_sync_event(bigint, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retry_google_sheets_sync_event(bigint, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_google_sheets_sync_status()
RETURNS TABLE(pending_count integer, failed_count integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_is_lead boolean;
BEGIN
  IF v_actor_id IS NULL OR public.can_use_support_hub() IS NOT TRUE THEN
    RAISE EXCEPTION 'Active staff access is required' USING ERRCODE = '42501';
  END IF;

  v_is_lead := public.is_support_lead() IS TRUE;
  RETURN QUERY
  SELECT
    count(*) FILTER (WHERE queue.status IN ('pending', 'processing'))::integer,
    count(*) FILTER (WHERE queue.status = 'failed')::integer
  FROM private.google_sheets_sync_outbox AS queue
  WHERE v_is_lead OR queue.actor_id = v_actor_id;
END;
$$;
REVOKE ALL ON FUNCTION public.get_google_sheets_sync_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_google_sheets_sync_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.retry_my_failed_google_sheets_sync_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_is_lead boolean;
  v_requeued integer;
BEGIN
  IF v_actor_id IS NULL OR public.can_use_support_hub() IS NOT TRUE THEN
    RAISE EXCEPTION 'Active staff access is required' USING ERRCODE = '42501';
  END IF;

  v_is_lead := public.is_support_lead() IS TRUE;
  UPDATE private.google_sheets_sync_outbox AS queue
  SET status = 'pending',
      attempt_count = 0,
      next_attempt_at = now(),
      last_error_code = NULL
  WHERE queue.status = 'failed'
    AND (v_is_lead OR queue.actor_id = v_actor_id);
  GET DIAGNOSTICS v_requeued = ROW_COUNT;
  RETURN v_requeued;
END;
$$;
REVOKE ALL ON FUNCTION public.retry_my_failed_google_sheets_sync_events() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retry_my_failed_google_sheets_sync_events() TO authenticated;
