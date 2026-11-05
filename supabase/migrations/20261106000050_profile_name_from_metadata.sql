-- ==============================================================================
-- handle_new_user() ignored sign-up metadata, so profiles.name stayed NULL.
-- It now reads options.data.display_name, falling back to the e-mail local part.
-- The trigger itself is unchanged: it already calls this function.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(left(btrim(NEW.raw_user_meta_data ->> 'display_name'), 80), ''),
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
