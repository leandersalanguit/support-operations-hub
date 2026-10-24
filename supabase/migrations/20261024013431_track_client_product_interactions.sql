CREATE TABLE public.client_product_interactions (
  interaction_id uuid PRIMARY KEY REFERENCES public.interactions(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_name text NOT NULL
);

CREATE INDEX idx_client_product_interactions_client_id
  ON public.client_product_interactions(client_id);

ALTER TABLE public.client_product_interactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_product_interactions FROM authenticated;
GRANT SELECT ON public.client_product_interactions TO authenticated;

CREATE POLICY client_product_interactions_select_staff ON public.client_product_interactions
  FOR SELECT TO authenticated USING ((SELECT public.can_use_support_hub()));

CREATE OR REPLACE FUNCTION public.canonical_interaction_client_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT btrim(
    CASE
      WHEN p_name ~ '^[^(]+\s*\([^)]+\)$'
        THEN substring(p_name FROM '\(([^()]*)\)$')
      ELSE p_name
    END
  );
$$;
REVOKE ALL ON FUNCTION public.canonical_interaction_client_name(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.canonical_interaction_client_name(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_client_product_interaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_client_id uuid;
  v_previous_client_id uuid;
  v_product_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.client_product_interactions
    WHERE interaction_id = OLD.id;
    RETURN OLD;
  END IF;

  v_product_name := NULLIF(btrim(NEW.client_product), '');

  SELECT link.client_id INTO v_previous_client_id
  FROM public.client_product_interactions AS link
  WHERE link.interaction_id = NEW.id;

  IF NEW.client_id IS NOT NULL THEN
    SELECT client.id INTO v_client_id
    FROM public.clients AS client
    WHERE client.id = NEW.client_id
      AND lower(btrim(client.name)) = lower(btrim(
        public.canonical_interaction_client_name(NEW.client_name)
      ));
  END IF;

  IF v_client_id IS NULL
    AND TG_OP = 'UPDATE'
    AND NEW.client_name IS NOT DISTINCT FROM OLD.client_name
  THEN
    v_client_id := v_previous_client_id;
  END IF;

  IF v_client_id IS NULL THEN
    SELECT client.id INTO v_client_id
    FROM public.clients AS client
    WHERE lower(btrim(client.name)) = lower(btrim(
      public.canonical_interaction_client_name(NEW.client_name)
    ))
    LIMIT 1;
  END IF;

  DELETE FROM public.client_product_interactions
  WHERE interaction_id = NEW.id;

  IF v_client_id IS NOT NULL AND v_product_name IS NOT NULL THEN
    INSERT INTO public.client_product_interactions (interaction_id, client_id, product_name)
    VALUES (NEW.id, v_client_id, v_product_name);
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_client_product_interaction() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_sync_client_product_interaction
AFTER INSERT OR UPDATE OR DELETE ON public.interactions
FOR EACH ROW EXECUTE FUNCTION public.sync_client_product_interaction();

CREATE OR REPLACE FUNCTION public.link_client_product_interactions_after_client_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.client_product_interactions (interaction_id, client_id, product_name)
  SELECT interaction.id, NEW.id, btrim(interaction.client_product)
  FROM public.interactions AS interaction
  WHERE lower(btrim(public.canonical_interaction_client_name(interaction.client_name)))
      = lower(btrim(NEW.name))
    AND NULLIF(btrim(interaction.client_product), '') IS NOT NULL
  ON CONFLICT (interaction_id) DO UPDATE
    SET client_id = EXCLUDED.client_id,
        product_name = EXCLUDED.product_name;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.link_client_product_interactions_after_client_insert() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_link_client_product_interactions_after_client_insert
AFTER INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.link_client_product_interactions_after_client_insert();

-- Add historical interaction references without changing ambiguous legacy ownership rows.
INSERT INTO public.client_product_interactions (interaction_id, client_id, product_name)
SELECT interaction.id, client.id, btrim(interaction.client_product)
FROM public.interactions AS interaction
JOIN public.clients AS client
  ON lower(btrim(client.name)) = lower(btrim(public.canonical_interaction_client_name(interaction.client_name)))
WHERE NULLIF(btrim(interaction.client_product), '') IS NOT NULL
  AND 1 = (
    SELECT count(*) FROM public.clients AS candidate
    WHERE lower(btrim(candidate.name)) = lower(btrim(client.name))
  )
ON CONFLICT (interaction_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.update_interaction_with_ownership_choice(
  p_interaction_id uuid,
  p_interaction jsonb,
  p_retain_previous_product boolean
)
RETURNS public.interactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old public.interactions%ROWTYPE;
  v_new public.interactions%ROWTYPE;
  v_old_client_id uuid;
  v_old_owner text;
BEGIN
  SELECT * INTO v_old FROM public.interactions WHERE id = p_interaction_id FOR UPDATE;
  IF NOT FOUND OR public.can_use_support_hub() IS NOT TRUE OR (
    public.is_support_lead() IS NOT TRUE
    AND v_old.agent_id IS DISTINCT FROM auth.uid()
  ) THEN
    RAISE EXCEPTION 'Interaction edit is not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.interactions AS interaction SET
    date = p_interaction->>'date',
    day_of_week = p_interaction->>'day_of_week',
    time = p_interaction->>'time',
    agent = p_interaction->>'agent',
    client_name = p_interaction->>'client_name',
    channel = p_interaction->>'channel',
    channel_details = p_interaction->>'channel_details',
    client_product = p_interaction->>'client_product',
    case_classification = p_interaction->>'case_classification',
    status = p_interaction->>'status',
    license = p_interaction->>'license',
    in_event = (p_interaction->>'in_event')::boolean,
    first_time_user = (p_interaction->>'first_time_user')::boolean,
    additional_notes = p_interaction->>'additional_notes',
    last_modified_by = p_interaction->>'last_modified_by',
    last_modified_at = (p_interaction->>'last_modified_at')::timestamptz
  WHERE interaction.id = p_interaction_id
  RETURNING interaction.* INTO v_new;

  IF v_old.client_product IS DISTINCT FROM v_new.client_product
    AND lower(btrim(public.canonical_interaction_client_name(v_old.client_name)))
      = lower(btrim(public.canonical_interaction_client_name(v_new.client_name)))
  THEN
    SELECT link.client_id INTO v_old_client_id
    FROM public.client_product_interactions AS link
    WHERE link.interaction_id = p_interaction_id;
    IF v_old_client_id IS NULL THEN
      SELECT client.id INTO v_old_client_id FROM public.clients AS client
      WHERE lower(btrim(client.name)) = lower(btrim(public.canonical_interaction_client_name(v_old.client_name)))
      LIMIT 1;
    END IF;
    v_old_owner := btrim(v_old.client_product);
    IF v_old_client_id IS NOT NULL AND v_old_owner <> '' AND p_retain_previous_product IS TRUE THEN
      INSERT INTO public.client_products (client_id, product_name)
      VALUES (v_old_client_id, v_old_owner)
      ON CONFLICT (client_id, product_name) DO NOTHING;
    ELSIF v_old_client_id IS NOT NULL AND v_old_owner <> '' AND p_retain_previous_product IS FALSE THEN
      DELETE FROM public.client_products
      WHERE client_id = v_old_client_id AND product_name = v_old_owner;
    END IF;
  END IF;

  RETURN v_new;
END;
$$;
REVOKE ALL ON FUNCTION public.update_interaction_with_ownership_choice(uuid, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_interaction_with_ownership_choice(uuid, jsonb, boolean) TO authenticated;
