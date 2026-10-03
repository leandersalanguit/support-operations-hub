-- ============================================================================
-- Catalog audit integrity migration
-- Apply after the catalog/resource tables and catalog_audit_logs exist.
-- This migration changes audit permissions and triggers only. Resource row
-- values and existing audit history are preserved.
-- ============================================================================
BEGIN;

ALTER TABLE public.catalog_audit_logs
  DROP CONSTRAINT IF EXISTS catalog_audit_logs_action_check;
ALTER TABLE public.catalog_audit_logs
  ADD CONSTRAINT catalog_audit_logs_action_check
  CHECK (action IN ('create', 'rename', 'update', 'toggle_active', 'reorder', 'delete'));

REVOKE ALL ON TABLE public.catalog_audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.catalog_audit_logs TO authenticated;
DROP POLICY IF EXISTS "Allow authenticated insert to catalog_audit_logs" ON public.catalog_audit_logs;
DROP POLICY IF EXISTS "Allow insert to catalog_audit_logs" ON public.catalog_audit_logs;
DROP POLICY IF EXISTS "Allow team lead insert to catalog_audit_logs" ON public.catalog_audit_logs;

CREATE OR REPLACE FUNCTION public.fn_set_catalog_audit_actor()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.performed_by_id := auth.uid();
  NEW.performed_by := COALESCE(
    NULLIF(auth.jwt() ->> 'email', ''),
    auth.uid()::TEXT,
    current_user
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_set_catalog_audit_actor() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_catalog_audit_logs_set_actor ON public.catalog_audit_logs;
CREATE TRIGGER trg_catalog_audit_logs_set_actor
  BEFORE INSERT ON public.catalog_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_catalog_audit_actor();

CREATE OR REPLACE FUNCTION public.fn_catalog_audit_logs_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_catalog_audit_logs_immutable() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_catalog_audit_logs_immutable ON public.catalog_audit_logs;
CREATE TRIGGER trg_catalog_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.catalog_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_catalog_audit_logs_immutable();

CREATE OR REPLACE FUNCTION public.fn_audit_resource_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
  v_changed_fields JSONB := '{}'::JSONB;
  v_action TEXT;
  v_old_value TEXT;
  v_new_value TEXT;
  v_catalog_type TEXT;
BEGIN
  -- Product renames are logged by the existing cascade trigger.
  IF TG_TABLE_NAME = 'catalog_products'
    AND TG_OP = 'UPDATE'
    AND OLD.name IS DISTINCT FROM NEW.name THEN
    RETURN NEW;
  END IF;

  IF TG_OP <> 'INSERT' THEN v_old := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' AND v_old IS NOT DISTINCT FROM v_new THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new_value := v_new ->> 'name';
    SELECT COALESCE(jsonb_object_agg(field.key, jsonb_build_object('after', field.value)), '{}'::JSONB)
      INTO v_changed_fields FROM jsonb_each(v_new) AS field(key, value);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old_value := v_old ->> 'name';
    SELECT COALESCE(jsonb_object_agg(field.key, jsonb_build_object('before', field.value)), '{}'::JSONB)
      INTO v_changed_fields FROM jsonb_each(v_old) AS field(key, value);
  ELSE
    SELECT COALESCE(jsonb_object_agg(
      field.key,
      jsonb_build_object('before', v_old -> field.key, 'after', field.value)
    ), '{}'::JSONB)
      INTO v_changed_fields
      FROM jsonb_each(v_new) AS field(key, value)
      WHERE v_old -> field.key IS DISTINCT FROM field.value;

    IF v_old ->> 'name' IS DISTINCT FROM v_new ->> 'name' THEN
      v_action := 'rename';
      v_old_value := v_old ->> 'name';
      v_new_value := v_new ->> 'name';
    ELSIF v_old -> 'is_active' IS DISTINCT FROM v_new -> 'is_active' THEN
      v_action := 'toggle_active';
      v_old_value := v_old ->> 'name';
      v_new_value := CASE WHEN (v_new ->> 'is_active')::BOOLEAN THEN 'active' ELSE 'inactive' END;
    ELSIF v_old -> 'display_order' IS DISTINCT FROM v_new -> 'display_order' THEN
      v_action := 'reorder';
      v_old_value := v_old ->> 'display_order';
      v_new_value := v_new ->> 'display_order';
    ELSE
      v_action := 'update';
      v_old_value := v_old ->> 'name';
      v_new_value := v_new ->> 'name';
    END IF;
  END IF;

  v_catalog_type := CASE TG_TABLE_NAME
    WHEN 'catalog_products' THEN 'product'
    WHEN 'case_classifications' THEN 'case_classification'
    WHEN 'installers' THEN 'installer'
    WHEN 'marketing_resources' THEN 'marketing_resource'
    WHEN 'quick_start_guides' THEN 'quick_start_guide'
    WHEN 'recommended_hardware' THEN 'recommended_hardware'
    WHEN 'manuals' THEN 'manual'
    ELSE TG_TABLE_NAME
  END;

  INSERT INTO public.catalog_audit_logs (
    catalog_type, action, old_value, new_value, details, performed_by, performed_by_id
  ) VALUES (
    v_catalog_type, v_action, v_old_value, v_new_value,
    jsonb_build_object(
      'table_name', TG_TABLE_NAME,
      'record_id', COALESCE(v_new ->> 'id', v_old ->> 'id'),
      'changed_fields', v_changed_fields
    ),
    current_user,
    NULL
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_audit_resource_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_audit_catalog_products ON public.catalog_products;
CREATE TRIGGER trg_audit_catalog_products AFTER INSERT OR UPDATE OR DELETE ON public.catalog_products
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_resource_change();
DROP TRIGGER IF EXISTS trg_audit_case_classifications ON public.case_classifications;
CREATE TRIGGER trg_audit_case_classifications AFTER INSERT OR UPDATE OR DELETE ON public.case_classifications
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_resource_change();
DROP TRIGGER IF EXISTS trg_audit_installers ON public.installers;
CREATE TRIGGER trg_audit_installers AFTER INSERT OR UPDATE OR DELETE ON public.installers
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_resource_change();
DROP TRIGGER IF EXISTS trg_audit_marketing_resources ON public.marketing_resources;
CREATE TRIGGER trg_audit_marketing_resources AFTER INSERT OR UPDATE OR DELETE ON public.marketing_resources
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_resource_change();
DROP TRIGGER IF EXISTS trg_audit_quick_start_guides ON public.quick_start_guides;
CREATE TRIGGER trg_audit_quick_start_guides AFTER INSERT OR UPDATE OR DELETE ON public.quick_start_guides
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_resource_change();
DROP TRIGGER IF EXISTS trg_audit_recommended_hardware ON public.recommended_hardware;
CREATE TRIGGER trg_audit_recommended_hardware AFTER INSERT OR UPDATE OR DELETE ON public.recommended_hardware
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_resource_change();
DROP TRIGGER IF EXISTS trg_audit_manuals ON public.manuals;
CREATE TRIGGER trg_audit_manuals AFTER INSERT OR UPDATE OR DELETE ON public.manuals
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_resource_change();

COMMIT;
