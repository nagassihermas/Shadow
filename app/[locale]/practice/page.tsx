'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mic, Sparkles, Layers, ArrowRight, Play } from 'lucide-react';
import { Header } from '@/components/navigation/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getStoredBlocks, getStoredPhrases, getSelectedLanguage, setSelectedLanguage } from '@/lib/storage';
import { ThemeBlock, Phrase, Language } from '@/types';

export default function PracticeHubPage() {
  const [currentLang, setCurrentLang] = useState<Language>('EN');
  const [blocks, setBlocks] = useState<ThemeBlock[]>([]);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const lang = getSelectedLanguage();
    setCurrentLang(lang);
    loadData(lang);
  }, []);

  const loadData = (lang: Language) => {
    setBlocks(getStoredBlocks(lang));
    setPhrases(getStoredPhrases(lang));
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

  const firstBlock = blocks[0];

  return (
    <div className="flex-1 pb-8">
      <Header
        title="Centre de Pratique"
        currentLanguage={currentLang}
        onLanguageChange={handleLanguageChange}
      />

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-6">
        {/* Présentation des 2 modes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mode 1: Rappel Actif */}
          <Card
            variant="elevated"
            padding="md"
            className="flex flex-col justify-between space-y-4 border-l-4 border-l-primary"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text">Rappel Actif (SRS)</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Testez votre mémoire : traduisez mentalement la phrase native, révélez la réponse et évaluez votre maîtrise (1 à 5 étoiles) via l’algorithme FSRS.
              </p>
            </div>

            {firstBlock && (
              <Link href={`/practice/recall/${firstBlock.id}`} className="w-full pt-2">
                <Button variant="primary" size="md" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Démarrer le Rappel
                </Button>
              </Link>
            )}
          </Card>

          {/* Mode 2: Shadowing */}
          <Card
            variant="elevated"
            padding="md"
            className="flex flex-col justify-between space-y-4 border-l-4 border-l-secondary"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center text-secondary">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text">Shadowing Oral</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Répétez simultanément après l’audio natif, enregistrez votre voix et écoutez la relecture comparative pour caler votre rythme et intonation.
              </p>
            </div>

            {firstBlock && (
              <Link href={`/practice/shadowing/${firstBlock.id}`} className="w-full pt-2">
                <Button variant="secondary" size="md" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Démarrer le Shadowing
                </Button>
              </Link>
            )}
          </Card>
        </div>

        {/* Sélection par Bloc Thématique */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <Layers className="w-4 h-4 text-text-muted" />
            Choisir un bloc thématique à pratiquer
          </h3>

          <div className="space-y-2.5">
            {blocks.map((block) => (
              <Card key={block.id} variant="default" padding="sm" className="p-3.5 flex flex-col gap-2.5">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge level={block.level} size="sm" />
                      <span className="text-[11px] text-text-muted">{block.category}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-text">{block.title}</h4>
                  </div>
                  <span className="text-xs text-text-muted">{block.phrase_count} phrases</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-surface-border/50">
                  <Link href={`/practice/recall/${block.id}`}>
                    <Button variant="subtle" size="sm" fullWidth leftIcon={<Sparkles className="w-3.5 h-3.5 text-primary" />}>
                      Rappel
                    </Button>
                  </Link>
                  <Link href={`/practice/shadowing/${block.id}`}>
                    <Button variant="subtle" size="sm" fullWidth leftIcon={<Mic className="w-3.5 h-3.5 text-secondary" />}>
                      Shadowing
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
