import type { StoryDetail, StoryLevel, StoryMeta, StoryProgress } from '@/types';

const DATA_PATH = '/data/stories';

export const STORY_LEVELS: StoryLevel[] = ['A0', 'A1', 'A2', 'B1', 'B2'];

let indexPromise: Promise<StoryMeta[]> | null = null;
const storyPromises = new Map<string, Promise<StoryDetail>>();

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

export function loadStoriesIndex(): Promise<StoryMeta[]> {
  if (!indexPromise) {
    indexPromise = fetchJson<StoryMeta[]>(`${DATA_PATH}/index.json`).catch((error) => {
      indexPromise = null; // A failed load must stay retryable.
      throw error;
    });
  }
  return indexPromise;
}

export function loadStory(id: string): Promise<StoryDetail> {
  const cached = storyPromises.get(id);
  if (cached) return cached;
  const promise = fetchJson<StoryDetail>(`${DATA_PATH}/${encodeURIComponent(id)}.json`).catch((error) => {
    storyPromises.delete(id);
    throw error;
  });
  storyPromises.set(id, promise);
  return promise;
}

export function isStoryDue(progress: StoryProgress | undefined, now: Date = new Date()): boolean {
  return !!progress?.fsrs_state && new Date(progress.fsrs_state.due) <= now;
}

export function compareByLevelAndTitle(a: StoryMeta, b: StoryMeta): number {
  return (
    STORY_LEVELS.indexOf(a.level) - STORY_LEVELS.indexOf(b.level) || a.title.localeCompare(b.title)
  );
}

/** Stories due for review first, then by level and title. */
export function sortStories(
  stories: StoryMeta[],
  progressById: Record<string, StoryProgress>
): StoryMeta[] {
  const now = new Date();
  const dueRank = (story: StoryMeta) => (isStoryDue(progressById[story.id], now) ? 0 : 1);
  return [...stories].sort((a, b) => dueRank(a) - dueRank(b) || compareByLevelAndTitle(a, b));
}
