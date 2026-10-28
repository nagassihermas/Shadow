import { CECRLLevel, CECRLThreshold, Language } from '@/types';

// Table de configuration par défaut des seuils CECRL (différenciée EN / ZH)
export const DEFAULT_CECRL_THRESHOLDS: CECRLThreshold[] = [
  // Anglais (EN)
  { language: 'EN', level: 'A1', min_mastered_phrases: 0, description: 'Découverte et expressions élémentaires' },
  { language: 'EN', level: 'A2', min_mastered_phrases: 50, description: 'Situations quotidiennes et phrases usuelles' },
  { language: 'EN', level: 'B1', min_mastered_phrases: 150, description: 'Autonomie et conversations courantes' },
  { language: 'EN', level: 'B2', min_mastered_phrases: 350, description: 'Aisance et fluidité spontanée' },
  { language: 'EN', level: 'C1', min_mastered_phrases: 700, description: 'Maîtrise nuancée et lexique complexe' },
  { language: 'EN', level: 'C2', min_mastered_phrases: 1200, description: 'Bilinguisme pratique et précision native' },

  // Chinois Mandarin (ZH) - calibré en cohérence avec les paliers HSK 1 à 6
  { language: 'ZH', level: 'A1', min_mastered_phrases: 0, description: 'Salutations et formules fondamentales (HSK 1)' },
  { language: 'ZH', level: 'A2', min_mastered_phrases: 40, description: 'Échanges simples et repères usuels (HSK 2)' },
  { language: 'ZH', level: 'B1', min_mastered_phrases: 120, description: 'Voyage et vie quotidienne (HSK 3)' },
  { language: 'ZH', level: 'B2', min_mastered_phrases: 280, description: 'Discussions structurées (HSK 4)' },
  { language: 'ZH', level: 'C1', min_mastered_phrases: 550, description: 'Lecture fluide et nuances orales (HSK 5)' },
  { language: 'ZH', level: 'C2', min_mastered_phrases: 950, description: 'Maîtrise avancée et expressions idiomatiques (HSK 6)' },
];

export const CECRL_ORDER: CECRLLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const CECRL_DISCLAIMER = 
  "Ce niveau est une estimation interne calculée d'après le nombre de phrases maîtrisées (stabilité FSRS). Il ne constitue pas un certificat officiel CECRL ou HSK.";

export interface CECRLProgressResult {
  currentLevel: CECRLLevel;
  nextLevel: CECRLLevel | null;
  masteredCount: number;
  currentThreshold: number;
  nextThreshold: number | null;
  progressPercent: number;
  phrasesToNextLevel: number;
  description: string;
}

/**
 * Calcule le niveau CECRL estimé et la progression vers le niveau suivant
 * en fonction de la langue et du nombre de phrases 'MASTERED'.
 */
export function calculateCECRLProgress(
  language: Language,
  masteredCount: number,
  thresholds: CECRLThreshold[] = DEFAULT_CECRL_THRESHOLDS
): CECRLProgressResult {
  const langThresholds = thresholds
    .filter((t) => t.language === language)
    .sort((a, b) => a.min_mastered_phrases - b.min_mastered_phrases);

  let currentLevel: CECRLLevel = 'A1';
  let currentThreshold = 0;
  let description = '';

  for (let i = langThresholds.length - 1; i >= 0; i--) {
    if (masteredCount >= langThresholds[i].min_mastered_phrases) {
      currentLevel = langThresholds[i].level;
      currentThreshold = langThresholds[i].min_mastered_phrases;
      description = langThresholds[i].description;
      break;
    }
  }

  const currentIndex = CECRL_ORDER.indexOf(currentLevel);
  const nextLevel = currentIndex < CECRL_ORDER.length - 1 ? CECRL_ORDER[currentIndex + 1] : null;

  const nextThresholdObj = nextLevel
    ? langThresholds.find((t) => t.level === nextLevel)
    : null;

  const nextThreshold = nextThresholdObj ? nextThresholdObj.min_mastered_phrases : null;

  let progressPercent = 100;
  let phrasesToNextLevel = 0;

  if (nextThreshold !== null) {
    const range = nextThreshold - currentThreshold;
    const progress = masteredCount - currentThreshold;
    progressPercent = Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
    phrasesToNextLevel = Math.max(0, nextThreshold - masteredCount);
  }

  return {
    currentLevel,
    nextLevel,
    masteredCount,
    currentThreshold,
    nextThreshold,
    progressPercent,
    phrasesToNextLevel,
    description,
  };
}
