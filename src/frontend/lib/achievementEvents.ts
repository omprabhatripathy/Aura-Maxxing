import type { AchievementDefinition } from '../../backend/achievements/engine';

type Listener = (earned: AchievementDefinition[]) => void;

const listeners = new Set<Listener>();

/** Fired by the data reaction engine right after new achievements are saved. */
export function emitAchievementsUnlocked(earned: AchievementDefinition[]): void {
  listeners.forEach((l) => l(earned));
}

export function onAchievementsUnlocked(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
