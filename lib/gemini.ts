import { GoogleGenerativeAI } from '@google/generative-ai';
import { Language, CECRLLevel } from '@/types';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

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

/**
 * Génère des phrases ou un bloc thématique personnalisé avec l'IA Gemini
 */
export async function generateThemeBlockWithGemini(
  topic: string,
  language: Language,
  level: CECRLLevel,
  count: number = 5
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
  return JSON.parse(responseText) as GeneratedBlockResponse;
}
