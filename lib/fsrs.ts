import {
  FSRS,
  Rating,
  RecordLogItem,
  Card,
  createEmptyCard,
  generatorParameters,
} from 'ts-fsrs';
import { FSRSStateData, MasteryStatus, StarRating } from '@/types';

// Seuil de stabilité en jours pour considérer une phrase comme maîtrisée
export const MASTERY_STABILITY_THRESHOLD_DAYS = 21;

// Initialisation de l'instance FSRS avec les paramètres optimisés
const params = generatorParameters({
  enable_fuzz: true,
  maximum_interval: 36500,
  request_retention: 0.9,
});
const fsrsInstance = new FSRS(params);

/**
 * Mappe une note en étoiles (1-5) vers le Rating FSRS (Again, Hard, Good, Easy)
 * 1 étoile : Again (très difficile / échec du rappel)
 * 2 étoiles : Hard (difficile, rappel laborieux)
 * 3 étoiles : Good (rappel réussi avec effort normal)
 * 4 étoiles : Easy (rappel fluide et rapide)
 * 5 étoiles : Easy (parfaite maîtrise)
 */
export function mapStarRatingToFsrsRating(star: StarRating): Rating {
  switch (star) {
    case 1:
      return Rating.Again;
    case 2:
      return Rating.Hard;
    case 3:
      return Rating.Good;
    case 4:
    case 5:
      return Rating.Easy;
    default:
      return Rating.Good;
  }
}

/**
 * Convertit un objet FSRSStateData stocké en base / JSON vers une Card ts-fsrs
 */
export function deserializeCard(fsrsState?: FSRSStateData | null): Card {
  if (!fsrsState) {
    return createEmptyCard(new Date());
  }

  return {
    due: new Date(fsrsState.due),
    stability: fsrsState.stability,
    difficulty: fsrsState.difficulty,
    elapsed_days: fsrsState.elapsed_days,
    scheduled_days: fsrsState.scheduled_days,
    reps: fsrsState.reps,
    lapses: fsrsState.lapses,
    state: fsrsState.state,
    last_review: fsrsState.last_review ? new Date(fsrsState.last_review) : undefined,
  };
}

/**
 * Convertit une Card ts-fsrs vers le format JSON stockable FSRSStateData
 */
export function serializeCard(card: Card, nextReviewAt: Date): FSRSStateData {
  return {
    due: card.due.toISOString(),
    stability: Number(card.stability.toFixed(4)),
    difficulty: Number(card.difficulty.toFixed(4)),
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : new Date().toISOString(),
    next_review_at: nextReviewAt.toISOString(),
  };
}

/**
 * Détermine le statut de maîtrise à partir de l'état FSRS
 */
export function deriveMasteryStatus(fsrsState?: FSRSStateData | null): MasteryStatus {
  if (!fsrsState || fsrsState.reps === 0) {
    return 'NEW';
  }

  if (fsrsState.stability >= MASTERY_STABILITY_THRESHOLD_DAYS && fsrsState.reps >= 2) {
    return 'MASTERED';
  }

  return 'LEARNING';
}

/**
 * Traite une révision d'une phrase avec sa note en étoiles (1-5)
 * Calcule le nouvel état FSRS, la prochaine date de révision et le statut de maîtrise.
 */
export function processFsrsReview(
  currentFsrsState: FSRSStateData | null | undefined,
  starRating: StarRating,
  reviewDate: Date = new Date()
): {
  fsrs_state: FSRSStateData;
  mastery_status: MasteryStatus;
  next_review_at: string;
} {
  const currentCard = deserializeCard(currentFsrsState);
  const rating = mapStarRatingToFsrsRating(starRating);

  // ts-fsrs repeat
  const schedulingCards = fsrsInstance.repeat(currentCard, reviewDate) as Record<number, RecordLogItem>;
  const item: RecordLogItem = schedulingCards[rating];
  const updatedCard = item.card;

  // Ajustement fin de la difficulté si 5 étoiles
  if (starRating === 5) {
    // 5 étoiles donne un léger bonus de stabilité et diminue légèrement la difficulté
    updatedCard.difficulty = Math.max(1, updatedCard.difficulty * 0.92);
    updatedCard.stability = updatedCard.stability * 1.15;
  } else if (starRating === 1) {
    // 1 étoile augmente la difficulté
    updatedCard.difficulty = Math.min(10, updatedCard.difficulty * 1.15);
  }

  const nextReviewAt = updatedCard.due;
  const serialized = serializeCard(updatedCard, nextReviewAt);
  const masteryStatus = deriveMasteryStatus(serialized);

  return {
    fsrs_state: serialized,
    mastery_status: masteryStatus,
    next_review_at: nextReviewAt.toISOString(),
  };
}
