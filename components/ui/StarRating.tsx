'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { StarRating as StarRatingType } from '@/types';
import { cn } from '@/lib/utils';

export interface StarRatingProps {
  value?: StarRatingType | null;
  onChange?: (rating: StarRatingType) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

const RATING_LABELS: Record<StarRatingType, { title: string; hint: string }> = {
  1: { title: '1 - Échec', hint: 'Oubli complet / Révision immédiate' },
  2: { title: '2 - Difficile', hint: 'Rappel très laborieux' },
  3: { title: '3 - Correct', hint: 'Rappel avec effort normal' },
  4: { title: '4 - Bien', hint: 'Rappel fluide et rapide' },
  5: { title: '5 - Parfait', hint: 'Maîtrise instantanée et aisée' },
};

export function StarRating({
  value = null,
  onChange,
  readOnly = false,
  size = 'md',
  showLabels = false,
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<StarRatingType | null>(null);

  const starSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const activeValue = hoverValue !== null ? hoverValue : value || 0;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {([1, 2, 3, 4, 5] as StarRatingType[]).map((rating) => {
          const isFilled = rating <= activeValue;
          const isSelected = rating === value;

          return (
            <button
              key={rating}
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onChange?.(rating)}
              onMouseEnter={() => !readOnly && setHoverValue(rating)}
              onMouseLeave={() => !readOnly && setHoverValue(null)}
              className={cn(
                'group p-1.5 rounded-md transition-all duration-150 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                readOnly
                  ? 'cursor-default'
                  : 'cursor-pointer hover:bg-surface-hover hover:scale-110 active:scale-95',
                isSelected && !readOnly && 'bg-surface-subtle ring-1 ring-secondary/30'
              )}
              aria-label={`Noter ${rating} sur 5`}
            >
              <Star
                className={cn(
                  starSizes[size],
                  'transition-colors duration-150',
                  isFilled
                    ? rating <= 2
                      ? 'fill-danger text-danger'
                      : rating === 3
                      ? 'fill-secondary text-secondary'
                      : 'fill-primary text-primary'
                    : 'text-surface-border fill-transparent group-hover:text-text-muted'
                )}
              />
            </button>
          );
        })}
      </div>

      {showLabels && (
        <div className="text-center min-h-[38px] flex flex-col justify-center">
          {activeValue > 0 ? (
            <>
              <p className="text-xs font-medium text-text">
                {RATING_LABELS[activeValue as StarRatingType]?.title}
              </p>
              <p className="text-[11px] text-text-muted">
                {RATING_LABELS[activeValue as StarRatingType]?.hint}
              </p>
            </>
          ) : (
            <p className="text-[11px] text-text-muted">
              Sélectionnez votre niveau de maîtrise
            </p>
          )}
        </div>
      )}
    </div>
  );
}
