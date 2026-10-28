import { Language, TTSRequest, TTSResponse } from '@/types';

export interface GoogleCloudTTSVoiceConfig {
  languageCode: string;
  name: string;
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
}

// Configuration des voix Google Cloud TTS par langue
export const GOOGLE_TTS_VOICES: Record<Language, GoogleCloudTTSVoiceConfig[]> = {
  EN: [
    { languageCode: 'en-US', name: 'en-US-Neural2-F', ssmlGender: 'FEMALE' },
    { languageCode: 'en-US', name: 'en-US-Neural2-D', ssmlGender: 'MALE' },
    { languageCode: 'en-GB', name: 'en-GB-Neural2-B', ssmlGender: 'MALE' },
  ],
  ZH: [
    { languageCode: 'cmn-CN', name: 'cmn-CN-Neural2-C', ssmlGender: 'MALE' },
    { languageCode: 'cmn-CN', name: 'cmn-CN-Neural2-A', ssmlGender: 'FEMALE' },
  ],
};

/**
 * Interface pour le client Google Cloud Text-to-Speech
 */
export interface GoogleCloudTTSClient {
  synthesizeSpeech(request: TTSRequest): Promise<TTSResponse>;
}

/**
 * Implémentation prête pour Google Cloud Text-to-Speech API
 * Prête à recevoir la clé API ou une route serveur /api/tts
 */
export class GoogleCloudTTSService implements GoogleCloudTTSClient {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY;
  }

  async synthesizeSpeech(request: TTSRequest): Promise<TTSResponse> {
    const voice = GOOGLE_TTS_VOICES[request.language][0];

    // Si une clé d'API est fournie, nous pouvons faire l'appel réel
    if (this.apiKey) {
      try {
        const response = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: { text: request.text },
              voice: {
                languageCode: voice.languageCode,
                name: voice.name,
                ssmlGender: request.voiceGender || voice.ssmlGender,
              },
              audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: request.speakingRate || 1.0,
                pitch: request.pitch || 0.0,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Google TTS Error: ${response.statusText}`);
        }

        const data = await response.json();
        return {
          success: true,
          audioBase64: data.audioContent,
          audioUrl: `data:audio/mp3;base64,${data.audioContent}`,
        };
      } catch (error) {
        console.warn('Fallback to local Web Speech API due to TTS error:', error);
      }
    }

    // Structure prête / Fallback navigateur instantané pour le développement
    return {
      success: true,
      message: 'Interface Google Cloud TTS prête (utilise Web Speech API local par défaut)',
    };
  }
}

export const ttsService = new GoogleCloudTTSService();

/**
 * Lit le texte à voix haute en utilisant Web Speech API du navigateur (support instantané sans clé)
 */
export function speakTextNative(text: string, language: Language, rate: number = 0.9): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    // Annule la synthèse en cours
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'ZH' ? 'zh-CN' : 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1.0;

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}
