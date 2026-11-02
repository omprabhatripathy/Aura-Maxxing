import { createContext, useContext } from 'react';

export type ScoreKind = 'aura-points' | 'aura-score' | 'streak' | 'wellbeing';

export interface ScoreHistoryRequest {
  kind: ScoreKind;
  /** Narrow Aura Points history to a single habit. */
  habitId?: string;
}

export const ScoreHistoryContext = createContext<((req: ScoreHistoryRequest) => void) | null>(null);

/** Opens the "where did these points come from" panel for a scoreboard. No-op outside the app shell. */
export function useScoreHistory(): (req: ScoreHistoryRequest) => void {
  return useContext(ScoreHistoryContext) ?? (() => undefined);
}
