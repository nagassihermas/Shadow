'use client';

import { ThemeBlock, Phrase, PracticeLog, User, Language, StarRating, Story, StorySentence } from '@/types';
import { INITIAL_BLOCKS, INITIAL_PHRASES, INITIAL_PRACTICE_LOGS, INITIAL_USER, INITIAL_STORIES, INITIAL_STORY_SENTENCES } from './mock-data';
import { processFsrsReview } from './fsrs';

const STORAGE_KEYS = {
  USER: 'shadow_user_v1',
  BLOCKS: 'shadow_blocks_v1',
  PHRASES: 'shadow_phrases_v1',
  LOGS: 'shadow_logs_v1',
  SELECTED_LANG: 'shadow_selected_lang_v1',
  STORIES: 'shadow_stories_v1',
  STORY_SENTENCES: 'shadow_story_sentences_v1',
};

// Vérification de la disponibilité du localStorage côté client
function isClient(): boolean {
  return typeof window !== 'undefined';
}

export function getStoredUser(): User {
  if (!isClient()) return INITIAL_USER;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : INITIAL_USER;
  } catch {
    return INITIAL_USER;
  }
}

export function saveUser(user: User): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function getStoredBlocks(language?: Language): ThemeBlock[] {
  let blocks: ThemeBlock[] = INITIAL_BLOCKS;
  if (isClient()) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BLOCKS);
      if (data) {
        blocks = JSON.parse(data);
      } else {
        localStorage.setItem(STORAGE_KEYS.BLOCKS, JSON.stringify(INITIAL_BLOCKS));
      }
    } catch {
      blocks = INITIAL_BLOCKS;
    }
  }

  const phrases = getStoredPhrases();

  // Calcul dynamique des statistiques de phrases par bloc
  const enrichedBlocks = blocks.map((b) => {
    const blockPhrases = phrases.filter((p) => p.block_id === b.id);
    const masteredCount = blockPhrases.filter((p) => p.mastery_status === 'MASTERED').length;
    return {
      ...b,
      phrase_count: blockPhrases.length,
      mastered_count: masteredCount,
    };
  });

  if (language) {
    return enrichedBlocks.filter((b) => b.language === language);
  }
  return enrichedBlocks;
}

export function saveBlocks(blocks: ThemeBlock[]): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEYS.BLOCKS, JSON.stringify(blocks));
}

export function getBlockById(id: string): ThemeBlock | undefined {
  const blocks = getStoredBlocks();
  return blocks.find((b) => b.id === id);
}

export function getStoredPhrases(language?: Language): Phrase[] {
  let phrases: Phrase[] = INITIAL_PHRASES;
  if (isClient()) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PHRASES);
      if (data) {
        phrases = JSON.parse(data);
      } else {
        localStorage.setItem(STORAGE_KEYS.PHRASES, JSON.stringify(INITIAL_PHRASES));
      }
    } catch {
      phrases = INITIAL_PHRASES;
    }
  }

  if (language) {
    const blocks = getStoredBlocks(language);
    const blockIds = new Set(blocks.map((b) => b.id));
    return phrases.filter((p) => blockIds.has(p.block_id));
  }

  return phrases;
}

export function savePhrases(phrases: Phrase[]): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEYS.PHRASES, JSON.stringify(phrases));
}

export function getPhrasesByBlockId(blockId: string): Phrase[] {
  const phrases = getStoredPhrases();
  return phrases.filter((p) => p.block_id === blockId);
}

export function getStoredPracticeLogs(): PracticeLog[] {
  if (!isClient()) return INITIAL_PRACTICE_LOGS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (data) {
      return JSON.parse(data);
    }
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_PRACTICE_LOGS));
    return INITIAL_PRACTICE_LOGS;
  } catch {
    return INITIAL_PRACTICE_LOGS;
  }
}

export function savePracticeLogs(logs: PracticeLog[]): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
}

export function getSelectedLanguage(): Language {
  if (!isClient()) return 'EN';
  try {
    const lang = localStorage.getItem(STORAGE_KEYS.SELECTED_LANG);
    return lang === 'ZH' ? 'ZH' : 'EN';
  } catch {
    return 'EN';
  }
}

export function setSelectedLanguage(lang: Language): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEYS.SELECTED_LANG, lang);
}

/**
 * Met à jour une phrase suite à une révision FSRS (mode Rappel Actif)
 */
