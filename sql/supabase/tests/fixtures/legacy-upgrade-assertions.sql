DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.client_product_interactions
    WHERE interaction_id = '20000000-0000-4000-8000-000000000984'
  ) THEN
    RAISE EXCEPTION 'ambiguous legacy client ownership was assigned during upgrade';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.client_product_interactions
    WHERE interaction_id = '20000000-0000-4000-8000-000000000985'
      AND client_id = '20000000-0000-4000-8000-000000000983'
  ) THEN
    RAISE EXCEPTION 'unique legacy client ownership was not preserved during upgrade';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.catalog_products
    WHERE name = 'Legacy fixture product' AND category = 'hardware' AND display_order = 7
      AND created_at IS NOT NULL AND updated_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'legacy catalog row was lost or required baseline columns were not added';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = 'public.interactions'::regclass
      AND constraint_row.contype = 'f'
      AND constraint_row.confrelid = 'auth.users'::regclass
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute AS column_row
        WHERE column_row.attrelid = constraint_row.conrelid
          AND column_row.attname = 'agent_id'
          AND column_row.attnum = ANY (constraint_row.conkey)
      )
  ) THEN
    RAISE EXCEPTION 'legacy interaction owner UUID still cascades from Auth deletion';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.catalog_audit_logs
    WHERE id = '20000000-0000-4000-8000-000000000997'
      AND performed_by = 'Legacy fixture actor'
      AND performed_by_id = '20000000-0000-4000-8000-000000000998'::uuid
      AND details = '{"fixture":"legacy"}'::jsonb
  ) THEN
    RAISE EXCEPTION 'legacy catalog audit row or actor UUID was not preserved';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = 'public.catalog_audit_logs'::regclass
      AND constraint_row.contype = 'f'
      AND constraint_row.confrelid = 'auth.users'::regclass
      AND EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute AS column_row
        WHERE column_row.attrelid = constraint_row.conrelid
          AND column_row.attname = 'performed_by_id'
          AND column_row.attnum = ANY (constraint_row.conkey)
      )
  ) THEN
    RAISE EXCEPTION 'catalog audit actor UUID still references Auth users';
  END IF;
END;
$$;
