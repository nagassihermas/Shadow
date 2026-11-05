'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle2, Pause, Play, Square } from 'lucide-react';
import { Header } from '@/components/navigation/Header';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StarRating } from '@/components/ui/StarRating';
import { getAudioUrl } from '@/lib/audio';
import { useDictionary } from '@/lib/i18n/DictionaryProvider';
import {
  getStoryProgress,
  getStoryReaderPrefs,
  recordStoryReview,
  saveStoryReaderPrefs,
} from '@/lib/storage';
import { compareByLevelAndTitle, loadStoriesIndex, loadStory } from '@/lib/stories';
import { speakTextNative } from '@/lib/tts';
import { cn } from '@/lib/utils';
import type { StarRating as StarRatingValue, StoryDetail, StoryProgress, StorySentenceContent } from '@/types';

const SPEEDS = [0.7, 0.9, 1];

type Screen = 'reading' | 'rating' | 'result';

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-muted min-h-11 cursor-pointer">
      <input
        type="checkbox"
        className="accent-primary w-4 h-4"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}

export default function StoryReaderPage() {
  const { id } = useParams<{ id: string }>();
  const { dict, locale } = useDictionary();
  const t = dict.stories;

  const [story, setStory] = useState<StoryDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [screen, setScreen] = useState<Screen>('reading');
  const [showPhonetic, setShowPhonetic] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [rating, setRating] = useState<StarRatingValue | null>(null);
  const [result, setResult] = useState<StoryProgress | null>(null);
  const [nextStoryId, setNextStoryId] = useState<string | null>(null);

  // Continuous playback. A new token invalidates whatever loop is still running.
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [pausedIndex, setPausedIndex] = useState<number | null>(null);
  const [speed, setSpeed] = useState(0.9);
  const speedRef = useRef(speed);
  const playToken = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sentenceRefs = useRef<Array<HTMLDivElement | null>>([]);

  const silence = useCallback(() => {
    playToken.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const stopPlayback = useCallback(() => {
    silence();
    setPlayingIndex(null);
    setPausedIndex(null);
  }, [silence]);

  useEffect(() => silence, [silence]);

  const load = useCallback(() => {
    setFailed(false);
    loadStory(id).then(setStory).catch(() => setFailed(true));
  }, [id]);

  useEffect(() => {
    const prefs = getStoryReaderPrefs();
    setShowPhonetic(prefs.showPhonetic);
    setShowTranslation(prefs.showTranslation);
    load();
  }, [load]);

  const updatePrefs = (phonetic: boolean, translation: boolean) => {
    setShowPhonetic(phonetic);
    setShowTranslation(translation);
    saveStoryReaderPrefs({ showPhonetic: phonetic, showTranslation: translation });
  };

  const playSentence = (sentence: StorySentenceContent, token: number) =>
    new Promise<void>((resolve) => {
      if (!story) return resolve();
      const speak = () => speakTextNative(sentence.text_target, story.language, speedRef.current).then(resolve);
      const url = getAudioUrl('story', story.id, sentence.sequence_order);
      if (!url) return void speak();

      const audio = new Audio(url);
      audio.playbackRate = speedRef.current;
      audioRef.current = audio;
      const fallback = () => {
        if (token === playToken.current) speak();
        else resolve();
      };
      audio.onended = () => resolve();
      audio.onpause = () => {
        if (token !== playToken.current) resolve();
      };
      audio.onerror = fallback;
      audio.play().catch(fallback);
    });

  const playFrom = async (start: number) => {
    if (!story) return;
    silence();
    const token = playToken.current;
    setPausedIndex(null);
    for (let index = start; index < story.sentences.length; index += 1) {
      if (token !== playToken.current) return;
      setPlayingIndex(index);
      sentenceRefs.current[index]?.scrollIntoView({
        block: 'center',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
      await playSentence(story.sentences[index], token);
    }
    if (token === playToken.current) setPlayingIndex(null);
  };

  const pausePlayback = () => {
    const index = playingIndex;
    silence();
    setPlayingIndex(null);
    setPausedIndex(index);
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    speedRef.current = next;
    if (audioRef.current) audioRef.current.playbackRate = next;
    setSpeed(next);
  };

  const finishReading = () => {
    stopPlayback();
    setRating(null);
    setScreen('rating');
    window.scrollTo(0, 0);
  };

  const saveRating = async () => {
    if (!story || !rating) return;
    setResult(recordStoryReview(story, rating));
    setScreen('result');
    try {
      const index = await loadStoriesIndex();
      const sameLanguage = index
        .filter((item) => item.language === story.language)
        .sort(compareByLevelAndTitle);
      const position = sameLanguage.findIndex((item) => item.id === story.id);
      setNextStoryId(sameLanguage[position + 1]?.id ?? null);
    } catch {
      setNextStoryId(null);
    }
  };

  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
    [locale]
  );

  if (failed) {
    return (
      <div className="flex-1 pb-6">
        <Header showBack backHref="/stories" title={t.title} />
        <div className="max-w-xl mx-auto px-4 pt-6">
          <Card variant="subtle" className="text-center py-10 space-y-3">
            <p role="alert" className="text-sm text-text-muted">
              {t.loadError}
            </p>
            <Button type="button" variant="subtle" size="sm" onClick={load}>
              {t.retry}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]" role="status" aria-label={dict.auth.loading}>
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (screen === 'rating') {
    return (
      <div className="flex-1 pb-6">
        <Header showBack backHref="/stories" title={story.title} />
        <div className="max-w-xl mx-auto px-4 pt-6">
          <Card variant="elevated" padding="lg" className="space-y-5 text-center">
            <div>
              <h1 className="text-lg font-bold text-text">{t.ratingTitle}</h1>
              <p className="text-sm text-text-muted mt-1">{t.ratingSubtitle}</p>
            </div>
            <StarRating value={rating} onChange={setRating} size="lg" showLabels />
            <Button type="button" fullWidth disabled={!rating} onClick={saveRating}>
              {t.saveRating}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (screen === 'result' && result) {
    const nextReview = result.fsrs_state ? new Date(result.fsrs_state.due) : null;
    return (
      <div className="flex-1 pb-6">
        <Header showBack backHref="/stories" title={story.title} />
        <div className="max-w-xl mx-auto px-4 pt-6">
          <Card variant="elevated" padding="lg" className="space-y-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary-subtle text-primary flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-bold text-text">{t.resultTitle}</h1>
            <Badge masteryStatus={result.mastery_status}>{t.mastery[result.mastery_status]}</Badge>
            {nextReview && (
              <p className="text-sm text-text-muted">
                {t.nextReview.replace('{date}', dateFormat.format(nextReview))}
              </p>
            )}
            <div className="space-y-2 pt-1">
              {nextStoryId && (
                <Link href={`/stories/${nextStoryId}`} className="block">
                  <Button type="button" fullWidth>
                    {t.nextStory}
                  </Button>
                </Link>
              )}
              <Button type="button" variant="subtle" fullWidth onClick={() => setScreen('reading')}>
                {t.reread}
              </Button>
              <Link href="/stories" className="block">
                <Button type="button" variant="outline" fullWidth>
                  {t.backToList}
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const progress = getStoryProgress(story.id);
  const status = progress?.mastery_status ?? 'NEW';
  const isPlaying = playingIndex !== null;

  return (
    <div className="flex-1 pb-6">
      <Header showBack backHref="/stories" title={story.title} />

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge level={story.level} size="sm">
            {story.level}
          </Badge>
          <span className="text-[11px] text-text-muted">{t.categories[story.category]}</span>
          <Badge masteryStatus={status} size="sm">
            {t.mastery[status]}
          </Badge>
        </div>

        <Card variant="default" padding="sm" className="sticky top-16 z-20 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              className="flex-1"
              leftIcon={
                isPlaying ? (
                  <Pause className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Play className="w-4 h-4" aria-hidden="true" />
                )
              }
              onClick={() => (isPlaying ? pausePlayback() : playFrom(pausedIndex ?? 0))}
            >
              {isPlaying ? t.pause : pausedIndex !== null ? t.resume : t.listen}
            </Button>
            {(isPlaying || pausedIndex !== null) && (
              <Button type="button" variant="subtle" size="icon" aria-label={t.stop} onClick={stopPlayback}>
                <Square className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
            <Button type="button" variant="subtle" aria-label={t.speed} onClick={cycleSpeed} className="font-mono">
              {speed}x
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <Toggle checked={showPhonetic} onChange={(value) => updatePrefs(value, showTranslation)}>
              {t.phonetic}
            </Toggle>
            <Toggle checked={showTranslation} onChange={(value) => updatePrefs(showPhonetic, value)}>
              {t.translation}
            </Toggle>
          </div>
        </Card>

        <div className="space-y-2">
          {story.sentences.map((sentence, index) => (
            <div
              key={sentence.sequence_order}
              ref={(element) => {
                sentenceRefs.current[index] = element;
              }}
              aria-current={playingIndex === index ? 'true' : undefined}
              className={cn(
                'flex items-start gap-3 rounded-md border p-3 scroll-mt-40 transition-colors duration-200',
                playingIndex === index
                  ? 'border-primary bg-primary-subtle'
                  : 'border-surface-border/70 bg-surface'
              )}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-base text-text">{sentence.text_target}</p>
                {showPhonetic && sentence.phonetic && (
                  <p className="text-xs text-text-muted font-mono break-words">{sentence.phonetic}</p>
                )}
                {showTranslation && <p className="text-sm text-text-muted">{sentence.text_native}</p>}
              </div>
              <AudioPlayer
                text={sentence.text_target}
                language={story.language}
                audioUrl={getAudioUrl('story', story.id, sentence.sequence_order)}
                size="sm"
                onPlayStart={stopPlayback}
              />
            </div>
          ))}
        </div>

        <Button type="button" fullWidth size="lg" onClick={finishReading}>
          {t.finished}
        </Button>
      </div>
    </div>
  );
}