export function recordPhraseReview(
  phraseId: string,
  starRating: StarRating
): { phrase: Phrase; previousMastery: string; newMastery: string } {
  const phrases = getStoredPhrases();
  const index = phrases.findIndex((p) => p.id === phraseId);

  if (index === -1) {
    throw new Error(`Phrase introuvable : ${phraseId}`);
  }

  const currentPhrase = phrases[index];
  const previousMastery = currentPhrase.mastery_status;

  // Calcul FSRS
  const { fsrs_state, mastery_status } = processFsrsReview(
    currentPhrase.fsrs_state,
    starRating
  );

  const updatedPhrase: Phrase = {
    ...currentPhrase,
    star_rating: starRating,
    fsrs_state,
    mastery_status,
  };

  phrases[index] = updatedPhrase;
  savePhrases(phrases);

  // Enregistrement dans les logs de pratique du jour
  const block = getBlockById(currentPhrase.block_id);
  const language = block?.language || 'EN';
  const isNewLearned = previousMastery === 'NEW' && mastery_status !== 'NEW';
  
  recordDailyActivity(language, 1, 1, isNewLearned ? 1 : 0);

  return {
    phrase: updatedPhrase,
    previousMastery,
    newMastery: mastery_status,
  };
}

/**
 * Enregistre ou incrémente l'activité du jour
 */
export function recordDailyActivity(
  language: Language,
  minutesToAdd: number = 1,
  phrasesReviewed: number = 1,
  newPhrasesLearned: number = 0
): void {
  const today = new Date().toISOString().split('T')[0];
  const logs = getStoredPracticeLogs();
  const existingIndex = logs.findIndex((l) => l.date === today && l.language === language);

  if (existingIndex !== -1) {
    logs[existingIndex].minutes_practiced += minutesToAdd;
    logs[existingIndex].phrases_reviewed += phrasesReviewed;
    logs[existingIndex].new_phrases_learned += newPhrasesLearned;
  } else {
    logs.push({
      id: `log-${Date.now()}`,
      user_id: 'user-001',
      date: today,
      language,
      minutes_practiced: minutesToAdd,
      phrases_reviewed: phrasesReviewed,
      new_phrases_learned: newPhrasesLearned,
    });
  }

  savePracticeLogs(logs);
}

/**
 * Ajoute un bloc thématique personnalisé avec ses phrases générées
 */
export function addCustomBlockWithPhrases(
  blockData: Omit<ThemeBlock, 'id' | 'created_at'>,
  phrasesData: Array<{ text_target: string; phonetic?: string; text_native: string }>
): ThemeBlock {
  const blockId = `block-custom-${Date.now()}`;
  const newBlock: ThemeBlock = {
    ...blockData,
    id: blockId,
    is_custom: true,
    created_at: new Date().toISOString(),
    phrase_count: phrasesData.length,
    mastered_count: 0,
  };

  const blocks = getStoredBlocks();
  blocks.unshift(newBlock);
  saveBlocks(blocks);

  const currentPhrases = getStoredPhrases();
  const newPhrases: Phrase[] = phrasesData.map((p, idx) => ({
    id: `phrase-custom-${Date.now()}-${idx}`,
    block_id: blockId,
    text_target: p.text_target,
    phonetic: p.phonetic || null,
    text_native: p.text_native,
    mastery_status: 'NEW',
    star_rating: null,
    fsrs_state: null,
    created_at: new Date().toISOString(),
  }));

  savePhrases([...currentPhrases, ...newPhrases]);
  return newBlock;
}

/**
 * Récupère les histoires stockées, enrichies avec le nombre de phrases
 */
export function getStoredStories(language?: Language): Story[] {
  let stories: Story[] = INITIAL_STORIES;
  if (isClient()) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STORIES);
      if (data) {
        stories = JSON.parse(data);
      } else {
        localStorage.setItem(STORAGE_KEYS.STORIES, JSON.stringify(INITIAL_STORIES));
      }
    } catch {
      stories = INITIAL_STORIES;
    }
  }

  const sentences = getStoredStorySentences();

  const enrichedStories = stories.map((s) => {
    const storySentences = sentences.filter((sent) => sent.story_id === s.id);
    return {
      ...s,
      sentence_count: storySentences.length || s.sentence_count || 0,
    };
  });

  if (language) {
    return enrichedStories.filter((s) => s.language === language);
  }
  return enrichedStories;
}

export function saveStories(stories: Story[]): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEYS.STORIES, JSON.stringify(stories));
}

