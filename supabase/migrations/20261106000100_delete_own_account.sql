-- ==============================================================================
-- Lets a signed-in user delete their own account from the app.
-- Deleting the auth.users row cascades: profiles (ON DELETE CASCADE), then
-- theme_blocks, practice_logs and stories (FKs to profiles, ON DELETE CASCADE),
-- then phrases and story_sentences (FKs to their parent, ON DELETE CASCADE).
--
-- To test on a throwaway account: privileges on the auth schema depend on the
-- Supabase project configuration.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_uid uuid := auth.uid();
BEGIN
  IF current_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  DELETE FROM auth.users WHERE id = current_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
