-- Catalog audit actor IDs are historical evidence. They must remain after an
-- Auth account is deleted, while staff access is deactivated separately.
DO $$
DECLARE
  actor_fk record;
BEGIN
  FOR actor_fk IN
    SELECT constraint_row.conname
    FROM pg_catalog.pg_constraint AS constraint_row
    JOIN pg_catalog.pg_attribute AS column_row
      ON column_row.attrelid = constraint_row.conrelid
     AND column_row.attname = 'performed_by_id'
     AND column_row.attnum = ANY (constraint_row.conkey)
    WHERE constraint_row.conrelid = 'public.catalog_audit_logs'::regclass
      AND constraint_row.confrelid = 'auth.users'::regclass
      AND constraint_row.contype = 'f'
  LOOP
    EXECUTE pg_catalog.format(
      'ALTER TABLE public.catalog_audit_logs DROP CONSTRAINT %I',
      actor_fk.conname
    );
  END LOOP;
END;
$$;

COMMENT ON COLUMN public.catalog_audit_logs.performed_by_id IS
  'Historical Auth user UUID. Retained after account deletion for audit provenance.';
