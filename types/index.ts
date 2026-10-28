export type Language = 'EN' | 'ZH';

export type CECRLLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type MasteryStatus = 'NEW' | 'LEARNING' | 'MASTERED';

export type StarRating = 1 | 2 | 3 | 4 | 5;

export interface FSRSStateData {
  due: string; // ISO date
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review?: string; // ISO date
  next_review_at?: string; // ISO date
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  target_languages: Language[];
  cecrl_level_by_lang: Record<Language, CECRLLevel>;
  created_at: string;
}

export interface ThemeBlock {
  id: string;
  title: string;
  category: string;
  level: CECRLLevel;
  language: Language;
  is_custom: boolean;
  user_id?: string | null;
  created_at: string;
  phrase_count?: number;
  mastered_count?: number;
}

export interface Phrase {
  id: string;
  block_id: string;
  text_target: string;
  phonetic?: string | null; // Pinyin for ZH, IPA for EN
  text_native: string;
  audio_url?: string | null;
  star_rating?: StarRating | null;
  fsrs_state?: FSRSStateData | null;
  mastery_status: MasteryStatus;
  created_at: string;
}

export interface PracticeLog {
  id: string;
  user_id?: string | null;
  date: string; // YYYY-MM-DD
  language: Language;
  minutes_practiced: number;
  phrases_reviewed: number;
  new_phrases_learned: number;
}

export type StoryLevel = 'A0' | 'A1' | 'A2' | 'B1' | 'B2';

export interface Story {
  id: string;
  title: string;
  category: string;
  level: StoryLevel;
  language: Language;
  star_rating?: StarRating | null;
  fsrs_state?: FSRSStateData | null;
  mastery_status: MasteryStatus;
  is_custom: boolean;
  user_id?: string | null;
  created_at: string;
  sentence_count?: number;
  sentences?: StorySentence[];
}

export interface StorySentence {
  id: string;
  story_id: string;
  sequence_order: number;
  text_target: string;
  phonetic?: string | null;
  text_native: string;
  audio_url?: string | null;
  created_at: string;
}

export interface CECRLThreshold {
  language: Language;
  level: CECRLLevel;
  min_mastered_phrases: number;
  description: string;
}

export interface TTSRequest {
  text: string;
  language: Language;
  voiceGender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
  speakingRate?: number;
  pitch?: number;
}

export interface TTSResponse {
  audioBase64?: string;
  audioUrl?: string;
  durationSeconds?: number;
  success: boolean;
  message?: string;
}
