-- ==============================================================================
-- Migration : Ajout du mode "Histoires" (narrations contextuelles)
-- À exécuter après le schema.sql initial (users, theme_blocks, phrases, practice_logs)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,          -- aligné sur les catégories de theme_blocks
  level TEXT NOT NULL CHECK (level IN ('A0','A1','A2','B1','B2')),
  language TEXT NOT NULL CHECK (language IN ('EN','ZH')),
  star_rating INTEGER CHECK (star_rating BETWEEN 1 AND 5),  -- note GLOBALE à l'histoire
  fsrs_state JSONB,                -- calendrier UNIQUE pour toute l'histoire (pas par phrase)
  mastery_status TEXT DEFAULT 'NEW' CHECK (mastery_status IN ('NEW','LEARNING','MASTERED')),
  is_custom BOOLEAN DEFAULT false,
  user_id UUID REFERENCES users(id),  -- nullable : NULL = contenu global de l'app
  created_at TIMESTAMPTZ DEFAULT now()
);

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

-- Index pour la lecture séquentielle rapide d'une histoire
CREATE INDEX IF NOT EXISTS idx_story_sentences_order ON story_sentences(story_id, sequence_order);

-- Index pour filtrer les histoires par langue/niveau/catégorie (mêmes patterns que theme_blocks)
CREATE INDEX IF NOT EXISTS idx_stories_filters ON stories(language, level, category);
