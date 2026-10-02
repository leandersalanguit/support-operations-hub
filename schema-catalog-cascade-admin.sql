-- ==============================================================================
-- Support Operations Hub - Catalog Cascading & Admin Audit Schema Migration
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- to initialize:
--   1. Master Catalog Audit Log (public.catalog_audit_logs)
--   2. Automated Recursive Cascade Trigger (trg_catalog_product_rename)
--   3. Atomic Catalog Rename RPC Stored Procedure (rename_catalog_product)
--   4. Catalog Product Statistics Query RPC (get_catalog_product_stats)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CATALOG PRODUCTS MASTER TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalog_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT DEFAULT 'hardware',
  is_active BOOLEAN DEFAULT true NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_catalog_products_name ON public.catalog_products (name);
CREATE INDEX IF NOT EXISTS idx_catalog_products_active_order ON public.catalog_products (is_active, display_order);

-- Enable RLS
ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;
-- Remove legacy policies that granted anonymous catalog reads or writes.
DROP POLICY IF EXISTS "Allow select catalog_products" ON public.catalog_products;
DROP POLICY IF EXISTS "Allow modify catalog_products" ON public.catalog_products;

-- Expose catalog data only to signed-in users; writes are further restricted by RLS.
REVOKE ALL ON TABLE public.catalog_products FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.catalog_products TO authenticated;

-- Read policy: Allow authenticated users to view catalog products
DROP POLICY IF EXISTS "Allow authenticated read to catalog_products" ON public.catalog_products;
CREATE POLICY "Allow authenticated read to catalog_products" ON public.catalog_products
  FOR SELECT TO authenticated USING (true);

-- Write policies: Allow authenticated team members to insert/update/delete
DROP POLICY IF EXISTS "Allow authenticated insert to catalog_products" ON public.catalog_products;
CREATE POLICY "Allow authenticated insert to catalog_products" ON public.catalog_products
  FOR INSERT TO authenticated WITH CHECK (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role')
      IN ('team_lead', 'lead', 'admin')
  );

DROP POLICY IF EXISTS "Allow authenticated update to catalog_products" ON public.catalog_products;
CREATE POLICY "Allow authenticated update to catalog_products" ON public.catalog_products
  FOR UPDATE TO authenticated USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role')
      IN ('team_lead', 'lead', 'admin')
  ) WITH CHECK (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role')
      IN ('team_lead', 'lead', 'admin')
  );

DROP POLICY IF EXISTS "Allow authenticated delete to catalog_products" ON public.catalog_products;
CREATE POLICY "Allow authenticated delete to catalog_products" ON public.catalog_products
  FOR DELETE TO authenticated USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role')
      IN ('team_lead', 'lead', 'admin')
  );


-- ------------------------------------------------------------------------------
-- 2. CATALOG AUDIT LOG TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalog_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_type TEXT NOT NULL DEFAULT 'product',
  action TEXT NOT NULL CHECK (action IN ('create', 'rename', 'toggle_active', 'reorder', 'delete')),
  old_value TEXT,
  new_value TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  performed_by TEXT NOT NULL,
  performed_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_catalog_audit_type_date 
  ON public.catalog_audit_logs (catalog_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_catalog_audit_action 
  ON public.catalog_audit_logs (action);

-- Enable RLS
ALTER TABLE public.catalog_audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit data is restricted to team leads. Revoke any earlier public grants so
-- re-running this script also removes the prior anonymous access.
REVOKE ALL ON TABLE public.catalog_audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.catalog_audit_logs TO authenticated;

DROP POLICY IF EXISTS "Allow authenticated read to catalog_audit_logs" ON public.catalog_audit_logs;
DROP POLICY IF EXISTS "Allow read to catalog_audit_logs" ON public.catalog_audit_logs;
DROP POLICY IF EXISTS "Allow team lead read to catalog_audit_logs" ON public.catalog_audit_logs;
CREATE POLICY "Allow team lead read to catalog_audit_logs" ON public.catalog_audit_logs
  FOR SELECT TO authenticated
  USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role')
      IN ('team_lead', 'lead', 'admin')
  );

