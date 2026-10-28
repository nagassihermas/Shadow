'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RefreshCw, Layers } from 'lucide-react';
import { Button } from './Button';
import { AudioRecorder as AudioRecorderService, RecordingResult } from '@/lib/audio-recorder';
import { speakTextNative } from '@/lib/tts';
import { Language } from '@/types';
import { cn } from '@/lib/utils';

export interface AudioRecorderComponentProps {
  nativeText: string;
  targetLanguage: Language;
  onRecordingComplete?: (result: RecordingResult) => void;
  className?: string;
}

export function AudioRecorderComponent({
  nativeText,
  targetLanguage,
  onRecordingComplete,
  className,
}: AudioRecorderComponentProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingResult, setRecordingResult] = useState<RecordingResult | null>(null);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recorderRef = useRef<AudioRecorderService | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    recorderRef.current = new AudioRecorderService();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.cancel();
      if (userAudioRef.current) {
        userAudioRef.current.pause();
      }
    };
  }, []);

  // Reset recording state when text changes
  useEffect(() => {
    setRecordingResult(null);
    setIsRecording(false);
    setRecordingDuration(0);
    setIsPlayingUserAudio(false);
    setIsComparing(false);
  }, [nativeText]);

  const startRecording = async () => {
    setErrorMessage(null);
    try {
      if (userAudioRef.current) {
        userAudioRef.current.pause();
        setIsPlayingUserAudio(false);
      }
      await recorderRef.current?.start();
      setIsRecording(true);
      setRecordingDuration(0);

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 200);
    } catch (err) {
      console.error('Microphone error:', err);
      setErrorMessage(
        'Accès au micro refusé ou non supporté. Veuillez autoriser le microphone.'
      );
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      const result = await recorderRef.current?.stop();
      setIsRecording(false);
      if (result) {
        setRecordingResult(result);
        onRecordingComplete?.(result);
      }
    } catch (err) {
      console.error('Stop recording error:', err);
      setIsRecording(false);
    }
  };

  const playUserAudio = () => {
    if (!recordingResult?.audioUrl) return;

    if (isPlayingUserAudio && userAudioRef.current) {
      userAudioRef.current.pause();
      setIsPlayingUserAudio(false);
      return;
    }

    const audio = new Audio(recordingResult.audioUrl);
    userAudioRef.current = audio;
    setIsPlayingUserAudio(true);

    audio.onended = () => {
      setIsPlayingUserAudio(false);
    };
    audio.onerror = () => {
      setIsPlayingUserAudio(false);
    };

    audio.play();
  };

  /**
   * Relecture comparée :
   * 1. Joue l'audio natif (TTS)
   * 2. Petite pause (400ms)
   * 3. Joue l'enregistrement de l'utilisateur
   */
  const handleComparePlayback = async () => {
    if (isComparing || !recordingResult?.audioUrl) return;

    setIsComparing(true);

    // 1. Jouer la voix native
    await speakTextNative(nativeText, targetLanguage, 0.9);

    // 2. Pause
    await new Promise((resolve) => setTimeout(resolve, 400));

    // 3. Jouer la voix de l'utilisateur
    const audio = new Audio(recordingResult.audioUrl);
    userAudioRef.current = audio;

    audio.onended = () => {
      setIsComparing(false);
    };
    audio.onerror = () => {
      setIsComparing(false);
    };

    audio.play();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('flex flex-col items-center gap-4 w-full', className)}>
      {errorMessage && (
        <div className="text-xs text-danger bg-danger-subtle p-2.5 rounded border border-danger/30 text-center w-full">
          {errorMessage}
        </div>
      )}

      {/* Bouton d'enregistrement principal */}
      {!recordingResult ? (
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 shadow-lg',
              isRecording
                ? 'bg-danger text-text animate-pulse ring-4 ring-danger/30'
                : 'bg-surface-elevated text-danger border-2 border-danger/40 hover:bg-surface-hover active:scale-95'
            )}
            aria-label={isRecording ? "Arrêter l'enregistrement" : 'Enregistrer votre voix'}
          >
            {isRecording ? (
              <Square className="w-6 h-6 fill-current" />
            ) : (
              <Mic className="w-7 h-7" />
            )}
          </button>

          <p className="text-xs font-mono text-text-muted">
            {isRecording
              ? `Enregistrement en cours (${formatDuration(recordingDuration)})`
              : 'Appuyez pour enregistrer votre répétition'}
          </p>
        </div>
      ) : (
        /* Actions après enregistrement */
        <div className="flex flex-col items-center gap-3 w-full bg-surface-subtle p-4 rounded-md border border-surface-border">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-primary font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              Enregistrement capturé ({Math.round(recordingResult.durationMs / 1000)}s)
            </span>
            <button
              type="button"
              onClick={startRecording}
              className="text-xs text-text-muted hover:text-text flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Réenregistrer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={playUserAudio}
              leftIcon={isPlayingUserAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            >
              {isPlayingUserAudio ? 'Pause' : 'Écouter ma voix'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={isComparing}
              onClick={handleComparePlayback}
              leftIcon={<Layers className="w-4 h-4" />}
            >
              {isComparing ? 'Comparaison en cours...' : 'Relecture comparée'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
