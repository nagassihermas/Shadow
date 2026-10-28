'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Clock, Sparkles, CheckCircle2, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { Header } from '@/components/navigation/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  getStoredPracticeLogs,
  getStoredPhrases,
  getSelectedLanguage,
  setSelectedLanguage,
  resetDataToMock,
} from '@/lib/storage';
import { calculateCECRLProgress, CECRL_DISCLAIMER, DEFAULT_CECRL_THRESHOLDS } from '@/lib/cecrl';
import { Language, PracticeLog, Phrase } from '@/types';

export default function StatsPage() {
  const [currentLang, setCurrentLang] = useState<Language>('EN');
  const [logs, setLogs] = useState<PracticeLog[]>([]);
  const [phrasesEn, setPhrasesEn] = useState<Phrase[]>([]);
  const [phrasesZh, setPhrasesZh] = useState<Phrase[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const lang = getSelectedLanguage();
    setCurrentLang(lang);
    loadStats();
  }, []);

  const loadStats = () => {
    const loadedLogs = getStoredPracticeLogs();
    const en = getStoredPhrases('EN');
    const zh = getStoredPhrases('ZH');

    setLogs(loadedLogs);
    setPhrasesEn(en);
    setPhrasesZh(zh);
  };

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    setSelectedLanguage(lang);
  };

  const handleResetData = () => {
    if (confirm('Voulez-vous réinitialiser les données de démonstration ?')) {
      resetDataToMock();
      loadStats();
    }
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Métriques du jour
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter((l) => l.date === todayStr);
  const minutesToday = todayLogs.reduce((acc, l) => acc + l.minutes_practiced, 0);
  const phrasesReviewedToday = todayLogs.reduce((acc, l) => acc + l.phrases_reviewed, 0);
  const newPhrasesToday = todayLogs.reduce((acc, l) => acc + l.new_phrases_learned, 0);

  // CECRL Calculations
  const masteredEn = phrasesEn.filter((p) => p.mastery_status === 'MASTERED').length;
  const masteredZh = phrasesZh.filter((p) => p.mastery_status === 'MASTERED').length;

  const cecrlEn = calculateCECRLProgress('EN', masteredEn);
  const cecrlZh = calculateCECRLProgress('ZH', masteredZh);

  // Données des 7 derniers jours pour le graphique hebdomadaire
  const last7Days: { date: string; label: string; minutes: number; phrases: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d);

    const dayLogs = logs.filter((l) => l.date === dateStr);
    const dayMinutes = dayLogs.reduce((acc, l) => acc + l.minutes_practiced, 0);
    const dayPhrases = dayLogs.reduce((acc, l) => acc + l.phrases_reviewed, 0);

    last7Days.push({
      date: dateStr,
      label: dayName.slice(0, 3),
      minutes: dayMinutes,
      phrases: dayPhrases,
    });
  }

  const maxMinutes = Math.max(...last7Days.map((d) => d.minutes), 30);

  return (
    <div className="flex-1 pb-10">
      <Header
        title="Statistiques & Progression"
        currentLanguage={currentLang}
        onLanguageChange={handleLanguageChange}
      />

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-6">
        {/* Dashboard du Jour */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-text uppercase tracking-wider">
            Activité d’Aujourd’hui
          </h2>

          <div className="grid grid-cols-3 gap-2.5">
            <Card variant="elevated" padding="sm" className="text-center p-3">
              <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xs text-text-muted">Pratique</p>
              <p className="text-lg font-bold text-text mt-0.5">{minutesToday} min</p>
            </Card>

            <Card variant="elevated" padding="sm" className="text-center p-3">
              <Sparkles className="w-4 h-4 text-secondary mx-auto mb-1" />
              <p className="text-xs text-text-muted">Révisées</p>
              <p className="text-lg font-bold text-text mt-0.5">{phrasesReviewedToday}</p>
            </Card>

            <Card variant="elevated" padding="sm" className="text-center p-3">
              <CheckCircle2 className="w-4 h-4 text-success mx-auto mb-1" />
              <p className="text-xs text-text-muted">Nouvelles</p>
              <p className="text-lg font-bold text-text mt-0.5">{newPhrasesToday}</p>
            </Card>
          </div>
        </div>

        {/* Graphique hebdomadaire des 7 derniers jours */}
        <Card variant="default" padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Temps de pratique (7 derniers jours)
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Total : {last7Days.reduce((acc, d) => acc + d.minutes, 0)} minutes d’écoute & répétition
              </p>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-end justify-between h-36 gap-2 pt-4 px-1 border-b border-surface-border">
              {last7Days.map((day) => {
                const heightPercent = maxMinutes > 0 ? (day.minutes / maxMinutes) * 100 : 0;
                const isToday = day.date === todayStr;

                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-7 hidden group-hover:flex bg-surface-elevated text-text text-[10px] px-2 py-0.5 rounded border border-surface-border whitespace-nowrap z-10">
                      {day.minutes} min ({day.phrases} rev.)
                    </div>

                    <span className="text-[10px] font-mono text-text-muted">
                      {day.minutes > 0 ? `${day.minutes}m` : ''}
                    </span>

                    <div
                      className={`w-full max-w-[28px] rounded-t transition-all duration-300 ${
                        isToday
                          ? 'bg-primary'
                          : day.minutes > 0
                          ? 'bg-secondary/70 group-hover:bg-secondary'
                          : 'bg-surface-subtle'
                      }`}
                      style={{ height: `${Math.max(6, heightPercent)}%` }}
                    />

                    <span
                      className={`text-[11px] font-medium ${
                        isToday ? 'text-primary font-bold' : 'text-text-muted'
                      }`}
                    >
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Estimation des Niveaux CECRL par langue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-secondary" />
              Niveau CECRL Estimé
            </h3>
          </div>

          {/* Anglais */}
          <Card variant="default" padding="md" className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge language="EN" size="sm" />
                  <Badge level={cecrlEn.currentLevel} size="md" />
                </div>
                <h4 className="text-base font-semibold text-text mt-1">
                  Anglais : Niveau {cecrlEn.currentLevel}
                </h4>
                <p className="text-xs text-text-muted">{cecrlEn.description}</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-primary font-semibold">
                  {masteredEn} phrases
                </span>
                <p className="text-[11px] text-text-muted">maîtrisées</p>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs text-text-muted">
                <span>
                  {cecrlEn.nextLevel
                    ? `Objectif ${cecrlEn.nextLevel} (${cecrlEn.phrasesToNextLevel} restantes)`
                    : 'Palier maximal atteint'}
                </span>
                <span className="font-mono">{cecrlEn.progressPercent}%</span>
              </div>
              <ProgressBar value={cecrlEn.progressPercent} variant="primary" size="sm" />
            </div>
          </Card>

          {/* Chinois Mandarin */}
          <Card variant="default" padding="md" className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge language="ZH" size="sm" />
                  <Badge level={cecrlZh.currentLevel} size="md" />
                </div>
                <h4 className="text-base font-semibold text-text mt-1">
                  Chinois Mandarin : Niveau {cecrlZh.currentLevel}
                </h4>
                <p className="text-xs text-text-muted">{cecrlZh.description}</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-secondary font-semibold">
                  {masteredZh} phrases
                </span>
                <p className="text-[11px] text-text-muted">maîtrisées</p>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs text-text-muted">
                <span>
                  {cecrlZh.nextLevel
                    ? `Objectif ${cecrlZh.nextLevel} (${cecrlZh.phrasesToNextLevel} restantes)`
                    : 'Palier maximal atteint'}
                </span>
                <span className="font-mono">{cecrlZh.progressPercent}%</span>
              </div>
              <ProgressBar value={cecrlZh.progressPercent} variant="secondary" size="sm" />
            </div>
          </Card>

          {/* Avertissement / Disclaimer CECRL */}
          <div className="p-3.5 bg-surface-subtle border border-surface-border/80 rounded-md flex items-start gap-2.5 text-text-muted">
            <AlertCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed italic">
              <strong>Note d’estimation :</strong> {CECRL_DISCLAIMER}
            </p>
          </div>
        </div>

        {/* Réinitialisation de démo */}
        <div className="pt-4 text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetData}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Réinitialiser les données de démo
          </Button>
        </div>
      </div>
    </div>
  );
}
