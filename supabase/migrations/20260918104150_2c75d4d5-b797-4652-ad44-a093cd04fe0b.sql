CREATE OR REPLACE FUNCTION public.deduct_credits(p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_new integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.profiles (id, email)
  VALUES (v_uid, COALESCE((auth.jwt() ->> 'email'), ''))
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.profiles
     SET credits = credits - p_amount
   WHERE id = v_uid
     AND credits >= p_amount
  RETURNING credits INTO v_new;

  IF v_new IS NULL THEN
    RAISE EXCEPTION 'Insufficient credits' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_new;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.deduct_credits(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_credits(integer) TO authenticated, service_role;