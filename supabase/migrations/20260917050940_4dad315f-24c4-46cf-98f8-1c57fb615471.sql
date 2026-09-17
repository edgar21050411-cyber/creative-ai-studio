GRANT UPDATE (credits) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_credit_increase()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.credits > OLD.credits AND (SELECT auth.role()) <> 'service_role' THEN
    RAISE EXCEPTION 'Credits cannot be increased by the user' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_profiles_credit_increase
BEFORE UPDATE OF credits ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_unauthorized_credit_increase();

ALTER FUNCTION public.deduct_credits(integer) SECURITY INVOKER;