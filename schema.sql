-- ==============================================================================
-- Schema Supabase / Postgres pour Shadow Language Learning PWA
-- ==============================================================================

-- 1. Table Utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  target_languages TEXT[] DEFAULT ARRAY['EN', 'ZH'],
  cecrl_level_by_lang JSONB DEFAULT '{"EN": "A1", "ZH": "A1"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table Blocs Thématiques
CREATE TABLE IF NOT EXISTS theme_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  level TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('EN', 'ZH')),
  is_custom BOOLEAN DEFAULT false,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table Phrases
CREATE TABLE IF NOT EXISTS phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID REFERENCES theme_blocks(id) ON DELETE CASCADE,
  text_target TEXT NOT NULL,
  phonetic TEXT,
  text_native TEXT NOT NULL,
  audio_url TEXT,
  star_rating INTEGER CHECK (star_rating BETWEEN 1 AND 5),
  fsrs_state JSONB,
  mastery_status TEXT DEFAULT 'NEW' CHECK (mastery_status IN ('NEW', 'LEARNING', 'MASTERED')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Table Logs de Pratique
CREATE TABLE IF NOT EXISTS practice_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  language TEXT NOT NULL,
  minutes_practiced INTEGER DEFAULT 0,
  phrases_reviewed INTEGER DEFAULT 0,
  new_phrases_learned INTEGER DEFAULT 0
);

-- 5. Table de Configuration des Seuils CECRL (par langue)
CREATE TABLE IF NOT EXISTS cecrl_threshold_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language TEXT NOT NULL CHECK (language IN ('EN', 'ZH')),
  level TEXT NOT NULL CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  min_mastered_phrases INTEGER NOT NULL,
  description TEXT,
  UNIQUE(language, level)
);

-- Données initiales de configuration des seuils CECRL
INSERT INTO cecrl_threshold_config (language, level, min_mastered_phrases, description)
VALUES 
  ('EN', 'A1', 0, 'Découverte et expressions élémentaires'),
  ('EN', 'A2', 50, 'Situations quotidiennes et phrases usuelles'),
  ('EN', 'B1', 150, 'Autonomie et conversations courantes'),
  ('EN', 'B2', 350, 'Aisance et fluidité spontanée'),
  ('EN', 'C1', 700, 'Maîtrise nuancée et lexique complexe'),
  ('EN', 'C2', 1200, 'Bilinguisme pratique et précision native'),
  ('ZH', 'A1', 0, 'Salutations et formules de base (HSK 1)'),
  ('ZH', 'A2', 40, 'Échanges simples et repères quotidiens (HSK 2)'),
  ('ZH', 'B1', 120, 'Situations de voyage et vie quotidienne (HSK 3)'),
  ('ZH', 'B2', 280, 'Discussions structurées (HSK 4)'),
  ('ZH', 'C1', 550, 'Lecture fluide et nuances orales (HSK 5)'),
  ('ZH', 'C2', 950, 'Maîtrise avancée et expressions idiomatiques (HSK 6)')
ON CONFLICT (language, level) DO NOTHING;

-- Index
CREATE INDEX IF NOT EXISTS idx_theme_blocks_language ON theme_blocks(language);
CREATE INDEX IF NOT EXISTS idx_theme_blocks_user ON theme_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_phrases_block_id ON phrases(block_id);
CREATE INDEX IF NOT EXISTS idx_phrases_mastery ON phrases(mastery_status);
CREATE INDEX IF NOT EXISTS idx_practice_logs_user_date ON practice_logs(user_id, date);

-- 6. Table Histoires (Narrations contextuelles)
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,          -- aligné sur les catégories de theme_blocks
  level TEXT NOT NULL CHECK (level IN ('A0', 'A1', 'A2', 'B1', 'B2')),
  language TEXT NOT NULL CHECK (language IN ('EN', 'ZH')),
  star_rating INTEGER CHECK (star_rating BETWEEN 1 AND 5),  -- note GLOBALE à l'histoire
  fsrs_state JSONB,                -- calendrier UNIQUE pour toute l'histoire (pas par phrase)
  mastery_status TEXT DEFAULT 'NEW' CHECK (mastery_status IN ('NEW', 'LEARNING', 'MASTERED')),
  is_custom BOOLEAN DEFAULT false,
  user_id UUID REFERENCES users(id),  -- nullable : NULL = contenu global de l'app
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Table Phrases d'Histoires (Lecture séquentielle)
CREATE TABLE IF NOT EXISTS story_sentences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,   -- position dans la narration (1 à ~30)
  text_target TEXT NOT NULL,
  phonetic TEXT,
  text_native TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(story_id, sequence_order)
);

-- Index pour les histoires
CREATE INDEX IF NOT EXISTS idx_story_sentences_order ON story_sentences(story_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_stories_filters ON stories(language, level, category);