export function getStoryById(id: string): Story | undefined {
  const stories = getStoredStories();
  const story = stories.find((s) => s.id === id);
  if (!story) return undefined;
  const sentences = getStorySentences(id);
  return {
    ...story,
    sentences,
    sentence_count: sentences.length,
  };
}

export function getStoredStorySentences(): StorySentence[] {
  let sentences: StorySentence[] = INITIAL_STORY_SENTENCES;
  if (isClient()) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STORY_SENTENCES);
      if (data) {
        sentences = JSON.parse(data);
      } else {
        localStorage.setItem(STORAGE_KEYS.STORY_SENTENCES, JSON.stringify(INITIAL_STORY_SENTENCES));
      }
    } catch {
      sentences = INITIAL_STORY_SENTENCES;
    }
  }
  return sentences;
}

export function saveStorySentences(sentences: StorySentence[]): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEYS.STORY_SENTENCES, JSON.stringify(sentences));
}

/**
 * Récupère les phrases d'une histoire triées par sequence_order
 */
export function getStorySentences(storyId: string): StorySentence[] {
  const sentences = getStoredStorySentences();
  return sentences
    .filter((s) => s.story_id === storyId)
    .sort((a, b) => a.sequence_order - b.sequence_order);
}

/**
 * Met à jour une histoire suite à une révision FSRS globale
 */
export function recordStoryReview(
  storyId: string,
  starRating: StarRating
): { story: Story; previousMastery: string; newMastery: string } {
  const stories = getStoredStories();
  const index = stories.findIndex((s) => s.id === storyId);

  if (index === -1) {
    throw new Error(`Histoire introuvable : ${storyId}`);
  }

  const currentStory = stories[index];
  const previousMastery = currentStory.mastery_status;

  // Calcul FSRS global sur l'histoire
  const { fsrs_state, mastery_status } = processFsrsReview(
    currentStory.fsrs_state,
    starRating
  );

  const updatedStory: Story = {
    ...currentStory,
    star_rating: starRating,
    fsrs_state,
    mastery_status,
  };

  stories[index] = updatedStory;
  saveStories(stories);

  // Enregistrement de l'activité du jour
  const isNewLearned = previousMastery === 'NEW' && mastery_status !== 'NEW';
  recordDailyActivity(currentStory.language, 3, currentStory.sentence_count || 5, isNewLearned ? 1 : 0);

  return {
    story: updatedStory,
    previousMastery,
    newMastery: mastery_status,
  };
}

/**
 * Ajoute une histoire personnalisée avec ses phrases ordonnées
 */
export function addCustomStoryWithSentences(
  storyData: Omit<Story, 'id' | 'created_at' | 'sentence_count'>,
  sentencesData: Array<{ text_target: string; phonetic?: string; text_native: string; audio_url?: string }>
): Story {
  const storyId = `story-custom-${Date.now()}`;
  const newStory: Story = {
    ...storyData,
    id: storyId,
    is_custom: true,
    created_at: new Date().toISOString(),
    sentence_count: sentencesData.length,
    mastery_status: 'NEW',
    star_rating: null,
    fsrs_state: null,
  };

  const stories = getStoredStories();
  stories.unshift(newStory);
  saveStories(stories);

  const currentSentences = getStoredStorySentences();
  const newSentences: StorySentence[] = sentencesData.map((s, idx) => ({
    id: `story-sent-custom-${Date.now()}-${idx + 1}`,
    story_id: storyId,
    sequence_order: idx + 1,
    text_target: s.text_target,
    phonetic: s.phonetic || null,
    text_native: s.text_native,
    audio_url: s.audio_url || null,
    created_at: new Date().toISOString(),
  }));

  saveStorySentences([...currentSentences, ...newSentences]);
  return { ...newStory, sentences: newSentences };
}

/**
 * Réinitialise les données avec le jeu de données par défaut
 */
export function resetDataToMock(): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(INITIAL_USER));
  localStorage.setItem(STORAGE_KEYS.BLOCKS, JSON.stringify(INITIAL_BLOCKS));
  localStorage.setItem(STORAGE_KEYS.PHRASES, JSON.stringify(INITIAL_PHRASES));
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_PRACTICE_LOGS));
  localStorage.setItem(STORAGE_KEYS.STORIES, JSON.stringify(INITIAL_STORIES));
  localStorage.setItem(STORAGE_KEYS.STORY_SENTENCES, JSON.stringify(INITIAL_STORY_SENTENCES));
}

