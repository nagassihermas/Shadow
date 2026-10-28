'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, CheckCircle, RotateCcw, HelpCircle, ArrowRight, Star } from 'lucide-react';
import { Header } from '@/components/navigation/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { StarRating } from '@/components/ui/StarRating';
import { getBlockById, getPhrasesByBlockId, recordPhraseReview } from '@/lib/storage';
import { formatTimeAgo, formatDate } from '@/lib/utils';
import { ThemeBlock, Phrase, StarRating as StarRatingType } from '@/types';

export default function ActiveRecallPracticePage() {
  const params = useParams();
  const router = useRouter();
  const blockId = params.blockId as string;

  const [block, setBlock] = useState<ThemeBlock | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [selectedRating, setSelectedRating] = useState<StarRatingType | null>(null);
  const [reviewResult, setReviewResult] = useState<{
    previousMastery: string;
    newMastery: string;
    nextReviewAt?: string;
  } | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0);
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

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleRatingSelect = (rating: StarRatingType) => {
    setSelectedRating(rating);

    // Traitement FSRS et mise à jour immédiate
    const result = recordPhraseReview(currentPhrase.id, rating);
    
    // Mettre à jour la phrase locale
    const updatedPhrases = [...phrases];
    updatedPhrases[currentIndex] = result.phrase;
    setPhrases(updatedPhrases);

    setReviewResult({
      previousMastery: result.previousMastery,
      newMastery: result.newMastery,
      nextReviewAt: result.phrase.fsrs_state?.next_review_at,
    });
    setSessionReviewedCount((prev) => prev + 1);
  };

  const handleNextPhrase = () => {
    setIsRevealed(false);
    setSelectedRating(null);
    setReviewResult(null);

    if (currentIndex < phrases.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsRevealed(false);
    setSelectedRating(null);
    setReviewResult(null);
    setIsCompleted(false);
    setSessionReviewedCount(0);
  };

  if (isCompleted) {
    return (
      <div className="flex-1 pb-8">
        <Header
          title="Session Terminée"
          showBack
          backHref={`/blocks/${block.id}`}
        />

        <div className="max-w-md mx-auto px-4 pt-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto text-primary animate-bounce">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-text">Session de Rappel Terminée !</h2>
            <p className="text-sm text-text-muted">
              Vous avez évalué et mis à jour l’algorithme FSRS pour les {phrases.length} phrases du bloc{' '}
              <strong className="text-text font-semibold">{block.title}</strong>.
            </p>
          </div>

          <div className="bg-surface p-4 rounded-md border border-surface-border text-xs text-text-muted space-y-1.5">
            <p>
              Les intervalles de répétition espacée ont été recalculés selon vos notes de difficulté.
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
            <Link href={`/practice/shadowing/${block.id}`} className="w-full">
              <Button variant="secondary" size="md" fullWidth>
                Pratiquer en mode Shadowing
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
          title={`Rappel Actif — ${block.title}`}
          showBack
          backHref={`/blocks/${block.id}`}
        />

        <div className="max-w-xl mx-auto px-4 pt-4 space-y-5">
          {/* Progression */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>
                Phrase <strong className="text-text">{currentIndex + 1}</strong> sur {phrases.length}
              </span>
              <Badge masteryStatus={currentPhrase.mastery_status} size="sm" />
            </div>
            <ProgressBar value={progressPercent} variant="primary" size="sm" />
          </div>

          {/* Carte Principale de Rappel */}
          <Card variant="elevated" padding="lg" className="space-y-6 text-center">
            {/* 1. Traduction Native (Toujours visible au départ) */}
            <div className="space-y-2 py-2">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Traduisez mentalement
              </span>

              <h2 className="text-2xl sm:text-3xl font-bold text-text tracking-tight leading-relaxed">
                « {currentPhrase.text_native} »
              </h2>
            </div>

            {/* 2. Bouton Révéler ou Contenu Cible Révélé */}
            {!isRevealed ? (
              <div className="pt-4 border-t border-surface-border/50">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleReveal}
                  leftIcon={<Sparkles className="w-5 h-5" />}
                >
                  Révéler la réponse
                </Button>
              </div>
            ) : (
              <div className="space-y-5 pt-4 border-t border-surface-border/50 animate-fade-in">
                {/* Texte cible révélé */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                    Réponse en {block.language === 'EN' ? 'Anglais' : 'Chinois'}
                  </span>

                  <p className="text-2xl sm:text-3xl font-bold text-text">
                    {currentPhrase.text_target}
                  </p>

                  {currentPhrase.phonetic && (
                    <p className="text-sm sm:text-base font-mono text-secondary">
                      {currentPhrase.phonetic}
                    </p>
                  )}
                </div>

                {/* Lecteur Audio TTS */}
                <div className="flex justify-center pt-1">
                  <AudioPlayer
                    text={currentPhrase.text_target}
                    language={block.language}
                    audioUrl={currentPhrase.audio_url}
                    size="md"
                    showSpeedControl
                  />
                </div>

                {/* Section Notation par Étoiles FSRS (1-5) */}
                <div className="pt-4 border-t border-surface-border/50 space-y-3">
                  <span className="text-xs font-semibold text-text">
                    Comment évaluez-vous votre rappel ?
                  </span>

                  <StarRating
                    value={selectedRating}
                    onChange={handleRatingSelect}
                    showLabels
                    size="lg"
                  />

                  {/* Feedback FSRS après notation */}
                  {reviewResult && (
                    <div className="p-3 bg-surface-subtle rounded border border-surface-border text-xs text-text-muted space-y-1 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span>Statut :</span>
                        <Badge masteryStatus={reviewResult.newMastery as any} size="sm" />
                      </div>
                      {reviewResult.nextReviewAt && (
                        <p className="text-[11px] text-primary">
                          Prochaine révision FSRS : {formatDate(reviewResult.nextReviewAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Barre de confirmation Suivant en bas d'écran */}
      {isRevealed && (
        <div className="sticky bottom-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-surface-border/60 py-3 px-4 animate-fade-in">
          <div className="max-w-xl mx-auto flex items-center justify-end">
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={selectedRating === null}
              onClick={handleNextPhrase}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {currentIndex === phrases.length - 1 ? 'Terminer la session' : 'Phrase suivante'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
