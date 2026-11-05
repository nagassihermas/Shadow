import 'server-only';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Language, CECRLLevel } from '@/types';

const apiKey = process.env.GEMINI_API_KEY || '';

export const genAI = new GoogleGenerativeAI(apiKey);

export interface GeneratedPhraseItem {
  text_target: string;
  phonetic: string;
  text_native: string;
}

export interface GeneratedBlockResponse {
  title: string;
  category: string;
  level: CECRLLevel;
  language: Language;
  phrases: GeneratedPhraseItem[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Vérifie la forme de la réponse du modèle. Les phrases incomplètes sont
 * écartées ; moins de phrases que demandé reste acceptable, plus sont tronquées.
 */
function parseGeneratedBlock(
  raw: unknown,
  language: Language,
  level: CECRLLevel,
  count: number
): GeneratedBlockResponse {
  const data = (raw ?? {}) as Record<string, unknown>;
  if (!isNonEmptyString(data.title) || !Array.isArray(data.phrases)) {
    throw new Error('Réponse Gemini invalide : titre ou phrases manquants.');
  }

  const phrases = data.phrases
    .filter(
      (phrase): phrase is Record<string, unknown> =>
        typeof phrase === 'object' &&
        phrase !== null &&
        isNonEmptyString((phrase as Record<string, unknown>).text_target) &&
        isNonEmptyString((phrase as Record<string, unknown>).text_native)
    )
    .slice(0, count)
    .map((phrase) => ({
      text_target: phrase.text_target as string,
      phonetic: typeof phrase.phonetic === 'string' ? phrase.phonetic : '',
      text_native: phrase.text_native as string,
    }));

  if (phrases.length === 0) {
    throw new Error('Réponse Gemini invalide : aucune phrase exploitable.');
  }

  return {
    title: data.title,
    category: isNonEmptyString(data.category) ? data.category : 'Personnalisé',
    level,
    language,
    phrases,
  };
}

/**
 * Génère des phrases ou un bloc thématique personnalisé avec l'IA Gemini
 */
export async function generateThemeBlockWithGemini(
  topic: string,
  language: Language,
  level: CECRLLevel,
  count: number = 20
): Promise<GeneratedBlockResponse> {
  if (!apiKey) {
    throw new Error('Clé API Gemini non configurée (GEMINI_API_KEY).');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash-lite',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const langLabel = language === 'ZH' ? 'Chinois Mandarin' : 'Anglais';
  const prompt = `Génère un bloc thématique d'apprentissage pour la langue ${langLabel}, niveau CECRL ${level}, sur le thème : "${topic}".
Retourne un objet JSON valide avec ce format exact :
{
  "title": "Titre du bloc thématique en Français",
  "category": "Catégorie (ex: Vie Pratique, Professionnel, etc.)",
  "level": "${level}",
  "language": "${language}",
  "phrases": [
    {
      "text_target": "Phrase dans la langue cible (${langLabel})",
      "phonetic": "${language === 'ZH' ? 'Pinyin complet avec accents de tons' : 'Transcription phonétique IPA'}",
      "text_native": "Traduction fluide en Français"
    }
  ]
}
Génère exactement ${count} phrases adaptées au niveau ${level}.`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  return parseGeneratedBlock(JSON.parse(responseText), language, level, count);
}
