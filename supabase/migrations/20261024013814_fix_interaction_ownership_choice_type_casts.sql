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
