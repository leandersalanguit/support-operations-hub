-- Current staff state, least-privilege grants, ownership rules, and database audit.
-- The migration is additive for the reviewed legacy table set. It replaces every
-- existing policy on these tables so permissive historical policies cannot OR in.

-- New objects created by this migration role need deliberate browser grants.
-- Current grants below do not otherwise change privileges for future objects.
-- Per-schema revokes alone cannot remove globally granted default privileges.
ALTER DEFAULT PRIVILEGES REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE TABLE IF NOT EXISTS private.staff_access (
  user_id uuid PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('support_agent', 'team_lead')),
  active boolean NOT NULL DEFAULT false,
  password_change_required boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.staff_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.staff_access FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.staff_access FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE private.staff_access TO service_role;
DROP POLICY IF EXISTS staff_access_service_role_all ON private.staff_access;
CREATE POLICY staff_access_service_role_all ON private.staff_access
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION private.deactivate_deleted_staff_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE private.staff_access
  SET active = false, updated_at = pg_catalog.clock_timestamp()
  WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION private.deactivate_deleted_staff_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_deactivate_deleted_staff_user ON auth.users;
CREATE TRIGGER trg_deactivate_deleted_staff_user BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.deactivate_deleted_staff_user();

CREATE OR REPLACE FUNCTION private.deactivate_deleted_staff_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE private.staff_access
  SET active = false, updated_at = pg_catalog.clock_timestamp()
  WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION private.deactivate_deleted_staff_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_deactivate_deleted_staff_user ON auth.users;
CREATE TRIGGER trg_deactivate_deleted_staff_user BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.deactivate_deleted_staff_user();

CREATE TABLE IF NOT EXISTS private.password_change_attempt_windows (
  user_id uuid PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  attempt_count integer NOT NULL CHECK (attempt_count >= 0)
);
ALTER TABLE private.password_change_attempt_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.password_change_attempt_windows FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.password_change_attempt_windows FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE private.password_change_attempt_windows TO service_role;
DROP POLICY IF EXISTS password_attempts_service_role_all ON private.password_change_attempt_windows;
CREATE POLICY password_attempts_service_role_all ON private.password_change_attempt_windows
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS private.staff_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type = 'password_change_completed'),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.staff_access_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.staff_access_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.staff_access_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE private.staff_access_events TO service_role;
DROP POLICY IF EXISTS staff_access_events_service_role_all ON private.staff_access_events;
CREATE POLICY staff_access_events_service_role_all ON private.staff_access_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.can_use_support_hub()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM private.staff_access AS staff
    WHERE staff.user_id = (SELECT auth.uid())
      AND staff.active IS TRUE
      AND staff.password_change_required IS FALSE
  )
$$;
CREATE OR REPLACE FUNCTION public.is_support_lead()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM private.staff_access AS staff
    WHERE staff.user_id = (SELECT auth.uid())
      AND staff.active IS TRUE
      AND staff.password_change_required IS FALSE
      AND staff.role = 'team_lead'
  )
