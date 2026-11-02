import type { RadarScores } from '../../backend/models';

export const AREA_COLORS: Record<keyof RadarScores, string> = {
  discipline: '#a78bfa',
  growth: '#22d3ee',
  wellness: '#4ade80',
  focus: '#fbbf24',
  mindfulness: '#f472b6',
  finance: '#2dd4bf',
};

/** Where each radar area's data comes from (shown in "How this score is calculated"). */
export const AREA_SOURCES: Record<keyof RadarScores, string[]> = {
  discipline: ['All active habits', 'Every logged action (activity streak)', 'Active days per week'],
  growth: ['Goals and goal progress', 'Learning and productivity habits', 'Journal entries'],
  wellness: ['Health and social habits', 'Mood check-ins'],
  focus: ['Pomodoro sessions (completed, 15+ min)'],
  mindfulness: ['Journal entries (frequency, length, gratitude)', 'Mood check-ins', 'Mindset habits'],
  finance: ['Expenses and income', 'Monthly budget and category limits', 'Saving goals'],
};

export interface ScoreBand {
  label: string;
  color: string;
}

export function scoreBand(score: number): ScoreBand {
  if (score >= 75) return { label: 'Elite', color: '#a78bfa' };
  if (score >= 50) return { label: 'Strong', color: '#34d399' };
  if (score >= 25) return { label: 'Building', color: '#fbbf24' };
  return { label: 'Low', color: '#f87171' };
}
