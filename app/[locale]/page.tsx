'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Mic, Layers, ArrowRight, Flame, Clock, CheckCircle2, BookOpen } from 'lucide-react';
import { Header } from '@/components/navigation/Header';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  getSelectedLanguage,
  setSelectedLanguage,
  getStoredBlocks,
  getStoredPhrases,
  getStoredPracticeLogs,
} from '@/lib/storage';
import { calculateCECRLProgress, CECRL_DISCLAIMER } from '@/lib/cecrl';
import { Language, ThemeBlock, Phrase, PracticeLog } from '@/types';

export default function HomePage() {
  const [currentLang, setCurrentLang] = useState<Language>('EN');
  const [blocks, setBlocks] = useState<ThemeBlock[]>([]);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [logs, setLogs] = useState<PracticeLog[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const lang = getSelectedLanguage();
    setCurrentLang(lang);
    loadData(lang);
  }, []);

  const loadData = (lang: Language) => {
    const loadedBlocks = getStoredBlocks(lang);
    const loadedPhrases = getStoredPhrases(lang);
    const loadedLogs = getStoredPracticeLogs();

    setBlocks(loadedBlocks);
    setPhrases(loadedPhrases);
    setLogs(loadedLogs);
  };

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    setSelectedLanguage(lang);
    loadData(lang);
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calcul des statistiques du jour
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter((l) => l.date === today && l.language === currentLang);
  const minutesToday = todayLogs.reduce((acc, curr) => acc + curr.minutes_practiced, 0);
  const phrasesReviewedToday = todayLogs.reduce((acc, curr) => acc + curr.phrases_reviewed, 0);

  // Phrases prêtes pour révision FSRS (due <= now ou NEW)
  const now = new Date();
  const duePhrases = phrases.filter((p) => {
    if (!p.fsrs_state) return true; // Les nouvelles sont disponibles
    return new Date(p.fsrs_state.due) <= now;
  });

  const masteredPhrases = phrases.filter((p) => p.mastery_status === 'MASTERED');
  const cecrlProgress = calculateCECRLProgress(currentLang, masteredPhrases.length);

  const firstBlock = blocks[0];

  return (
    <div className="flex-1 pb-6">
      <Header
        currentLanguage={currentLang}
        onLanguageChange={handleLanguageChange}
      />

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-5">
        {/* En-tête de bienvenue & langue */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text tracking-tight">
              Bonjour Alexandre
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Langue active :{' '}
              <span className="text-text font-medium">
                {currentLang === 'EN' ? 'Anglais' : 'Chinois Mandarin'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-surface-border text-secondary text-xs font-semibold">
            <Flame className="w-4 h-4 fill-secondary" />
            <span>7 jours</span>
          </div>
        </div>

        {/* Carte Résumé du Jour */}
        <Card variant="elevated" padding="md" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Objectifs du jour
              </span>
              <span className="text-xs text-text-muted">
                {duePhrases.length} à réviser
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="bg-surface-subtle p-2.5 rounded border border-surface-border/50">
                <div className="flex items-center justify-center text-text-muted mb-1">
                  <Clock className="w-3.5 h-3.5 mr-1 text-primary" />
                  <span className="text-[11px]">Temps</span>
                </div>
                <p className="text-base font-bold text-text">{minutesToday} min</p>
              </div>

              <div className="bg-surface-subtle p-2.5 rounded border border-surface-border/50">
                <div className="flex items-center justify-center text-text-muted mb-1">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-secondary" />
                  <span className="text-[11px]">Révisées</span>
                </div>
                <p className="text-base font-bold text-text">{phrasesReviewedToday}</p>
              </div>

              <div className="bg-surface-subtle p-2.5 rounded border border-surface-border/50">
                <div className="flex items-center justify-center text-text-muted mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-success" />
                  <span className="text-[11px]">Maîtrisées</span>
                </div>
                <p className="text-base font-bold text-text">{masteredPhrases.length}</p>
              </div>
            </div>

            {/* Accès rapide aux 2 modes de pratique */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {firstBlock ? (
                <>
                  <Link href={`/practice/recall/${firstBlock.id}`} className="w-full">
                    <Button
                      variant="primary"
                      size="md"
                      fullWidth
                      leftIcon={<Sparkles className="w-4 h-4" />}
                    >
                      Rappel Actif
                    </Button>
                  </Link>
                  <Link href={`/practice/shadowing/${firstBlock.id}`} className="w-full">
                    <Button
                      variant="secondary"
                      size="md"
                      fullWidth
                      leftIcon={<Mic className="w-4 h-4" />}
                    >
                      Shadowing
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href="/blocks" className="w-full col-span-2">
                  <Button variant="outline" size="md" fullWidth>
                    Explorer les Blocs Thématiques
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </Card>

        {/* Aperçu du Niveau CECRL estimé */}
        <Card variant="default" padding="md">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge level={cecrlProgress.currentLevel} size="md" />
                <div>
                  <h4 className="text-sm font-semibold text-text">
                    Niveau {cecrlProgress.currentLevel} estimé
                  </h4>
                  <p className="text-[11px] text-text-muted">
                    {cecrlProgress.description}
                  </p>
                </div>
              </div>
              <Link
                href="/stats"
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
              >
                Détails
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <ProgressBar
              value={cecrlProgress.progressPercent}
              showLabel
              variant="primary"
              size="sm"
            />

            <p className="text-[11px] text-text-muted italic leading-tight">
              * {CECRL_DISCLAIMER}
            </p>
          </div>
        </Card>

        {/* Blocs Thématiques récents / recommandés */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-secondary" />
              Blocs thématiques
            </h3>
            <Link
              href="/blocks"
              className="text-xs text-text-muted hover:text-text flex items-center gap-1"
            >
              Voir tout ({blocks.length})
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {blocks.slice(0, 3).map((block) => {
              const phraseCount = block.phrase_count || 0;
              const masteredCount = block.mastered_count || 0;
              const percent = phraseCount > 0 ? (masteredCount / phraseCount) * 100 : 0;

              return (
                <Link key={block.id} href={`/blocks/${block.id}`} className="block">
                  <Card
                    variant="interactive"
                    padding="sm"
                    className="p-3.5 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge level={block.level} size="sm" />
                          <span className="text-[11px] text-text-muted">
                            {block.category}
                          </span>
                        </div>
                        <h4 className="text-sm font-medium text-text mt-1">
                          {block.title}
                        </h4>
                      </div>
                      <ArrowRight className="w-4 h-4 text-text-muted shrink-0 mt-1" />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-surface-border/50">
                      <span>{phraseCount} phrases</span>
                      <span className="text-primary font-medium">
                        {masteredCount} maîtrisées ({Math.round(percent)}%)
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
