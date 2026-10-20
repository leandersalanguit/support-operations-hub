-- Reviewed local baseline derived from committed example schema and ignored
-- root setup scripts. Production schema was not available for export.
-- Structure only; the next migration installs the access controls.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
  date date NOT NULL, day_of_week text NOT NULL, time text DEFAULT '00:00:00',
  agent text NOT NULL, agent_id uuid,
  client_id uuid, client_name text NOT NULL, channel text NOT NULL CHECK (channel IN ('Call','Chat')),
  channel_details text DEFAULT '', client_product text NOT NULL, case_classification text NOT NULL,
  status text NOT NULL, license text DEFAULT 'support_active', in_event boolean DEFAULT false,
  first_time_user boolean DEFAULT false, additional_notes text DEFAULT '',
  last_modified_by text, last_modified_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_interactions_date ON public.interactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_agent ON public.interactions(agent);
CREATE INDEX IF NOT EXISTS idx_interactions_client_name ON public.interactions(client_name);
CREATE INDEX IF NOT EXISTS idx_interactions_status ON public.interactions(status);

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
  phone_numbers text[] DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), last_logged_by text
);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE TABLE IF NOT EXISTS public.client_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE, product_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(client_id, product_name)
);
CREATE INDEX IF NOT EXISTS idx_client_products_client_id ON public.client_products(client_id);

CREATE TABLE IF NOT EXISTS public.interaction_edits_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), interaction_id uuid NOT NULL,
  edited_by text NOT NULL, edited_at timestamptz NOT NULL DEFAULT now(), original_agent text,
  interaction_date date, client_name text, client_product text, case_classification text,
  previous_status text, new_status text, previous_snapshot jsonb, updated_snapshot jsonb
);
CREATE INDEX IF NOT EXISTS idx_edits_audit_interaction_id ON public.interaction_edits_audit(interaction_id);
CREATE TABLE IF NOT EXISTS public.deleted_interactions_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), interaction_id uuid NOT NULL,
  deleted_by text NOT NULL, deleted_at timestamptz NOT NULL DEFAULT now(), interaction_date date,
  agent text, client_name text, client_product text, case_classification text, status text,
  full_snapshot jsonb
);
CREATE INDEX IF NOT EXISTS idx_deleted_audit_interaction_id ON public.deleted_interactions_audit(interaction_id);

CREATE TABLE IF NOT EXISTS public.catalog_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
  category text DEFAULT 'hardware', is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Upgrade legacy example instances without losing existing catalog rows.
ALTER TABLE public.catalog_products
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'hardware',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_catalog_products_name ON public.catalog_products(name);
CREATE INDEX IF NOT EXISTS idx_catalog_products_active_order ON public.catalog_products(is_active, display_order);
CREATE TABLE IF NOT EXISTS public.catalog_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), catalog_type text NOT NULL DEFAULT 'product',
  action text NOT NULL CHECK (action IN ('create','rename','update','toggle_active','reorder','delete')),
  old_value text, new_value text, details jsonb DEFAULT '{}'::jsonb,
  performed_by text NOT NULL, performed_by_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_catalog_audit_type_date ON public.catalog_audit_logs(catalog_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_audit_action ON public.catalog_audit_logs(action);

CREATE TABLE IF NOT EXISTS public.case_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true, display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
-- Present in the old example schema. Retained for upgrade compatibility and
-- deliberately inaccessible to browser roles by the security migration.
CREATE TABLE IF NOT EXISTS public.catalog_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true, display_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.catalog_classifications
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS public.installers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, version text DEFAULT '',
  categories text[] NOT NULL DEFAULT '{}', url text NOT NULL, download_url text DEFAULT '',
  file_size text DEFAULT '', operating_system text DEFAULT '', release_date text DEFAULT '',
  compatible_products text[] DEFAULT '{}', checksum text DEFAULT '', description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT installers_name_version_unique UNIQUE(name, version)
);
CREATE TABLE IF NOT EXISTS public.marketing_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  categories text[] NOT NULL DEFAULT '{}', url text NOT NULL, is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketing_resources
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS public.quick_start_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
  categories text[] NOT NULL DEFAULT '{}', estimated_time text DEFAULT '',
  difficulty text CHECK (difficulty IN ('Beginner','Intermediate','Advanced')),
  compatible_products text[] NOT NULL DEFAULT '{}', last_updated text DEFAULT '', steps_count integer,
  url text NOT NULL, guide_url text DEFAULT '', description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true, display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.recommended_hardware (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
  model_number text DEFAULT '', categories text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'Recommended' CHECK (status IN ('Recommended','Certified Compatible','Legacy Supported')),
  specifications text DEFAULT '', compatible_products text[] NOT NULL DEFAULT '{}', notes text DEFAULT '',
  estimated_price text DEFAULT '', url text NOT NULL, description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true, display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.manuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, version text DEFAULT '',
  categories text[] NOT NULL DEFAULT '{}', format text NOT NULL DEFAULT 'PDF'
    CHECK (format IN ('PDF','Interactive','Document')),
  file_size text DEFAULT '', page_count integer, compatible_products text[] NOT NULL DEFAULT '{}',
  last_updated text DEFAULT '', url text NOT NULL, file_url text DEFAULT '', description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true, display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.support_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, label text NOT NULL,
  export_label text NOT NULL, is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true, display_order integer NOT NULL DEFAULT 0
);

-- These onboarding objects are retained for data recovery, with no browser grants.
CREATE TABLE IF NOT EXISTS public.onboarding_slots (
  id text PRIMARY KEY, day_of_week smallint NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL, end_time time NOT NULL, label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true, display_order integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL, client_phone text DEFAULT '', product text NOT NULL,
  client_timezone text NOT NULL, slot_date date NOT NULL,
  slot_id text REFERENCES public.onboarding_slots(id) ON DELETE SET NULL,
  start_iso timestamptz NOT NULL, end_iso timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'booked' CHECK(status IN ('booked','completed','cancelled')),
  booked_by text DEFAULT '', notes text DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
