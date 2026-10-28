import { NextResponse } from 'next/server';
import { generateThemeBlockWithGemini } from '@/lib/gemini';
import { Language, CECRLLevel } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, language, level, count } = body;

    if (!topic || !language || !level) {
      return NextResponse.json(
        { error: 'Champs manquants : topic, language et level sont requis.' },
        { status: 400 }
      );
    }

    const generatedBlock = await generateThemeBlockWithGemini(
      topic,
      language as Language,
      level as CECRLLevel,
      count || 5
    );

    return NextResponse.json({ success: true, data: generatedBlock });
  } catch (error: any) {
    console.error('Erreur API Gemini:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la génération avec Gemini' },
      { status: 500 }
    );
  }
}