$$;
CREATE OR REPLACE FUNCTION public.get_my_access_state()
RETURNS TABLE(user_id uuid, role text, active boolean, password_change_required boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT staff.user_id, staff.role, staff.active, staff.password_change_required
  FROM private.staff_access AS staff
  WHERE staff.user_id = (SELECT auth.uid())
$$;
REVOKE ALL ON FUNCTION public.can_use_support_hub() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_support_lead() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_access_state() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_use_support_hub() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_support_lead() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_access_state() TO authenticated;

-- Persistent, atomic attempt window for the trusted password-change function.
CREATE OR REPLACE FUNCTION public.consume_password_change_attempt(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO private.password_change_attempt_windows AS attempt_window
    (user_id, window_started_at, attempt_count)
  VALUES (p_user_id, pg_catalog.clock_timestamp(), 1)
  ON CONFLICT (user_id) DO UPDATE
    SET window_started_at = CASE
          WHEN attempt_window.window_started_at <= pg_catalog.clock_timestamp() - interval '15 minutes'
            THEN pg_catalog.clock_timestamp()
          ELSE attempt_window.window_started_at
        END,
        attempt_count = CASE
          WHEN attempt_window.window_started_at <= pg_catalog.clock_timestamp() - interval '15 minutes'
            THEN 1
          ELSE attempt_window.attempt_count + 1
        END
  RETURNING attempt_count INTO v_count;
  RETURN v_count <= 5;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_required_password_change(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE private.staff_access
  SET password_change_required = false, updated_at = pg_catalog.clock_timestamp()
  WHERE user_id = p_user_id AND active IS TRUE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  INSERT INTO private.staff_access_events (user_id, event_type, occurred_at)
  VALUES (p_user_id, 'password_change_completed', pg_catalog.clock_timestamp());
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_password_change_attempt(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_required_password_change(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_password_change_attempt(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_required_password_change(uuid) TO service_role;

-- Replace all policies on the reviewed business and legacy tables.
DO $$
DECLARE
  v_table text;
  v_policy record;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'interactions','clients','client_products','interaction_edits_audit',
    'deleted_interactions_audit','catalog_products','catalog_audit_logs',
    'case_classifications','catalog_classifications','installers','marketing_resources','quick_start_guides',
    'recommended_hardware','manuals','support_tiers','onboarding_slots','onboarding_sessions'
  ] LOOP
    IF pg_catalog.to_regclass('public.' || v_table) IS NOT NULL THEN
      EXECUTE pg_catalog.format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
      FOR v_policy IN
        SELECT policyname FROM pg_catalog.pg_policies
        WHERE schemaname = 'public' AND tablename = v_table
      LOOP
        EXECUTE pg_catalog.format('DROP POLICY %I ON public.%I', v_policy.policyname, v_table);
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON TABLE public.interactions, public.clients, public.client_products,
  public.catalog_products, public.catalog_audit_logs, public.case_classifications,
  public.installers, public.marketing_resources, public.quick_start_guides,
  public.recommended_hardware, public.manuals, public.support_tiers
FROM PUBLIC, anon, authenticated;
-- Fail closed on any untracked public table, view, or sequence from an older
-- setup. Only the reviewed relations are granted again below.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Keep historical owner UUIDs when an Auth account is removed. The value remains
-- an audit key; it does not assert that the account is still active.
DO $$
DECLARE v_constraint text;
BEGIN
  FOR v_constraint IN
    SELECT constraint_row.conname
    FROM pg_catalog.pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = 'public.interactions'::regclass
      AND constraint_row.contype = 'f'
      AND constraint_row.confrelid = 'auth.users'::regclass
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute AS column_row
        WHERE column_row.attrelid = constraint_row.conrelid
          AND column_row.attname = 'agent_id'
          AND column_row.attnum = ANY (constraint_row.conkey)
      )
  LOOP
    EXECUTE pg_catalog.format('ALTER TABLE public.interactions DROP CONSTRAINT %I', v_constraint);
  END LOOP;
END;
$$;

-- All active staff can read shared customer data. Agents write shared client data;
-- only leads can delete it. An interaction always keeps its initial owner UUID.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients, public.client_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_products,
  public.case_classifications, public.installers, public.marketing_resources,
  public.quick_start_guides, public.recommended_hardware, public.manuals, public.support_tiers
TO authenticated;
GRANT SELECT ON public.catalog_audit_logs TO authenticated;

CREATE POLICY interactions_select_staff ON public.interactions
  FOR SELECT TO authenticated USING ((SELECT public.can_use_support_hub()));
CREATE POLICY interactions_insert_self ON public.interactions
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT public.can_use_support_hub()) AND agent_id = (SELECT auth.uid())
  );
CREATE POLICY interactions_update_owner_or_lead ON public.interactions
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_support_lead()) OR
    ((SELECT public.can_use_support_hub()) AND agent_id = (SELECT auth.uid())))
  WITH CHECK ((SELECT public.can_use_support_hub()));
CREATE POLICY interactions_delete_owner_or_lead ON public.interactions
  FOR DELETE TO authenticated USING ((SELECT public.is_support_lead()) OR
    ((SELECT public.can_use_support_hub()) AND agent_id = (SELECT auth.uid())));

CREATE OR REPLACE FUNCTION private.prevent_interaction_owner_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.agent_id IS DISTINCT FROM OLD.agent_id THEN
    RAISE EXCEPTION 'Interaction owner cannot be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.prevent_interaction_owner_change() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_prevent_interaction_owner_change ON public.interactions;
