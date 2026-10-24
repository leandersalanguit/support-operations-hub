-- Resolve interaction owners only when a canonical client name has one owner.
-- Existing links remain stable when names are ambiguous.
CREATE OR REPLACE FUNCTION public.resolve_unique_client_id_by_name(p_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_canonical_name text;
  v_match_count bigint;
  v_client_id uuid;
BEGIN
  v_canonical_name := lower(btrim(public.canonical_interaction_client_name(p_name)));
  IF NULLIF(v_canonical_name, '') IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT count(*), (array_agg(client.id))[1]
  INTO v_match_count, v_client_id
  FROM public.clients AS client
  WHERE lower(btrim(client.name)) = v_canonical_name;

  IF v_match_count = 1 THEN
    RETURN v_client_id;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_unique_client_id_by_name(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_client_product_interaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_client_id uuid;
  v_previous_client_id uuid;
  v_previous_client_name text;
  v_product_name text;
  v_canonical_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.client_product_interactions
    WHERE interaction_id = OLD.id;
    RETURN OLD;
  END IF;

  v_canonical_name := lower(btrim(public.canonical_interaction_client_name(NEW.client_name)));
  v_product_name := NULLIF(btrim(NEW.client_product), '');

  SELECT link.client_id, lower(btrim(client.name))
  INTO v_previous_client_id, v_previous_client_name
  FROM public.client_product_interactions AS link
  JOIN public.clients AS client ON client.id = link.client_id
  WHERE link.interaction_id = NEW.id;

  -- Keep a stable existing link when the interaction's canonical name is unchanged.
  -- This prevents a direct interaction update from selecting one case-variant duplicate.
  IF v_client_id IS NULL
    AND TG_OP = 'UPDATE'
    AND lower(btrim(public.canonical_interaction_client_name(NEW.client_name)))
      = lower(btrim(public.canonical_interaction_client_name(OLD.client_name)))
    AND v_previous_client_name = v_canonical_name
  THEN
    v_client_id := v_previous_client_id;
  END IF;

  -- Accept an explicit ID only when canonical resolution is unambiguous.
  IF v_client_id IS NULL
    AND NEW.client_id IS NOT NULL
    AND public.resolve_unique_client_id_by_name(NEW.client_name) = NEW.client_id
  THEN
    v_client_id := NEW.client_id;
  END IF;

  IF v_client_id IS NULL THEN
    v_client_id := public.resolve_unique_client_id_by_name(NEW.client_name);
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
  WHERE public.resolve_unique_client_id_by_name(interaction.client_name) = NEW.id
    AND NULLIF(btrim(interaction.client_product), '') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.client_product_interactions AS existing_link
      WHERE existing_link.interaction_id = interaction.id
    )
  ON CONFLICT (interaction_id) DO NOTHING;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.link_client_product_interactions_after_client_insert() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  v_ambiguous_count bigint;
BEGIN
  SELECT count(*) INTO v_ambiguous_count
  FROM public.interactions AS interaction
  WHERE NULLIF(btrim(interaction.client_product), '') IS NOT NULL
    AND (
      SELECT count(*)
      FROM public.clients AS client
      WHERE lower(btrim(client.name))
        = lower(btrim(public.canonical_interaction_client_name(interaction.client_name)))
    ) > 1;

  IF v_ambiguous_count > 0 THEN
    RAISE NOTICE 'Skipped % interaction product rows with ambiguous canonical client names', v_ambiguous_count;
  END IF;
END;
$$;

-- Add only unambiguous historical links. Existing links always keep their owner.
INSERT INTO public.client_product_interactions (interaction_id, client_id, product_name)
SELECT interaction.id, public.resolve_unique_client_id_by_name(interaction.client_name), btrim(interaction.client_product)
FROM public.interactions AS interaction
WHERE public.resolve_unique_client_id_by_name(interaction.client_name) IS NOT NULL
  AND NULLIF(btrim(interaction.client_product), '') IS NOT NULL
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
    date = (p_interaction->>'date')::date,
    day_of_week = p_interaction->>'day_of_week',
    time = (p_interaction->>'time')::time,
    agent = p_interaction->>'agent',
    client_name = p_interaction->>'client_name',
    channel = (p_interaction->>'channel')::public.channel_type,
    channel_details = p_interaction->>'channel_details',
    client_product = p_interaction->>'client_product',
    case_classification = p_interaction->>'case_classification',
    status = (p_interaction->>'status')::public.interaction_status,
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
    JOIN public.clients AS client ON client.id = link.client_id
    WHERE link.interaction_id = p_interaction_id
      AND lower(btrim(client.name)) = lower(btrim(public.canonical_interaction_client_name(v_old.client_name)));
    IF v_old_client_id IS NULL THEN
      v_old_client_id := public.resolve_unique_client_id_by_name(v_old.client_name);
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
