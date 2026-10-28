'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX, Pause, Play, RotateCcw } from 'lucide-react';
import { Language } from '@/types';
import { speakTextNative } from '@/lib/tts';
import { cn } from '@/lib/utils';

export interface AudioPlayerProps {
  text: string;
  language: Language;
  audioUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showSpeedControl?: boolean;
  label?: string;
  className?: string;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
}

export function AudioPlayer({
  text,
  language,
  audioUrl,
  size = 'md',
  showSpeedControl = false,
  label,
  className,
  onPlayStart,
  onPlayEnd,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.9);

  const handlePlay = async () => {
    if (isPlaying) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      onPlayEnd?.();
      return;
    }

    setIsPlaying(true);
    onPlayStart?.();

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.playbackRate = playbackSpeed;
      audio.onended = () => {
        setIsPlaying(false);
        onPlayEnd?.();
      };
      audio.onerror = async () => {
        // Fallback to native synthesis
        await speakTextNative(text, language, playbackSpeed);
        setIsPlaying(false);
        onPlayEnd?.();
      };
      audio.play().catch(async () => {
        await speakTextNative(text, language, playbackSpeed);
        setIsPlaying(false);
        onPlayEnd?.();
      });
    } else {
      await speakTextNative(text, language, playbackSpeed);
      setIsPlaying(false);
      onPlayEnd?.();
    }
  };

  const toggleSpeed = () => {
    setPlaybackSpeed((prev) => (prev === 0.9 ? 0.7 : 0.9));
  };

  const sizeClasses = {
    sm: 'p-2 text-xs',
    md: 'p-3 text-sm',
    lg: 'p-4 text-base',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={handlePlay}
        className={cn(
          'inline-flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          sizeClasses[size],
          isPlaying
            ? 'bg-primary text-background shadow-md animate-pulse'
            : 'bg-surface-elevated text-text hover:bg-surface-hover hover:text-primary border border-surface-border'
        )}
        title={isPlaying ? 'Arrêter la lecture' : 'Écouter la prononciation'}
        aria-label={isPlaying ? 'Arrêter la lecture' : 'Écouter la prononciation'}
      >
        {isPlaying ? (
          <Volume2 className={cn(iconSizes[size], 'animate-bounce')} />
        ) : (
          <Volume2 className={iconSizes[size]} />
        )}
        {label && <span className="ml-2 font-medium">{label}</span>}
      </button>

      {showSpeedControl && (
        <button
          type="button"
          onClick={toggleSpeed}
          className="text-[11px] px-2 py-1 rounded bg-surface-subtle border border-surface-border text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
          title="Modifier la vitesse de lecture"
        >
          {playbackSpeed === 0.7 ? '0.7x (Lent)' : '1.0x (Normal)'}
        </button>
      )}
    </div>
  );
}