CREATE TRIGGER trg_prevent_interaction_owner_change BEFORE UPDATE OF agent_id ON public.interactions
  FOR EACH ROW EXECUTE FUNCTION private.prevent_interaction_owner_change();

CREATE POLICY clients_select_staff ON public.clients
  FOR SELECT TO authenticated USING ((SELECT public.can_use_support_hub()));
CREATE POLICY clients_insert_staff ON public.clients
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.can_use_support_hub()));
CREATE POLICY clients_update_staff ON public.clients
  FOR UPDATE TO authenticated USING ((SELECT public.can_use_support_hub()))
  WITH CHECK ((SELECT public.can_use_support_hub()));
CREATE POLICY clients_delete_lead ON public.clients
  FOR DELETE TO authenticated USING ((SELECT public.is_support_lead()));
CREATE POLICY client_products_select_staff ON public.client_products
  FOR SELECT TO authenticated USING ((SELECT public.can_use_support_hub()));
CREATE POLICY client_products_insert_staff ON public.client_products
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.can_use_support_hub()));
CREATE POLICY client_products_update_staff ON public.client_products
  FOR UPDATE TO authenticated USING ((SELECT public.can_use_support_hub()))
  WITH CHECK ((SELECT public.can_use_support_hub()));
CREATE POLICY client_products_delete_lead ON public.client_products
  FOR DELETE TO authenticated USING ((SELECT public.is_support_lead()));

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'catalog_products','case_classifications','installers','marketing_resources',
    'quick_start_guides','recommended_hardware','manuals','support_tiers'
  ] LOOP
    EXECUTE pg_catalog.format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT public.can_use_support_hub()))',
      v_table || '_select_staff', v_table);
    EXECUTE pg_catalog.format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_support_lead()))',
      v_table || '_insert_lead', v_table);
    EXECUTE pg_catalog.format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT public.is_support_lead())) WITH CHECK ((SELECT public.is_support_lead()))',
      v_table || '_update_lead', v_table);
    EXECUTE pg_catalog.format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT public.is_support_lead()))',
      v_table || '_delete_lead', v_table);
  END LOOP;
END;
$$;

CREATE POLICY catalog_audit_select_lead ON public.catalog_audit_logs
  FOR SELECT TO authenticated USING ((SELECT public.is_support_lead()));
DO $$
BEGIN
  IF pg_catalog.to_regclass('public.interaction_edits_audit') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.interaction_edits_audit TO authenticated';
    EXECUTE 'CREATE POLICY legacy_edit_audit_select_lead ON public.interaction_edits_audit FOR SELECT TO authenticated USING ((SELECT public.is_support_lead()))';
  END IF;
  IF pg_catalog.to_regclass('public.deleted_interactions_audit') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.deleted_interactions_audit TO authenticated';
    EXECUTE 'CREATE POLICY legacy_deleted_audit_select_lead ON public.deleted_interactions_audit FOR SELECT TO authenticated USING ((SELECT public.is_support_lead()))';
  END IF;
END;
$$;

-- Preserve immutable catalog audit history and atomic logging for catalog edits.
CREATE OR REPLACE FUNCTION private.prevent_catalog_audit_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Catalog audit rows are immutable' USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION private.prevent_catalog_audit_change() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_catalog_audit_logs_immutable ON public.catalog_audit_logs;
CREATE TRIGGER trg_catalog_audit_logs_immutable BEFORE UPDATE OR DELETE ON public.catalog_audit_logs
  FOR EACH ROW EXECUTE FUNCTION private.prevent_catalog_audit_change();