DROP POLICY IF EXISTS "Allow authenticated insert to catalog_audit_logs" ON public.catalog_audit_logs;
DROP POLICY IF EXISTS "Allow insert to catalog_audit_logs" ON public.catalog_audit_logs;
DROP POLICY IF EXISTS "Allow team lead insert to catalog_audit_logs" ON public.catalog_audit_logs;
CREATE POLICY "Allow team lead insert to catalog_audit_logs" ON public.catalog_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role')
      IN ('team_lead', 'lead', 'admin')
  );


-- ------------------------------------------------------------------------------
-- 2. AUTOMATED RECURSIVE CASCADE TRIGGER
-- ------------------------------------------------------------------------------
-- Whenever a product name is modified in public.catalog_products (via Supabase
-- Dashboard Table Editor, SQL query, or RPC), this trigger automatically cascades
-- the new name across all child tables and records an audit log entry.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_cascade_catalog_product_rename()
RETURNS TRIGGER AS $$
DECLARE
  v_actor TEXT;
BEGIN
  -- Only execute if the product name was actually changed
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    -- Extract actor from JWT session claims or fallback to system user
    v_actor := COALESCE(
      NULLIF(current_setting('request.jwt.claim.email', true), ''),
      NULLIF(current_setting('request.jwt.claim.name', true), ''),
      NULLIF(current_setting('request.jwt.claim.sub', true), ''),
      current_user
    );

    -- 1. Deduplicate client_products to prevent UNIQUE(client_id, product_name) collision
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'client_products') THEN
      DELETE FROM public.client_products cp_old
      WHERE cp_old.product_name = OLD.name
        AND EXISTS (
          SELECT 1 FROM public.client_products cp_new
          WHERE cp_new.client_id = cp_old.client_id AND cp_new.product_name = NEW.name
        );

      -- Cascade rename to client_products
      UPDATE public.client_products
      SET product_name = NEW.name
      WHERE product_name = OLD.name;
    END IF;

    -- 2. Cascade rename to interactions (shift support logs)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'interactions') THEN
      UPDATE public.interactions
      SET client_product = NEW.name
      WHERE client_product = OLD.name;
    END IF;

    -- 3. Cascade rename to onboarding_sessions (if scheduler table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_sessions') THEN
      UPDATE public.onboarding_sessions
      SET product = NEW.name
      WHERE product = OLD.name;
    END IF;

    -- 4. Cascade rename in compatible_products text arrays across resource tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'installers') THEN
      UPDATE public.installers
      SET compatible_products = array_replace(compatible_products, OLD.name, NEW.name)
      WHERE OLD.name = ANY(compatible_products);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recommended_hardware') THEN
      UPDATE public.recommended_hardware
      SET compatible_products = array_replace(compatible_products, OLD.name, NEW.name)
      WHERE OLD.name = ANY(compatible_products);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'manuals') THEN
      UPDATE public.manuals
      SET compatible_products = array_replace(compatible_products, OLD.name, NEW.name)
      WHERE OLD.name = ANY(compatible_products);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quick_start_guides') THEN
      UPDATE public.quick_start_guides
      SET compatible_products = array_replace(compatible_products, OLD.name, NEW.name)
      WHERE OLD.name = ANY(compatible_products);
    END IF;

    -- 5. Update scalar column in audit tables while keeping JSON snapshots intact
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'interaction_edits_audit') THEN
      UPDATE public.interaction_edits_audit
      SET client_product = NEW.name
      WHERE client_product = OLD.name;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deleted_interactions_audit') THEN
      UPDATE public.deleted_interactions_audit
      SET client_product = NEW.name
      WHERE client_product = OLD.name;
    END IF;

    -- 6. Insert audit record in catalog_audit_logs
    INSERT INTO public.catalog_audit_logs (
      catalog_type,
      action,
      old_value,
      new_value,
      details,
      performed_by,
      created_at
    ) VALUES (
      'product',
      'rename',
      OLD.name,
      NEW.name,
      jsonb_build_object(
        'product_id', NEW.id,
        'source', 'postgres_trigger'
      ),
      v_actor,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Rebind trigger to public.catalog_products
DROP TRIGGER IF EXISTS trg_catalog_product_rename ON public.catalog_products;
CREATE TRIGGER trg_catalog_product_rename
  AFTER UPDATE OF name ON public.catalog_products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cascade_catalog_product_rename();


-- ------------------------------------------------------------------------------
-- 3. ATOMIC STORED PROCEDURE (RPC) FOR IN-APP PRODUCT RENAMING
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rename_catalog_product(
  p_old_name TEXT,
  p_new_name TEXT,
  p_agent_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_product_id UUID;
  v_trimmed_old TEXT := trim(p_old_name);
  v_trimmed_new TEXT := trim(p_new_name);
  v_actor TEXT;
  v_affected_clients INT := 0;
  v_affected_interactions INT := 0;
  v_affected_sessions INT := 0;
BEGIN
  IF COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'),
    false
  ) IS NOT TRUE THEN
    RAISE EXCEPTION 'Team lead privileges required.' USING ERRCODE = '42501';
  END IF;

  IF v_trimmed_old = '' OR v_trimmed_new = '' THEN
    RAISE EXCEPTION 'Both old and new product names are required.';
  END IF;

  IF v_trimmed_old = v_trimmed_new THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Product name unchanged',
      'old_name', v_trimmed_old,
      'new_name', v_trimmed_new,
      'affected_clients', 0,
      'affected_interactions', 0
    );
  END IF;

  -- 1. Find target product (with row-level lock to prevent concurrent rename race conditions)
  SELECT id INTO v_product_id
  FROM public.catalog_products
  WHERE name = v_trimmed_old
  FOR UPDATE;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'Product "%" was not found in catalog_products.', v_trimmed_old;
  END IF;

  -- Check if destination name already exists on another product
  IF EXISTS (SELECT 1 FROM public.catalog_products WHERE name = v_trimmed_new AND id <> v_product_id) THEN
    RAISE EXCEPTION 'Another product named "%" already exists in the catalog.', v_trimmed_new;
  END IF;

  -- Calculate counts for response
  SELECT count(*) INTO v_affected_clients
  FROM public.client_products
  WHERE product_name = v_trimmed_old;

  SELECT count(*) INTO v_affected_interactions
  FROM public.interactions
  WHERE client_product = v_trimmed_old;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_sessions') THEN
    SELECT count(*) INTO v_affected_sessions
    FROM public.onboarding_sessions
    WHERE product = v_trimmed_old;
  END IF;

  -- 2. Update catalog_products (This will invoke fn_cascade_catalog_product_rename)
  UPDATE public.catalog_products
  SET name = v_trimmed_new
  WHERE id = v_product_id;

  -- 3. If explicit agent name was supplied, record it in audit log
  v_actor := COALESCE(
    NULLIF(p_agent_name, ''),
    NULLIF(current_setting('request.jwt.claim.name', true), ''),
    NULLIF(current_setting('request.jwt.claim.email', true), ''),
    current_user
  );

  -- Update performed_by in latest audit entry if trigger just inserted it with system actor
  UPDATE public.catalog_audit_logs
  SET performed_by = v_actor
  WHERE id = (
    SELECT id FROM public.catalog_audit_logs
    WHERE catalog_type = 'product' AND action = 'rename' AND old_value = v_trimmed_old AND new_value = v_trimmed_new
    ORDER BY created_at DESC
    LIMIT 1
  );

  RETURN jsonb_build_object(
    'success', true,
    'product_id', v_product_id,
    'old_name', v_trimmed_old,
    'new_name', v_trimmed_new,
    'affected_clients', v_affected_clients,
    'affected_interactions', v_affected_interactions,
    'affected_sessions', v_affected_sessions,
    'performed_by', v_actor
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ------------------------------------------------------------------------------
-- 4. STATS RPC FOR ADMIN DASHBOARD
-- ------------------------------------------------------------------------------
-- Returns all catalog products enriched with live CRM client ownership counts
-- and interaction log usage counts for high-visibility management.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_catalog_product_stats()
RETURNS TABLE (
  id UUID,
  name TEXT,
  is_active BOOLEAN,
  display_order INT,
  client_count BIGINT,
  interaction_count BIGINT
) AS $$
BEGIN
  IF COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'),
    false
  ) IS NOT TRUE THEN
    RAISE EXCEPTION 'Team lead privileges required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT 
    cp.id,
    cp.name,
    cp.is_active,
    cp.display_order,
    COALESCE(clp.c_count, 0::BIGINT) AS client_count,
    COALESCE(it.i_count, 0::BIGINT) AS interaction_count
  FROM public.catalog_products cp
  LEFT JOIN (
    SELECT product_name, count(DISTINCT client_id) AS c_count
    FROM public.client_products
    GROUP BY product_name
  ) clp ON clp.product_name = cp.name
  LEFT JOIN (
    SELECT client_product, count(*) AS i_count
    FROM public.interactions
    GROUP BY client_product
  ) it ON it.client_product = cp.name
  ORDER BY cp.display_order ASC, cp.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Remove inherited/default public access as well as any prior anonymous grants.
