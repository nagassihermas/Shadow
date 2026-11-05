'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Search } from 'lucide-react';
import { Header } from '@/components/navigation/Header';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useDictionary } from '@/lib/i18n/DictionaryProvider';
import { getAllStoryProgress, getSelectedLanguage, setSelectedLanguage } from '@/lib/storage';
import { STORY_LEVELS, isStoryDue, loadStoriesIndex, sortStories } from '@/lib/stories';
import { cn } from '@/lib/utils';
import type { Language, StoryCategory, StoryMeta, StoryProgress } from '@/types';

const CATEGORIES: StoryCategory[] = ['quotidien', 'voyage', 'travail', 'sante'];

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-xs rounded font-medium shrink-0 transition-colors duration-150',
        active
          ? 'bg-primary text-background font-semibold'
          : 'bg-surface text-text-muted border border-surface-border hover:text-text'
      )}
    >
      {children}
    </button>
  );
}

export default function StoriesPage() {
  const { dict, locale } = useDictionary();
  const t = dict.stories;

  const [currentLang, setCurrentLang] = useState<Language>('EN');
  const [stories, setStories] = useState<StoryMeta[] | null>(null);
  const [progress, setProgress] = useState<Record<string, StoryProgress>>({});
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<string>('ALL');
  const [category, setCategory] = useState<string>('ALL');

  const load = () => {
    setFailed(false);
    loadStoriesIndex().then(setStories).catch(() => setFailed(true));
  };

  useEffect(() => {
    setCurrentLang(getSelectedLanguage());
    setProgress(getAllStoryProgress());
    load();
  }, []);

  const handleLanguageChange = (language: Language) => {
    setCurrentLang(language);
    setSelectedLanguage(language);
  };

  const visible = useMemo(() => {
    if (!stories) return [];
    const search = query.trim().toLowerCase();
    const filtered = stories.filter(
      (story) =>
        story.language === currentLang &&
        (level === 'ALL' || story.level === level) &&
        (category === 'ALL' || story.category === category) &&
        (!search ||
          story.title.toLowerCase().includes(search) ||
          t.categories[story.category].toLowerCase().includes(search))
    );
    return sortStories(filtered, progress);
  }, [stories, currentLang, level, category, query, progress, t]);

  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }),
    [locale]
  );

  const resetFilters = () => {
    setQuery('');
    setLevel('ALL');
    setCategory('ALL');
  };

  return (
    <div className="flex-1 pb-6">
      <Header title={t.title} currentLanguage={currentLang} onLanguageChange={handleLanguageChange} />

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            className="w-full min-h-11 pl-10 pr-4 py-2.5 bg-surface text-text text-sm rounded border border-surface-border placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{t.levelLabel}</p>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <FilterChip active={level === 'ALL'} onClick={() => setLevel('ALL')}>
              {t.allLevels}
            </FilterChip>
            {STORY_LEVELS.map((item) => (
              <FilterChip key={item} active={level === item} onClick={() => setLevel(item)}>
                {item}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{t.categoryLabel}</p>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <FilterChip active={category === 'ALL'} onClick={() => setCategory('ALL')}>
              {t.allCategories}
            </FilterChip>
            {CATEGORIES.map((item) => (
              <FilterChip key={item} active={category === item} onClick={() => setCategory(item)}>
                {t.categories[item]}
              </FilterChip>
            ))}
          </div>
        </div>

        {failed ? (
          <Card variant="subtle" className="text-center py-10 space-y-3">
            <p role="alert" className="text-sm text-text-muted">
              {t.loadError}
            </p>
            <Button type="button" variant="subtle" size="sm" onClick={load}>
              {t.retry}
            </Button>
          </Card>
        ) : !stories ? (
          <div className="flex justify-center py-10" role="status" aria-label={dict.auth.loading}>
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <Card variant="subtle" className="text-center py-10">
            <p className="text-sm text-text-muted">{t.empty}</p>
            <button type="button" onClick={resetFilters} className="text-xs text-primary underline mt-2 py-1">
              {t.resetFilters}
            </button>
          </Card>
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs text-text-muted">{t.found.replace('{count}', String(visible.length))}</p>
            {visible.map((story) => {
              const storyProgress = progress[story.id];
              const due = isStoryDue(storyProgress);
              const status = storyProgress?.mastery_status ?? 'NEW';
              return (
                <Link key={story.id} href={`/stories/${story.id}`} className="block">
                  <Card variant="interactive" padding="sm" className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge level={story.level} size="sm">
                            {story.level}
                          </Badge>
                          <span className="text-[11px] text-text-muted">{t.categories[story.category]}</span>
                          {due && (
                            <Badge variant="secondary" size="sm" className="gap-1">
                              <Clock className="w-3 h-3" aria-hidden="true" />
                              {t.due}
                            </Badge>
                          )}
                        </div>
                        <h2 className="text-sm font-medium text-text">{story.title}</h2>
                      </div>
                      <ArrowRight className="w-4 h-4 text-text-muted shrink-0 mt-1" aria-hidden="true" />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted pt-1 border-t border-surface-border/50">
                      <span>{t.sentences.replace('{count}', String(story.sentence_count))}</span>
                      <span className="flex items-center gap-2">
                        {storyProgress?.fsrs_state && !due && (
                          <span>
                            {t.nextReview.replace(
                              '{date}',
                              dateFormat.format(new Date(storyProgress.fsrs_state.due))
                            )}
                          </span>
                        )}
                        <Badge masteryStatus={status} size="sm">
                          {t.mastery[status]}
                        </Badge>
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