CREATE OR REPLACE FUNCTION private.audit_catalog_resource_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_fields jsonb := '{}'::jsonb;
  v_action text;
  v_type text;
  v_old_value text;
  v_new_value text;
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR public.can_use_support_hub() IS NOT TRUE THEN
    RAISE EXCEPTION 'Active staff access required' USING ERRCODE = '42501';
  END IF;
  IF TG_TABLE_NAME = 'catalog_products' AND TG_OP = 'UPDATE' AND OLD.name IS DISTINCT FROM NEW.name THEN
    RETURN NEW;
  END IF;
  IF TG_OP <> 'INSERT' THEN v_before := pg_catalog.to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_after := pg_catalog.to_jsonb(NEW); END IF;
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new_value := v_after ->> 'name';
    SELECT COALESCE(pg_catalog.jsonb_object_agg(field.key,
      pg_catalog.jsonb_build_object('after', field.value)), '{}'::jsonb)
      INTO v_fields FROM pg_catalog.jsonb_each(v_after) AS field(key, value);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old_value := v_before ->> 'name';
    SELECT COALESCE(pg_catalog.jsonb_object_agg(field.key,
      pg_catalog.jsonb_build_object('before', field.value)), '{}'::jsonb)
      INTO v_fields FROM pg_catalog.jsonb_each(v_before) AS field(key, value);
  ELSE
    IF v_before IS NOT DISTINCT FROM v_after THEN RETURN NEW; END IF;
    SELECT COALESCE(pg_catalog.jsonb_object_agg(field.key,
      pg_catalog.jsonb_build_object('before', v_before -> field.key, 'after', field.value)), '{}'::jsonb)
      INTO v_fields FROM pg_catalog.jsonb_each(v_after) AS field(key, value)
      WHERE v_before -> field.key IS DISTINCT FROM field.value;
    IF v_before ->> 'name' IS DISTINCT FROM v_after ->> 'name' THEN
      v_action := 'rename'; v_old_value := v_before ->> 'name'; v_new_value := v_after ->> 'name';
    ELSIF v_before -> 'is_active' IS DISTINCT FROM v_after -> 'is_active' THEN
      v_action := 'toggle_active'; v_old_value := v_before ->> 'name';
      v_new_value := CASE WHEN (v_after ->> 'is_active')::boolean THEN 'active' ELSE 'inactive' END;
    ELSIF v_before -> 'display_order' IS DISTINCT FROM v_after -> 'display_order' THEN
      v_action := 'reorder'; v_old_value := v_before ->> 'display_order'; v_new_value := v_after ->> 'display_order';
    ELSE
      v_action := 'update'; v_old_value := v_before ->> 'name'; v_new_value := v_after ->> 'name';
    END IF;
  END IF;
  v_type := CASE TG_TABLE_NAME
    WHEN 'catalog_products' THEN 'product'
    WHEN 'case_classifications' THEN 'case_classification'
    WHEN 'installers' THEN 'installer'
    WHEN 'marketing_resources' THEN 'marketing_resource'
    WHEN 'quick_start_guides' THEN 'quick_start_guide'
    WHEN 'recommended_hardware' THEN 'recommended_hardware'
    WHEN 'manuals' THEN 'manual'
    ELSE TG_TABLE_NAME END;
  INSERT INTO public.catalog_audit_logs
    (catalog_type, action, old_value, new_value, details, performed_by, performed_by_id, created_at)
  VALUES (v_type, v_action, v_old_value, v_new_value,
    pg_catalog.jsonb_build_object('table_name', TG_TABLE_NAME,
      'record_id', COALESCE(v_after ->> 'id', v_before ->> 'id'), 'changed_fields', v_fields),
    COALESCE(NULLIF(auth.jwt() ->> 'email',''), v_actor::text), v_actor, pg_catalog.clock_timestamp());
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.audit_catalog_resource_change() FROM PUBLIC, anon, authenticated;
DO $$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['catalog_products','case_classifications','installers',
    'marketing_resources','quick_start_guides','recommended_hardware','manuals'] LOOP
    EXECUTE pg_catalog.format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', v_table, v_table);
    EXECUTE pg_catalog.format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.audit_catalog_resource_change()',
      'trg_audit_' || v_table, v_table);
  END LOOP;
END;
$$;

-- Onboarding is unused in this release. Keep the records for recovery but deny
-- all browser roles, including authenticated staff.

CREATE TABLE IF NOT EXISTS public.interaction_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  action text NOT NULL CHECK (action IN ('insert','update','delete')),
  before_snapshot jsonb,
  after_snapshot jsonb
);
CREATE INDEX IF NOT EXISTS idx_interaction_audit_events_interaction_time
  ON public.interaction_audit_events(interaction_id, occurred_at DESC);