REVOKE ALL ON FUNCTION public.fn_cascade_catalog_product_rename() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rename_catalog_product(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_catalog_product_stats() FROM PUBLIC, anon, authenticated;

-- The RPCs are callable by authenticated users, but enforce the team-lead role internally.
GRANT EXECUTE ON FUNCTION public.rename_catalog_product(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_catalog_product_stats() TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. Harden access to every other exposed public table
-- ------------------------------------------------------------------------------
-- Reference data is available only to signed-in users. Client, interaction, and audit
-- data also require an authenticated session.
-- Keep grants narrow: RLS does not restrict TRUNCATE/REFERENCES/TRIGGER privileges.

ALTER TABLE public.case_classifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.case_classifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.case_classifications TO authenticated;
DROP POLICY IF EXISTS "Allow modify case_classifications" ON public.case_classifications;
DROP POLICY IF EXISTS "Allow select case_classifications" ON public.case_classifications;
DROP POLICY IF EXISTS "Allow authenticated read case_classifications" ON public.case_classifications;
CREATE POLICY "Allow authenticated read case_classifications" ON public.case_classifications
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow team lead insert case_classifications" ON public.case_classifications;
CREATE POLICY "Allow team lead insert case_classifications" ON public.case_classifications
  FOR INSERT TO authenticated WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
DROP POLICY IF EXISTS "Allow team lead update case_classifications" ON public.case_classifications;
CREATE POLICY "Allow team lead update case_classifications" ON public.case_classifications
  FOR UPDATE TO authenticated USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin')) WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
DROP POLICY IF EXISTS "Allow team lead delete case_classifications" ON public.case_classifications;
CREATE POLICY "Allow team lead delete case_classifications" ON public.case_classifications
  FOR DELETE TO authenticated USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
ALTER TABLE public.installers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.installers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.installers TO authenticated;
DROP POLICY IF EXISTS "Allow modify installers" ON public.installers;
DROP POLICY IF EXISTS "Allow read-only access to installers" ON public.installers;
DROP POLICY IF EXISTS "Allow authenticated read installers" ON public.installers;
CREATE POLICY "Allow authenticated read installers" ON public.installers
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow team lead insert installers" ON public.installers;
CREATE POLICY "Allow team lead insert installers" ON public.installers
  FOR INSERT TO authenticated WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
DROP POLICY IF EXISTS "Allow team lead update installers" ON public.installers;
CREATE POLICY "Allow team lead update installers" ON public.installers
  FOR UPDATE TO authenticated USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin')) WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
DROP POLICY IF EXISTS "Allow team lead delete installers" ON public.installers;
CREATE POLICY "Allow team lead delete installers" ON public.installers
  FOR DELETE TO authenticated USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
ALTER TABLE public.marketing_resources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.marketing_resources FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.marketing_resources TO authenticated;
DROP POLICY IF EXISTS "Allow modify marketing_resources" ON public.marketing_resources;
DROP POLICY IF EXISTS "Allow select marketing_resources" ON public.marketing_resources;
DROP POLICY IF EXISTS "Allow authenticated read marketing_resources" ON public.marketing_resources;
CREATE POLICY "Allow authenticated read marketing_resources" ON public.marketing_resources
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow team lead insert marketing_resources" ON public.marketing_resources;
CREATE POLICY "Allow team lead insert marketing_resources" ON public.marketing_resources
  FOR INSERT TO authenticated WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
DROP POLICY IF EXISTS "Allow team lead update marketing_resources" ON public.marketing_resources;
CREATE POLICY "Allow team lead update marketing_resources" ON public.marketing_resources
  FOR UPDATE TO authenticated USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin')) WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
DROP POLICY IF EXISTS "Allow team lead delete marketing_resources" ON public.marketing_resources;
CREATE POLICY "Allow team lead delete marketing_resources" ON public.marketing_resources
  FOR DELETE TO authenticated USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
ALTER TABLE public.quick_start_guides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.quick_start_guides FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.quick_start_guides TO authenticated;
DROP POLICY IF EXISTS "Allow modify quick_start_guides" ON public.quick_start_guides;
DROP POLICY IF EXISTS "Allow read-only access to quick start guides" ON public.quick_start_guides;
DROP POLICY IF EXISTS "Allow authenticated read quick_start_guides" ON public.quick_start_guides;
CREATE POLICY "Allow authenticated read quick_start_guides" ON public.quick_start_guides
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow team lead insert quick_start_guides" ON public.quick_start_guides;
CREATE POLICY "Allow team lead insert quick_start_guides" ON public.quick_start_guides
  FOR INSERT TO authenticated WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
DROP POLICY IF EXISTS "Allow team lead update quick_start_guides" ON public.quick_start_guides;
CREATE POLICY "Allow team lead update quick_start_guides" ON public.quick_start_guides
  FOR UPDATE TO authenticated USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin')) WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
DROP POLICY IF EXISTS "Allow team lead delete quick_start_guides" ON public.quick_start_guides;
CREATE POLICY "Allow team lead delete quick_start_guides" ON public.quick_start_guides
  FOR DELETE TO authenticated USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
ALTER TABLE public.recommended_hardware ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.recommended_hardware FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recommended_hardware TO authenticated;
DROP POLICY IF EXISTS "Allow modify recommended_hardware" ON public.recommended_hardware;
DROP POLICY IF EXISTS "Allow read-only access to recommended hardware" ON public.recommended_hardware;
DROP POLICY IF EXISTS "Allow authenticated read recommended_hardware" ON public.recommended_hardware;
CREATE POLICY "Allow authenticated read recommended_hardware" ON public.recommended_hardware
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow team lead insert recommended_hardware" ON public.recommended_hardware;
CREATE POLICY "Allow team lead insert recommended_hardware" ON public.recommended_hardware
  FOR INSERT TO authenticated WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
DROP POLICY IF EXISTS "Allow team lead update recommended_hardware" ON public.recommended_hardware;
CREATE POLICY "Allow team lead update recommended_hardware" ON public.recommended_hardware
  FOR UPDATE TO authenticated USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin')) WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
DROP POLICY IF EXISTS "Allow team lead delete recommended_hardware" ON public.recommended_hardware;
CREATE POLICY "Allow team lead delete recommended_hardware" ON public.recommended_hardware
  FOR DELETE TO authenticated USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
ALTER TABLE public.manuals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.manuals FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.manuals TO authenticated;
DROP POLICY IF EXISTS "Allow modify manuals" ON public.manuals;
DROP POLICY IF EXISTS "Allow read-only access to manuals" ON public.manuals;
DROP POLICY IF EXISTS "Allow authenticated read manuals" ON public.manuals;
CREATE POLICY "Allow authenticated read manuals" ON public.manuals
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow team lead insert manuals" ON public.manuals;
CREATE POLICY "Allow team lead insert manuals" ON public.manuals
  FOR INSERT TO authenticated WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
DROP POLICY IF EXISTS "Allow team lead update manuals" ON public.manuals;
CREATE POLICY "Allow team lead update manuals" ON public.manuals
  FOR UPDATE TO authenticated USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin')) WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
DROP POLICY IF EXISTS "Allow team lead delete manuals" ON public.manuals;
CREATE POLICY "Allow team lead delete manuals" ON public.manuals
  FOR DELETE TO authenticated USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
ALTER TABLE public.support_tiers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.support_tiers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.support_tiers TO authenticated;
DROP POLICY IF EXISTS "Allow modify support_tiers" ON public.support_tiers;
DROP POLICY IF EXISTS "Allow select support_tiers" ON public.support_tiers;
DROP POLICY IF EXISTS "Allow authenticated read support_tiers" ON public.support_tiers;
CREATE POLICY "Allow authenticated read support_tiers" ON public.support_tiers
  FOR SELECT TO authenticated USING (is_active = true);
DROP POLICY IF EXISTS "Allow team lead insert support_tiers" ON public.support_tiers;
CREATE POLICY "Allow team lead insert support_tiers" ON public.support_tiers
  FOR INSERT TO authenticated WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
DROP POLICY IF EXISTS "Allow team lead update support_tiers" ON public.support_tiers;
CREATE POLICY "Allow team lead update support_tiers" ON public.support_tiers
  FOR UPDATE TO authenticated USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin')) WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));
DROP POLICY IF EXISTS "Allow team lead delete support_tiers" ON public.support_tiers;
CREATE POLICY "Allow team lead delete support_tiers" ON public.support_tiers
  FOR DELETE TO authenticated USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('team_lead', 'lead', 'admin'));

-- Customer and activity records must never be anonymously accessible. This also
-- removes TRUNCATE and other table-level privileges that RLS does not govern.

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.clients FROM PUBLIC, anon;
ALTER TABLE public.client_products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.client_products FROM PUBLIC, anon;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.interactions FROM PUBLIC, anon;
ALTER TABLE public.interaction_edits_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.interaction_edits_audit FROM PUBLIC, anon;
ALTER TABLE public.deleted_interactions_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.deleted_interactions_audit FROM PUBLIC, anon;
DROP POLICY IF EXISTS "Allow select clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated read clients" ON public.clients;
DROP POLICY IF EXISTS "Allow authenticated read clients" ON public.clients;
CREATE POLICY "Allow authenticated read clients" ON public.clients
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow select client_products" ON public.client_products;
DROP POLICY IF EXISTS "Allow authenticated read client_products" ON public.client_products;
DROP POLICY IF EXISTS "Allow authenticated read client_products" ON public.client_products;
CREATE POLICY "Allow authenticated read client_products" ON public.client_products
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow select interactions" ON public.interactions;
DROP POLICY IF EXISTS "Allow authenticated read interactions" ON public.interactions;
DROP POLICY IF EXISTS "Allow authenticated read interactions" ON public.interactions;
CREATE POLICY "Allow authenticated read interactions" ON public.interactions
  FOR SELECT TO authenticated USING (true);

-- Prevent future tables/functions created by postgres in public from inheriting
-- anonymous privileges. Grant only the access each new API object actually needs.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;

COMMIT;
