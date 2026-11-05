import { NextResponse } from 'next/server';
import { generateThemeBlockWithGemini } from '@/lib/gemini';
import { createClient } from '@/lib/supabase/server';
import type { CECRLLevel, Language } from '@/types';

const LANGUAGES: readonly Language[] = ['EN', 'ZH'];
const LEVELS: readonly CECRLLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const MAX_TOPIC_LENGTH = 200;
const MAX_COUNT = 30;
const DEFAULT_COUNT = 5;

interface BlockRequest {
  topic: string;
  language: Language;
  level: CECRLLevel;
  count: number;
}

function parseBlockRequest(body: unknown): BlockRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { topic, language, level, count = DEFAULT_COUNT } = body as Record<string, unknown>;

  if (typeof topic !== 'string') return null;
  const trimmedTopic = topic.trim();
  if (!trimmedTopic || trimmedTopic.length > MAX_TOPIC_LENGTH) return null;
  if (!LANGUAGES.includes(language as Language)) return null;
  if (!LEVELS.includes(level as CECRLLevel)) return null;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    return null;
  }

  return {
    topic: trimmedTopic,
    language: language as Language,
    level: level as CECRLLevel,
    count,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  const blockRequest = parseBlockRequest(await request.json().catch(() => null));
  if (!blockRequest) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  try {
    const generatedBlock = await generateThemeBlockWithGemini(
      blockRequest.topic,
      blockRequest.language,
      blockRequest.level,
      blockRequest.count
    );

    return NextResponse.json({ success: true, data: generatedBlock });
  } catch (error) {
    console.error('Erreur API Gemini:', error);
    return NextResponse.json({ error: 'La génération a échoué. Réessaie.' }, { status: 500 });
  }
}