ALTER TABLE public.interaction_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.interaction_audit_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.interaction_audit_events TO authenticated;
CREATE POLICY interaction_audit_read_lead ON public.interaction_audit_events
  FOR SELECT TO authenticated USING ((SELECT public.is_support_lead()));

CREATE OR REPLACE FUNCTION private.audit_interaction_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_before jsonb;
  v_after jsonb;
  v_id uuid;
BEGIN
  IF v_actor IS NULL OR public.can_use_support_hub() IS NOT TRUE THEN
    RAISE EXCEPTION 'Active staff access required' USING ERRCODE = '42501';
  END IF;
  IF TG_OP <> 'INSERT' THEN
    v_before := pg_catalog.jsonb_build_object(
      'id', OLD.id, 'created_at', OLD.created_at, 'date', OLD.date,
      'day_of_week', OLD.day_of_week, 'time', OLD.time, 'agent', OLD.agent,
      'agent_id', OLD.agent_id, 'client_id', OLD.client_id,
      'client_name', OLD.client_name, 'channel', OLD.channel,
      'channel_details', OLD.channel_details, 'client_product', OLD.client_product,
      'case_classification', OLD.case_classification, 'status', OLD.status,
      'license', OLD.license, 'in_event', OLD.in_event,
      'first_time_user', OLD.first_time_user, 'additional_notes', OLD.additional_notes,
      'last_modified_by', OLD.last_modified_by, 'last_modified_at', OLD.last_modified_at
    );
    v_id := OLD.id;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_after := pg_catalog.jsonb_build_object(
      'id', NEW.id, 'created_at', NEW.created_at, 'date', NEW.date,
      'day_of_week', NEW.day_of_week, 'time', NEW.time, 'agent', NEW.agent,
      'agent_id', NEW.agent_id, 'client_id', NEW.client_id,
      'client_name', NEW.client_name, 'channel', NEW.channel,
      'channel_details', NEW.channel_details, 'client_product', NEW.client_product,
      'case_classification', NEW.case_classification, 'status', NEW.status,
      'license', NEW.license, 'in_event', NEW.in_event,
      'first_time_user', NEW.first_time_user, 'additional_notes', NEW.additional_notes,
      'last_modified_by', NEW.last_modified_by, 'last_modified_at', NEW.last_modified_at
    );
    v_id := NEW.id;
  END IF;
  INSERT INTO public.interaction_audit_events
    (interaction_id, actor_user_id, occurred_at, action, before_snapshot, after_snapshot)
  VALUES (v_id, v_actor, pg_catalog.clock_timestamp(), pg_catalog.lower(TG_OP), v_before, v_after);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.audit_interaction_change() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_audit_interaction_change ON public.interactions;
CREATE TRIGGER trg_audit_interaction_change AFTER INSERT OR UPDATE OR DELETE ON public.interactions
  FOR EACH ROW EXECUTE FUNCTION private.audit_interaction_change();

-- Preserve catalog rename cascade and audit behavior behind a lead-only RPC.
CREATE OR REPLACE FUNCTION private.cascade_catalog_product_rename()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor text := COALESCE(NULLIF(auth.jwt() ->> 'email',''), auth.uid()::text, current_user);
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    DELETE FROM public.client_products old_link
    WHERE old_link.product_name = OLD.name AND EXISTS (
      SELECT 1 FROM public.client_products new_link
      WHERE new_link.client_id = old_link.client_id AND new_link.product_name = NEW.name
    );
    UPDATE public.client_products SET product_name = NEW.name WHERE product_name = OLD.name;
    UPDATE public.interactions SET client_product = NEW.name WHERE client_product = OLD.name;
    UPDATE public.onboarding_sessions SET product = NEW.name WHERE product = OLD.name;
    UPDATE public.installers SET compatible_products = array_replace(compatible_products, OLD.name, NEW.name)
      WHERE OLD.name = ANY(compatible_products);
    UPDATE public.recommended_hardware SET compatible_products = array_replace(compatible_products, OLD.name, NEW.name)
      WHERE OLD.name = ANY(compatible_products);
    UPDATE public.manuals SET compatible_products = array_replace(compatible_products, OLD.name, NEW.name)
      WHERE OLD.name = ANY(compatible_products);
    UPDATE public.quick_start_guides SET compatible_products = array_replace(compatible_products, OLD.name, NEW.name)
      WHERE OLD.name = ANY(compatible_products);
    INSERT INTO public.catalog_audit_logs
      (catalog_type, action, old_value, new_value, details, performed_by, performed_by_id, created_at)
    VALUES ('product', 'rename', OLD.name, NEW.name,
      pg_catalog.jsonb_build_object('product_id', NEW.id, 'source', 'postgres_trigger'),
      v_actor, auth.uid(), pg_catalog.clock_timestamp());
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.cascade_catalog_product_rename() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_catalog_product_rename ON public.catalog_products;
CREATE TRIGGER trg_catalog_product_rename AFTER UPDATE OF name ON public.catalog_products
  FOR EACH ROW EXECUTE FUNCTION private.cascade_catalog_product_rename();

