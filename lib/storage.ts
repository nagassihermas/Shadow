'use client';

import { ThemeBlock, Phrase, PracticeLog, User, Language, StarRating, StoryMeta, StoryProgress, StoryReaderPrefs } from '@/types';
import { INITIAL_BLOCKS, INITIAL_PHRASES, INITIAL_PRACTICE_LOGS } from './mock-data';
import { getAudioUrl, getBlockAudioSlug } from './audio';
import { processFsrsReview } from './fsrs';

const ACTIVE_UID_KEY = 'shadow_active_uid';
const ANONYMOUS_PREFIX = 'anon';

const STORAGE_SUFFIXES = {
  USER: 'user_v1',
  BLOCKS: 'blocks_v1',
  PHRASES: 'phrases_v1',
  LOGS: 'logs_v1',
  SELECTED_LANG: 'selected_lang_v1',
  STORY_PROGRESS: 'story_progress_v1',
  STORY_PREFS: 'story_prefs_v1',
};

// Jamais utilisées par une page : effacées, sans reprise, lors de la migration.
const OBSOLETE_LEGACY_KEYS = ['shadow_stories_v1', 'shadow_story_sentences_v1'];

// Vérification de la disponibilité du localStorage côté client
function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Compte actif sur cet appareil. Lu de façon synchrone car toutes les
 * fonctions de ce module le sont ; AuthProvider le réaligne sur la session.
 */
export function getActiveUid(): string | null {
  if (!isClient()) return null;
  try {
    return localStorage.getItem(ACTIVE_UID_KEY);
  } catch {
    return null;
  }
}

export function setActiveUid(uid: string): void {
  if (!isClient()) return;
  try {
    migrateLegacyData(uid);
    localStorage.setItem(ACTIVE_UID_KEY, uid);
  } catch {
    // localStorage indisponible : les données restent sous le préfixe anonyme.
  }
}

export function clearActiveUid(): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(ACTIVE_UID_KEY);
  } catch {
    // Rien à effacer.
  }
}

function storageKey(suffix: string, uid: string | null = getActiveUid()): string {
  return `shadow_${uid ?? ANONYMOUS_PREFIX}_${suffix}`;
}

// Accesseurs : la clé dépend du compte actif au moment de la lecture.
const STORAGE_KEYS = {
  get USER() { return storageKey(STORAGE_SUFFIXES.USER); },
  get BLOCKS() { return storageKey(STORAGE_SUFFIXES.BLOCKS); },
  get PHRASES() { return storageKey(STORAGE_SUFFIXES.PHRASES); },
  get LOGS() { return storageKey(STORAGE_SUFFIXES.LOGS); },
  get SELECTED_LANG() { return storageKey(STORAGE_SUFFIXES.SELECTED_LANG); },
  get STORY_PROGRESS() { return storageKey(STORAGE_SUFFIXES.STORY_PROGRESS); },
  get STORY_PREFS() { return storageKey(STORAGE_SUFFIXES.STORY_PREFS); },
};

/**
 * Migration unique : les données de l'époque sans compte (clés non préfixées)
 * reviennent au premier compte connecté sur l'appareil. L'utilisateur factice
 * n'est pas repris : le profil réel le remplace.
 */
function migrateLegacyData(uid: string): void {
  OBSOLETE_LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));

  const suffixes = Object.values(STORAGE_SUFFIXES);
  const legacyKey = (suffix: string) => `shadow_${suffix}`;

  if (!suffixes.some((suffix) => localStorage.getItem(legacyKey(suffix)) !== null)) return;
  if (suffixes.some((suffix) => localStorage.getItem(storageKey(suffix, uid)) !== null)) return;

  suffixes.forEach((suffix) => {
    const value = localStorage.getItem(legacyKey(suffix));
    if (value === null) return;
    if (suffix !== STORAGE_SUFFIXES.USER) localStorage.setItem(storageKey(suffix, uid), value);
    localStorage.removeItem(legacyKey(suffix));
  });
}

/** Efface toutes les données locales d'un compte (suppression du compte). */
export function deleteLocalUserData(uid: string): void {
  if (!isClient()) return;
  const prefix = `shadow_${uid}_`;
  Object.keys(localStorage)
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => localStorage.removeItem(key));
}

function emptyUser(): User {
  return {
    id: getActiveUid() ?? ANONYMOUS_PREFIX,
    email: '',
    name: null,
    target_languages: ['EN', 'ZH'],
    cecrl_level_by_lang: { EN: 'A1', ZH: 'A1' },
    created_at: new Date().toISOString(),
  };
}

/** Dernier profil connu (cache hors ligne) ; la table profiles fait foi. */
export function getStoredUser(): User {
  if (!isClient()) return emptyUser();
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : emptyUser();
  } catch {
    return emptyUser();
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
  const block = getBlockById(blockId);
  // L'index audio suit l'ordre des phrases du bloc ; les blocs générés n'ont pas d'audio.
  const audioSlug = block && !block.is_custom ? getBlockAudioSlug(block.language, block.title) : null;
  return getStoredPhrases()
    .filter((p) => p.block_id === blockId)
    .map((p, index) => ({
      ...p,
      audio_url: p.audio_url ?? (audioSlug ? getAudioUrl('block', audioSlug, index) : null),
    }));
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
      user_id: getActiveUid(),
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
 * Progression de toutes les histoires, indexée par id. Le contenu des histoires
 * vient de public/data/stories (voir lib/stories.ts) et n'est jamais copié ici.
 */
export function getAllStoryProgress(): Record<string, StoryProgress> {
  if (!isClient()) return {};
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STORY_PROGRESS);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function getStoryProgress(id: string): StoryProgress | undefined {
  return getAllStoryProgress()[id];
}

/**
 * Note une histoire : le calendrier FSRS est global à l'histoire, pas par phrase.
 */
export function recordStoryReview(
  story: Pick<StoryMeta, 'id' | 'language' | 'sentence_count'>,
  starRating: StarRating
): StoryProgress {
  const allProgress = getAllStoryProgress();
  const previous = allProgress[story.id];

  const { fsrs_state, mastery_status } = processFsrsReview(previous?.fsrs_state, starRating);
  const progress: StoryProgress = { star_rating: starRating, fsrs_state, mastery_status };

  allProgress[story.id] = progress;
  localStorage.setItem(STORAGE_KEYS.STORY_PROGRESS, JSON.stringify(allProgress));

  recordDailyActivity(story.language, 3, story.sentence_count, previous ? 0 : 1);
  return progress;
}

export function getStoryReaderPrefs(): StoryReaderPrefs {
  const defaults: StoryReaderPrefs = { showPhonetic: true, showTranslation: true };
  if (!isClient()) return defaults;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STORY_PREFS);
    return data ? { ...defaults, ...JSON.parse(data) } : defaults;
  } catch {
    return defaults;
  }
}

export function saveStoryReaderPrefs(prefs: StoryReaderPrefs): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEYS.STORY_PREFS, JSON.stringify(prefs));
}

/**
 * Réinitialise les données avec le jeu de données par défaut
 */
export function resetDataToMock(): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEYS.BLOCKS, JSON.stringify(INITIAL_BLOCKS));
  localStorage.setItem(STORAGE_KEYS.PHRASES, JSON.stringify(INITIAL_PHRASES));
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_PRACTICE_LOGS));
  localStorage.removeItem(STORAGE_KEYS.STORY_PROGRESS);
}

