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
  v_input public.interactions%ROWTYPE;
  v_new public.interactions%ROWTYPE;
  v_old_client_id uuid;
  v_old_owner text;
BEGIN
  SELECT * INTO v_old
  FROM public.interactions
  WHERE id = p_interaction_id
  FOR UPDATE;

  IF NOT FOUND OR public.can_use_support_hub() IS NOT TRUE OR (
    public.is_support_lead() IS NOT TRUE
    AND v_old.agent_id IS DISTINCT FROM auth.uid()
  ) THEN
    RAISE EXCEPTION 'Interaction edit is not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_input
  FROM pg_catalog.jsonb_populate_record(v_old, p_interaction);

  UPDATE public.interactions AS interaction SET
    date = v_input.date,
    day_of_week = v_input.day_of_week,
    time = v_input.time,
    agent = v_input.agent,
    client_name = v_input.client_name,
    channel = v_input.channel,
    channel_details = v_input.channel_details,
    client_product = v_input.client_product,
    case_classification = v_input.case_classification,
    status = v_input.status,
    license = v_input.license,
    in_event = v_input.in_event,
    first_time_user = v_input.first_time_user,
    additional_notes = v_input.additional_notes,
    last_modified_by = v_input.last_modified_by,
    last_modified_at = v_input.last_modified_at
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
