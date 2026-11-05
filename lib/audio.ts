import type { Language } from '@/types';

const AUDIO_BASE_URL = process.env.NEXT_PUBLIC_AUDIO_BASE_URL?.replace(/\/+$/, '');

/**
 * URL of a generated recording, or null when no audio host is configured
 * (AudioPlayer then falls back to the browser's speech synthesis).
 * Blocks are indexed from 0 in phrase order, stories by sequence_order from 1,
 * as written by generate-audio.py.
 */
export function getAudioUrl(kind: 'block' | 'story', slug: string, index: number): string | null {
  if (!AUDIO_BASE_URL) return null;
  return `${AUDIO_BASE_URL}/${kind === 'block' ? 'blocks' : 'stories'}/${slug}/${index}.mp3`;
}

/** "À l'hôtel" in English gives en-a-l-hotel, the folder name in output/audio/blocks. */
export function getBlockAudioSlug(language: Language, title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${language.toLowerCase()}-${slug}`;
}
