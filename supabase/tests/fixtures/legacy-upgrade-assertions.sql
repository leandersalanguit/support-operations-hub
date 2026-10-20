DO $$
BEGIN
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
END;
$$;
