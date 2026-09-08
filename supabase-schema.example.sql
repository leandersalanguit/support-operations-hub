-- ==============================================================================
-- Support Operations Hub - Supabase PostgreSQL Schema Template (Example)
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- to initialize the database tables, indexes, Row-Level Security (RLS) policies,
-- and Realtime replication for the Support Operations Hub.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SUPPORT INTERACTIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  time TEXT DEFAULT '00:00:00',
  agent TEXT NOT NULL,
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID,
  client_name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('Call', 'Chat')),
  channel_details TEXT DEFAULT '',
  client_product TEXT NOT NULL,
  case_classification TEXT NOT NULL,
  status TEXT NOT NULL,
  license TEXT DEFAULT 'support_active',
  in_event BOOLEAN DEFAULT false,
  first_time_user BOOLEAN DEFAULT false,
  additional_notes TEXT DEFAULT '',
  last_modified_by TEXT,
  last_modified_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 2. CLIENT CRM TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  phone_numbers TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_logged_by TEXT
);

CREATE TABLE IF NOT EXISTS public.client_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(client_id, product_name)
);

-- ------------------------------------------------------------------------------
-- 3. AUDIT TRAIL LOG TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interaction_edits_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID NOT NULL,
  edited_by TEXT NOT NULL,
  edited_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  original_agent TEXT,
  interaction_date DATE,
  client_name TEXT,
  client_product TEXT,
  case_classification TEXT,
  previous_status TEXT,
  new_status TEXT,
  previous_snapshot JSONB,
  updated_snapshot JSONB
);

CREATE TABLE IF NOT EXISTS public.deleted_interactions_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID NOT NULL,
  deleted_by TEXT NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  interaction_date DATE,
  agent TEXT,
  client_name TEXT,
  client_product TEXT,
  case_classification TEXT,
  status TEXT,
  full_snapshot JSONB
);

-- ------------------------------------------------------------------------------
-- 4. OPTIONAL DYNAMIC TAXONOMY & RESOURCE CATALOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalog_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.catalog_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.marketing_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  categories TEXT[] DEFAULT '{}',
  url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.support_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  export_label TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0
);

-- ------------------------------------------------------------------------------
-- 5. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_interactions_date ON public.interactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_agent ON public.interactions(agent);
CREATE INDEX IF NOT EXISTS idx_interactions_client_name ON public.interactions(client_name);
CREATE INDEX IF NOT EXISTS idx_interactions_status ON public.interactions(status);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_client_products_client_id ON public.client_products(client_id);
CREATE INDEX IF NOT EXISTS idx_edits_audit_interaction_id ON public.interaction_edits_audit(interaction_id);
CREATE INDEX IF NOT EXISTS idx_deleted_audit_interaction_id ON public.deleted_interactions_audit(interaction_id);

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interaction_edits_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_interactions_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tiers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated agents read/write access (tune according to organizational policies)
CREATE POLICY "Allow authenticated full access to interactions" ON public.interactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to clients" ON public.clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to client_products" ON public.client_products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated insert to interaction_edits_audit" ON public.interaction_edits_audit
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated select to interaction_edits_audit" ON public.interaction_edits_audit
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert to deleted_interactions_audit" ON public.deleted_interactions_audit
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated select to deleted_interactions_audit" ON public.deleted_interactions_audit
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read to catalog_products" ON public.catalog_products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read to catalog_classifications" ON public.catalog_classifications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read to marketing_resources" ON public.marketing_resources
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read to support_tiers" ON public.support_tiers
  FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------------------------
-- 7. SUPABASE REALTIME SUBSCRIPTIONS
-- ------------------------------------------------------------------------------
-- Enable real-time updates for active shift synchronization across agent browsers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'interactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.interactions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'clients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
  END IF;
END $$;
