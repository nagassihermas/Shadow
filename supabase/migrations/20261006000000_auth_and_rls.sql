-- ==============================================================================
-- Supabase Auth integration + Row Level Security
--
-- Context: the app is moving from zero-auth/localStorage-only to full
-- Supabase Auth. Without RLS, the anon key shipped to the browser would let
-- any client read/write every row in every table. This migration:
--   1. Replaces the hand-rolled `users` table with `profiles`, keyed 1:1 to
--      Supabase's own `auth.users` (the canonical identity table).
--   2. Repoints existing FKs (theme_blocks.user_id, practice_logs.user_id,
--      stories.user_id) from the old users(id) to profiles(id) — same id
--      space, since profiles.id = auth.users.id.
--   3. Enables RLS on every table and adds ownership policies.
--
-- KNOWN LIMITATION (not fixed here, flagging explicitly):
-- phrases.star_rating/fsrs_state/mastery_status and stories.star_rating/
-- fsrs_state are columns on the CONTENT row itself, not on a per-user
-- junction row. For global content (user_id IS NULL), two authenticated
-- users reviewing the same phrase/story will overwrite each other's FSRS
-- state. Harmless with a single real user; needs a `user_phrase_progress`
-- / `user_story_progress` junction table before a second user is onboarded.
-- ==============================================================================

-- ── 1. profiles table, replacing users ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  target_languages TEXT[] DEFAULT ARRAY['EN', 'ZH'],
  cecrl_level_by_lang JSONB DEFAULT '{"EN": "A1", "ZH": "A1"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create a profile row whenever a new auth.users row appears
-- (sign-up via email/password or magic link).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. Repoint existing FKs from users(id) to profiles(id) ──────────────────

ALTER TABLE theme_blocks DROP CONSTRAINT IF EXISTS theme_blocks_user_id_fkey;
ALTER TABLE theme_blocks ADD CONSTRAINT theme_blocks_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE practice_logs DROP CONSTRAINT IF EXISTS practice_logs_user_id_fkey;
ALTER TABLE practice_logs ADD CONSTRAINT practice_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_user_id_fkey;
ALTER TABLE stories ADD CONSTRAINT stories_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Old users table is superseded. Not dropped automatically — do so manually
-- once you've confirmed no remaining data/scripts reference it:
--   DROP TABLE IF EXISTS users;

-- ── 3. Row Level Security ────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cecrl_threshold_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_sentences ENABLE ROW LEVEL SECURITY;

-- profiles: a user reads/updates only their own profile.
-- No INSERT policy: rows are created exclusively by the trigger (SECURITY
-- DEFINER), not by client-side inserts.
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- theme_blocks: global content (user_id IS NULL) is readable by anyone
-- authenticated; custom blocks are owned and fully private.
CREATE POLICY "theme_blocks_select" ON theme_blocks
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "theme_blocks_insert_own" ON theme_blocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "theme_blocks_update_own" ON theme_blocks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "theme_blocks_delete_own" ON theme_blocks
  FOR DELETE USING (auth.uid() = user_id);

-- phrases: visibility follows the parent block's visibility. Mutation
-- (star_rating/fsrs_state/mastery_status writes from practice sessions) is
-- allowed whenever the block is visible to the user — see the KNOWN
-- LIMITATION note above regarding shared global-content rows.
CREATE POLICY "phrases_select" ON phrases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM theme_blocks tb
      WHERE tb.id = phrases.block_id
        AND (tb.user_id IS NULL OR tb.user_id = auth.uid())
    )
  );
CREATE POLICY "phrases_update" ON phrases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM theme_blocks tb
      WHERE tb.id = phrases.block_id
        AND (tb.user_id IS NULL OR tb.user_id = auth.uid())
    )
  );
CREATE POLICY "phrases_insert_own_block" ON phrases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM theme_blocks tb
      WHERE tb.id = phrases.block_id AND tb.user_id = auth.uid()
    )
  );
CREATE POLICY "phrases_delete_own_block" ON phrases
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM theme_blocks tb
      WHERE tb.id = phrases.block_id AND tb.user_id = auth.uid()
    )
  );

-- practice_logs: fully private, owner-only.
CREATE POLICY "practice_logs_all_own" ON practice_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- cecrl_threshold_config: static reference data, world-readable, no client
-- mutation (changed only via migration or service-role script).
CREATE POLICY "cecrl_threshold_config_select_all" ON cecrl_threshold_config
  FOR SELECT USING (true);

-- stories: same pattern as theme_blocks.
CREATE POLICY "stories_select" ON stories
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "stories_insert_own" ON stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stories_update_own" ON stories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "stories_delete_own" ON stories
  FOR DELETE USING (auth.uid() = user_id);

-- story_sentences: visibility follows the parent story; content-only, no
-- client mutation policy (populated by the service-role generation scripts,
-- which bypass RLS entirely).
CREATE POLICY "story_sentences_select" ON story_sentences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stories s
      WHERE s.id = story_sentences.story_id
        AND (s.user_id IS NULL OR s.user_id = auth.uid())
    )
  );