CREATE OR REPLACE FUNCTION public.rename_catalog_product(
  p_old_name text, p_new_name text, p_agent_name text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_id uuid;
  v_old text := pg_catalog.btrim(p_old_name);
  v_new text := pg_catalog.btrim(p_new_name);
  v_clients integer;
  v_interactions integer;
  v_sessions integer;
BEGIN
  IF public.is_support_lead() IS NOT TRUE THEN
    RAISE EXCEPTION 'Team lead privileges required' USING ERRCODE = '42501';
  END IF;
  IF v_old IS NULL OR v_old = '' OR v_new IS NULL OR v_new = '' THEN
    RAISE EXCEPTION 'Both old and new product names are required';
  END IF;
  IF v_old = v_new THEN
    RETURN pg_catalog.jsonb_build_object('success',true,'message','Product name unchanged',
      'old_name',v_old,'new_name',v_new,'affected_clients',0,'affected_interactions',0);
  END IF;
  SELECT id INTO v_id FROM public.catalog_products WHERE name = v_old FOR UPDATE;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Product was not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.catalog_products WHERE name = v_new AND id <> v_id) THEN
    RAISE EXCEPTION 'Another product with that name already exists';
  END IF;
  SELECT count(*) INTO v_clients FROM public.client_products WHERE product_name = v_old;
  SELECT count(*) INTO v_interactions FROM public.interactions WHERE client_product = v_old;
  SELECT count(*) INTO v_sessions FROM public.onboarding_sessions WHERE product = v_old;
  UPDATE public.catalog_products SET name = v_new, updated_at = pg_catalog.clock_timestamp() WHERE id = v_id;
  RETURN pg_catalog.jsonb_build_object('success',true,'product_id',v_id,'old_name',v_old,'new_name',v_new,
    'affected_clients',v_clients,'affected_interactions',v_interactions,'affected_sessions',v_sessions,
    'performed_by',COALESCE(NULLIF(auth.jwt() ->> 'email',''), auth.uid()::text, current_user));
END;
$$;
CREATE OR REPLACE FUNCTION public.get_catalog_product_stats()
RETURNS TABLE(id uuid, name text, is_active boolean, display_order integer,
  client_count bigint, interaction_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF public.is_support_lead() IS NOT TRUE THEN
    RAISE EXCEPTION 'Team lead privileges required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT product.id, product.name, product.is_active, product.display_order,
    COALESCE(clients.client_count, 0::bigint), COALESCE(interactions.interaction_count, 0::bigint)
  FROM public.catalog_products AS product
  LEFT JOIN (
    SELECT product_name, count(DISTINCT client_id) AS client_count
    FROM public.client_products GROUP BY product_name
  ) AS clients ON clients.product_name = product.name
  LEFT JOIN (
    SELECT client_product, count(*) AS interaction_count
    FROM public.interactions GROUP BY client_product
  ) AS interactions ON interactions.client_product = product.name
  ORDER BY product.display_order ASC, product.name ASC;
END;
$$;
REVOKE ALL ON FUNCTION public.rename_catalog_product(text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_catalog_product_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rename_catalog_product(text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_catalog_product_stats() TO authenticated;

-- Remove default PUBLIC function execution from every public RPC. The explicit
-- grants above and the three current-state helpers are the approved browser API.
DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.can_use_support_hub() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_support_lead() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_access_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_catalog_product(text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_catalog_product_stats() TO authenticated;
