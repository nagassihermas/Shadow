'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, Layers, Mic, Sparkles, ArrowRight, Plus, Wand2, X } from 'lucide-react';
import { Header } from '@/components/navigation/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { getStoredBlocks, getSelectedLanguage, setSelectedLanguage, addCustomBlockWithPhrases } from '@/lib/storage';
import { Language, ThemeBlock, CECRLLevel } from '@/types';

const CECRL_LEVELS: CECRLLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function BlocksPage() {
  const [currentLang, setCurrentLang] = useState<Language>('EN');
  const [blocks, setBlocks] = useState<ThemeBlock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [mounted, setMounted] = useState(false);

  // Modal de génération Gemini
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const [targetLevel, setTargetLevel] = useState<CECRLLevel>('A2');
  const [phraseCount, setPhraseCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const lang = getSelectedLanguage();
    setCurrentLang(lang);
    loadBlocks(lang);
  }, []);

  const loadBlocks = (lang: Language) => {
    const loaded = getStoredBlocks(lang);
    setBlocks(loaded);
  };

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    setSelectedLanguage(lang);
    loadBlocks(lang);
  };

  const handleGenerateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim()) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const response = await fetch('/api/generate-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicInput.trim(),
          language: currentLang,
          level: targetLevel,
          count: phraseCount,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la génération avec Gemini');
      }

      const generated = data.data;

      // Enregistrer dans le stockage local
      addCustomBlockWithPhrases(
        {
          title: generated.title,
          category: generated.category || 'Personnalisé',
          level: generated.level || targetLevel,
          language: currentLang,
          is_custom: true,
        },
        generated.phrases
      );

      // Recharger la liste et fermer la modal
      loadBlocks(currentLang);
      setIsModalOpen(false);
      setTopicInput('');
    } catch (err: any) {
      console.error('Erreur génération Gemini:', err);
      setGenerateError(err.message || 'Impossible de générer le bloc. Vérifiez votre clé API.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Extraire les catégories uniques pour la langue courante
  const categories = Array.from(new Set(blocks.map((b) => b.category)));

  // Filtrage
  const filteredBlocks = blocks.filter((block) => {
    const matchesSearch =
      block.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === 'ALL' || block.level === selectedLevel;
    const matchesCategory = selectedCategory === 'ALL' || block.category === selectedCategory;

    return matchesSearch && matchesLevel && matchesCategory;
  });

  return (
    <div className="flex-1 pb-6">
      <Header
        title="Blocs Thématiques"
        currentLanguage={currentLang}
        onLanguageChange={handleLanguageChange}
      />

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* Barre de recherche & Bouton Génération IA */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un bloc, un sujet..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface text-text text-sm rounded border border-surface-border focus:outline-none focus:border-primary/60 placeholder:text-text-muted/60 transition-colors"
            />
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Wand2 className="w-4 h-4" />}
          >
            Générer IA
          </Button>
        </div>

        {/* Filtres par Niveau CECRL */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Niveau
          </p>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedLevel('ALL')}
              className={`px-3 py-1 text-xs rounded font-medium shrink-0 transition-colors ${
                selectedLevel === 'ALL'
                  ? 'bg-primary text-background font-semibold'
                  : 'bg-surface text-text-muted border border-surface-border hover:text-text'
              }`}
            >
              Tous
            </button>
            {CECRL_LEVELS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                className={`px-3 py-1 text-xs rounded font-medium shrink-0 font-mono transition-colors ${
                  selectedLevel === lvl
                    ? 'bg-primary text-background font-semibold'
                    : 'bg-surface text-text-muted border border-surface-border hover:text-text'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Filtres par Catégorie */}
        {categories.length > 1 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Catégorie
            </p>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1 text-xs rounded font-medium shrink-0 transition-colors ${
                  selectedCategory === 'ALL'
                    ? 'bg-secondary text-background font-semibold'
                    : 'bg-surface text-text-muted border border-surface-border hover:text-text'
                }`}
              >
                Toutes
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs rounded font-medium shrink-0 transition-colors ${
                    selectedCategory === cat
                      ? 'bg-secondary text-background font-semibold'
                      : 'bg-surface text-text-muted border border-surface-border hover:text-text'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Liste des blocs filtrés */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>
              {filteredBlocks.length} bloc{filteredBlocks.length > 1 ? 's' : ''} trouvé
              {filteredBlocks.length > 1 ? 's' : ''}
            </span>
          </div>

          {filteredBlocks.length === 0 ? (
            <Card variant="subtle" className="text-center py-10">
              <p className="text-sm text-text-muted">
                Aucun bloc thématique ne correspond à vos filtres.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLevel('ALL');
                  setSelectedCategory('ALL');
                }}
                className="text-xs text-primary underline mt-2"
              >
                Réinitialiser les filtres
              </button>
            </Card>
          ) : (
            filteredBlocks.map((block) => {
              const phraseCount = block.phrase_count || 0;
              const masteredCount = block.mastered_count || 0;
              const percent = phraseCount > 0 ? (masteredCount / phraseCount) * 100 : 0;

              return (
                <Card key={block.id} variant="default" padding="md" className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge level={block.level} size="sm" />
                        {block.is_custom && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-medium">
                            IA Custom
                          </span>
                        )}
                        <span className="text-xs text-text-muted">
                          {block.category}
                        </span>
                      </div>
                      <Link href={`/blocks/${block.id}`}>
                        <h3 className="text-base font-semibold text-text hover:text-primary transition-colors">
                          {block.title}
                        </h3>
                      </Link>
                    </div>

                    <Link href={`/blocks/${block.id}`}>
                      <div className="p-1.5 rounded text-text-muted hover:text-text hover:bg-surface-hover transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </Link>
                  </div>

                  {/* Progression */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-text-muted">
                      <span>{phraseCount} phrases</span>
                      <span className="text-primary font-medium">
                        {masteredCount} maîtrisées ({Math.round(percent)}%)
                      </span>
                    </div>
                    <ProgressBar value={percent} variant="primary" size="sm" />
                  </div>

                  {/* Boutons d'action directe */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-surface-border/50">
                    <Link href={`/practice/recall/${block.id}`} className="w-full">
                      <Button
                        variant="subtle"
                        size="sm"
                        fullWidth
                        leftIcon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
                      >
                        Rappel actif
                      </Button>
                    </Link>
                    <Link href={`/practice/shadowing/${block.id}`} className="w-full">
                      <Button
                        variant="subtle"
                        size="sm"
                        fullWidth
                        leftIcon={<Mic className="w-3.5 h-3.5 text-secondary" />}
                      >
                        Shadowing
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de Génération avec Gemini */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-border rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                  <Wand2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-text">
                  Générer un Bloc avec Gemini
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateBlock} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                  Sujet ou Thématique
                </label>
                <input
                  type="text"
                  required
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="Ex: Réunion de crise, Commande de café, Entretien d'embauche..."
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded text-sm text-text focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                    Niveau CECRL
                  </label>
                  <select
                    value={targetLevel}
                    onChange={(e) => setTargetLevel(e.target.value as CECRLLevel)}
                    className="w-full px-3 py-2 bg-surface-subtle border border-surface-border rounded text-sm text-text focus:outline-none focus:border-primary"
                  >
                    {CECRL_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        Niveau {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                    Langue
                  </label>
                  <div className="px-3 py-2 bg-surface-subtle border border-surface-border rounded text-sm text-text">
                    {currentLang === 'EN' ? 'Anglais (EN)' : 'Chinois (ZH)'}
                  </div>
                </div>
              </div>

              {generateError && (
                <div className="text-xs text-danger bg-danger-subtle p-2.5 rounded border border-danger/30">
                  {generateError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isGenerating}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                >
                  Générer maintenant
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
