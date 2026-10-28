'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mic, Sparkles, Volume2, Calendar, Star } from 'lucide-react';
import { Header } from '@/components/navigation/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { StarRating } from '@/components/ui/StarRating';
import { getBlockById, getPhrasesByBlockId } from '@/lib/storage';
import { formatTimeAgo, formatDate } from '@/lib/utils';
import { ThemeBlock, Phrase } from '@/types';

export default function BlockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const blockId = params.id as string;

  const [block, setBlock] = useState<ThemeBlock | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (blockId) {
      const foundBlock = getBlockById(blockId);
      if (foundBlock) {
        setBlock(foundBlock);
        const blockPhrases = getPhrasesByBlockId(blockId);
        setPhrases(blockPhrases);
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

  if (!block) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <p className="text-sm text-text-muted mb-4">Bloc thématique introuvable.</p>
        <Link href="/blocks">
          <Button variant="outline" size="sm">
            Retour à la liste des blocs
          </Button>
        </Link>
      </div>
    );
  }

  const masteredCount = phrases.filter((p) => p.mastery_status === 'MASTERED').length;
  const learningCount = phrases.filter((p) => p.mastery_status === 'LEARNING').length;
  const newCount = phrases.filter((p) => p.mastery_status === 'NEW').length;
  const masteryPercent = phrases.length > 0 ? (masteredCount / phrases.length) * 100 : 0;

  return (
    <div className="flex-1 pb-8">
      <Header
        title={block.title}
        showBack
        backHref="/blocks"
      />

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-5">
        {/* En-tête du bloc */}
        <Card variant="elevated" padding="md" className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge level={block.level} size="md" />
                <Badge language={block.language} size="md" />
                <span className="text-xs text-text-muted">{block.category}</span>
              </div>
              <h2 className="text-lg font-bold text-text mt-1">{block.title}</h2>
            </div>
          </div>

          {/* Statistiques de maîtrise */}
          <div className="space-y-2 pt-1 border-t border-surface-border/50">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>{phrases.length} phrases au total</span>
              <span className="text-primary font-medium">
                {masteredCount} maîtrisées ({Math.round(masteryPercent)}%)
              </span>
            </div>
            <ProgressBar value={masteryPercent} variant="primary" size="sm" />

            <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
              <span>Nouveau : <strong className="text-text">{newCount}</strong></span>
              <span>En cours : <strong className="text-secondary">{learningCount}</strong></span>
              <span>Maîtrisé : <strong className="text-primary">{masteredCount}</strong></span>
            </div>
          </div>

          {/* Boutons d'action principaux */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <Link href={`/practice/recall/${block.id}`} className="w-full">
              <Button
                variant="primary"
                size="md"
                fullWidth
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Rappel Actif
              </Button>
            </Link>
            <Link href={`/practice/shadowing/${block.id}`} className="w-full">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                leftIcon={<Mic className="w-4 h-4" />}
              >
                Shadowing
              </Button>
            </Link>
          </div>
        </Card>

        {/* Liste des phrases */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">
              Phrases du bloc ({phrases.length})
            </h3>
          </div>

          <div className="space-y-3">
            {phrases.map((phrase, index) => {
              return (
                <Card
                  key={phrase.id}
                  variant="default"
                  padding="md"
                  className="space-y-3 hover:border-surface-border transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      {/* Numéro & Statut */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-mono text-text-muted">
                          #{index + 1}
                        </span>
                        <Badge masteryStatus={phrase.mastery_status} size="sm" />
                      </div>

                      {/* Texte cible */}
                      <p className="text-base font-semibold text-text tracking-tight">
                        {phrase.text_target}
                      </p>

                      {/* Phonétique / Pinyin */}
                      {phrase.phonetic && (
                        <p className="text-xs font-mono text-secondary">
                          {phrase.phonetic}
                        </p>
                      )}

                      {/* Traduction native */}
                      <p className="text-xs text-text-muted pt-0.5">
                        {phrase.text_native}
                      </p>
                    </div>

                    {/* Lecteur audio pour écoute directe */}
                    <div className="shrink-0 pt-1">
                      <AudioPlayer
                        text={phrase.text_target}
                        language={block.language}
                        audioUrl={phrase.audio_url}
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* FSRS & Rating Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-surface-border/40 text-[11px] text-text-muted">
                    <div className="flex items-center gap-1.5">
                      {phrase.star_rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-secondary text-secondary" />
                          <span className="text-text font-medium">
                            {phrase.star_rating}/5
                          </span>
                        </div>
                      ) : (
                        <span>Non évaluée</span>
                      )}
                    </div>

                    <div>
                      {phrase.fsrs_state?.last_review ? (
                        <span>
                          Dernière révision : {formatTimeAgo(phrase.fsrs_state.last_review)}
                        </span>
                      ) : (
                        <span>Jamais révisée</span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
