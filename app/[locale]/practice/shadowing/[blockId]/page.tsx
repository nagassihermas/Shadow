'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Volume2, ChevronLeft, ChevronRight, Eye, EyeOff, RotateCcw, CheckCircle } from 'lucide-react';
import { Header } from '@/components/navigation/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { AudioRecorderComponent } from '@/components/ui/AudioRecorder';
import { getBlockById, getPhrasesByBlockId, recordDailyActivity } from '@/lib/storage';
import { ThemeBlock, Phrase } from '@/types';

export default function ShadowingPracticePage() {
  const params = useParams();
  const router = useRouter();
  const blockId = params.blockId as string;

  const [block, setBlock] = useState<ThemeBlock | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNativeTranslation, setShowNativeTranslation] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (blockId) {
      const b = getBlockById(blockId);
      if (b) {
        setBlock(b);
        const list = getPhrasesByBlockId(blockId);
        setPhrases(list);
      }
    }
  }, [blockId]);

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!block || phrases.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <p className="text-sm text-text-muted mb-4">Aucune phrase disponible pour ce bloc.</p>
        <Link href="/blocks">
          <Button variant="outline" size="sm">
            Retour aux blocs
          </Button>
        </Link>
      </div>
    );
  }

  const currentPhrase = phrases[currentIndex];
  const progressPercent = ((currentIndex + 1) / phrases.length) * 100;

  const handleNext = () => {
    setShowNativeTranslation(false);
    if (currentIndex < phrases.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Session terminée
      recordDailyActivity(block.language, 2, 1, 0);
      setIsCompleted(true);
    }
  };

  const handlePrev = () => {
    setShowNativeTranslation(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsCompleted(false);
    setShowNativeTranslation(false);
  };

  if (isCompleted) {
    return (
      <div className="flex-1 pb-8">
        <Header
          title="Shadowing Terminé"
          showBack
          backHref={`/blocks/${block.id}`}
        />

        <div className="max-w-md mx-auto px-4 pt-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto text-primary animate-bounce">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-text">Session de Shadowing Terminée !</h2>
            <p className="text-sm text-text-muted">
              Vous avez pratiqué les {phrases.length} phrases du bloc{' '}
              <strong className="text-text font-semibold">{block.title}</strong>.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleRestart}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Recommencer la session
            </Button>
            <Link href={`/practice/recall/${block.id}`} className="w-full">
              <Button variant="secondary" size="md" fullWidth>
                Passer au Rappel Actif (SRS)
              </Button>
            </Link>
            <Link href={`/blocks/${block.id}`} className="w-full">
              <Button variant="outline" size="md" fullWidth>
                Retour au bloc thématique
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-8 flex flex-col justify-between min-h-[calc(100vh-4rem)]">
      <div>
        <Header
          title={`Shadowing — ${block.title}`}
          showBack
          backHref={`/blocks/${block.id}`}
        />

        <div className="max-w-xl mx-auto px-4 pt-4 space-y-5">
          {/* Barre de progression & Compteur */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>
                Phrase <strong className="text-text">{currentIndex + 1}</strong> sur {phrases.length}
              </span>
              <Badge level={block.level} size="sm" />
            </div>
            <ProgressBar value={progressPercent} variant="secondary" size="sm" />
          </div>

          {/* Carte Principale de Shadowing */}
          <Card variant="elevated" padding="lg" className="space-y-6 text-center">
            {/* Texte cible + Phonétique */}
            <div className="space-y-3 py-2">
              <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                Texte Cible
              </span>

              <h2 className="text-2xl sm:text-3xl font-bold text-text tracking-tight leading-snug">
                {currentPhrase.text_target}
              </h2>

              {currentPhrase.phonetic && (
                <p className="text-sm sm:text-base font-mono text-secondary/90 tracking-wide">
                  {currentPhrase.phonetic}
                </p>
              )}
            </div>

            {/* Lecteur Audio Natif */}
            <div className="flex flex-col items-center justify-center gap-2 pt-2 border-t border-surface-border/50">
              <span className="text-xs text-text-muted">Écoute native</span>
              <AudioPlayer
                text={currentPhrase.text_target}
                language={block.language}
                audioUrl={currentPhrase.audio_url}
                size="lg"
                showSpeedControl
              />
            </div>

            {/* Enregistrement Utilisateur & Relecture Comparée */}
            <div className="pt-2 border-t border-surface-border/50">
              <AudioRecorderComponent
                key={currentPhrase.id}
                nativeText={currentPhrase.text_target}
                targetLanguage={block.language}
              />
            </div>

            {/* Traduction native masquée / affichage à la demande */}
            <div className="pt-2 border-t border-surface-border/50">
              {showNativeTranslation ? (
                <div className="p-3 bg-surface-subtle rounded border border-surface-border/60 space-y-1 animate-fade-in">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">
                    Traduction
                  </span>
                  <p className="text-sm text-text font-medium">
                    {currentPhrase.text_native}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowNativeTranslation(false)}
                    className="text-[11px] text-text-muted hover:text-text underline pt-1 inline-flex items-center gap-1"
                  >
                    <EyeOff className="w-3 h-3" />
                    Masquer la traduction
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNativeTranslation(true)}
                  className="text-xs text-text-muted hover:text-text inline-flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Afficher la traduction native
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Barre de navigation bas d'écran (Suivant / Précédent) */}
      <div className="sticky bottom-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-surface-border/60 py-3 px-4">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Précédent
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleNext}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            {currentIndex === phrases.length - 1 ? 'Terminer la session' : 'Phrase suivante'}
          </Button>
        </div>
      </div>
    </div>
  );
}
