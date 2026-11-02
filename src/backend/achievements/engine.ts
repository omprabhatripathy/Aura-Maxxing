import type { AnalyticsReport, UserDataSet } from '../analytics/radar';
import { isoFromTimestamp } from '../core/dates';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  test: (data: UserDataSet, report: AnalyticsReport) => boolean;
}

/** Gold-tier badges (the hardest milestones); everything else is standard. */
export const LEGENDARY_BADGES = new Set([
  'streak-30',
  'completions-100',
  'goals-5',
  'balanced',
  'aura-farmer',
  'habit-master',
  'goal-crusher',
  'journal-veteran',
  'focus-legend',
  'consistency-king',
  'achievement-hunter',
]);

/** Badges are recognition, not a shortcut: they add only a little XP. */
export const BADGE_XP = { standard: 10, legendary: 25 } as const;

export const AURA_FARMER_XP = 1000;

export const badgeTier = (id: string): keyof typeof BADGE_XP => (LEGENDARY_BADGES.has(id) ? 'legendary' : 'standard');

export const badgeXp = (ids: Iterable<string>): number => {
  let total = 0;
  for (const id of ids) total += BADGE_XP[badgeTier(id)];
  return total;
};

/** Goals completed at least a day after they were created (instant create-and-complete doesn't count). */
const realGoalsDone = (d: UserDataSet) =>
  d.goals.filter((g) => g.status === 'complete' && g.completedAt && isoFromTimestamp(g.completedAt) > isoFromTimestamp(g.createdAt)).length;

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'first-habit', title: 'First Step', description: 'Create your first habit.', test: (d) => d.habits.length > 0 },
  { id: 'first-completion', title: 'Momentum', description: 'Complete a habit for the first time.', test: (d) => d.habitLogs.length > 0 },
  { id: 'streak-7', title: '7-Day Streak', description: 'Stay active 7 days in a row.', test: (_d, r) => r.streaks.activity.longest >= 7 },
  { id: 'streak-30', title: '30-Day Streak', description: 'Stay active 30 days in a row.', test: (_d, r) => r.streaks.activity.longest >= 30 },
  { id: 'completions-100', title: 'Centurion', description: 'Log 100 habit completions.', test: (d) => d.habitLogs.length >= 100 },
  { id: 'first-goal', title: 'Goal Setter', description: 'Create your first goal.', test: (d) => d.goals.length > 0 },
  { id: 'goal-complete', title: 'Goal Getter', description: 'Complete a goal.', test: (d) => realGoalsDone(d) >= 1 },
  { id: 'goals-5', title: 'Achiever', description: 'Complete 5 goals.', test: (d) => realGoalsDone(d) >= 5 },
  { id: 'first-entry', title: 'Dear Diary', description: 'Write your first journal entry.', test: (d) => d.journalEntries.length > 0 },
  { id: 'entries-10', title: 'Reflective Mind', description: 'Write 10 journal entries.', test: (d) => d.journalEntries.length >= 10 },
  { id: 'words-5000', title: 'Storyteller', description: 'Write 5,000 words in your journal.', test: (d) => d.journalEntries.reduce((s, e) => s + e.wordCount, 0) >= 5000 },
  { id: 'mood-7', title: 'Self-Aware', description: 'Log your mood on 7 different days.', test: (d) => new Set(d.moodLogs.map((m) => m.date)).size >= 7 },
  {
    id: 'balanced',
    title: 'Balanced Aura',
    description: 'Score 50+ in every area of your Aura radar.',
    test: (_d, r) => (Object.keys(r.current.scores) as (keyof typeof r.current.scores)[]).every((a) => r.current.coverage[a] && r.current.scores[a] >= 50),
  },
  {
    id: 'aura-farmer',
    title: 'Aura Farmer',
    description: `Earn ${AURA_FARMER_XP.toLocaleString('en-US')} XP from your own activity.`,
    test: (_d, r) => r.behaviourXp >= AURA_FARMER_XP,
  },
  { id: 'habit-master', title: 'Habit Master', description: 'Keep a single habit going for 60 days in a row.', test: (_d, r) => r.streaks.habit.longest >= 60 },
  { id: 'goal-crusher', title: 'Goal Crusher', description: 'Complete 10 goals.', test: (d) => realGoalsDone(d) >= 10 },
  {
    id: 'journal-veteran',
    title: 'Journal Veteran',
    description: 'Write 100 journal entries across at least 60 different days.',
    test: (d) => d.journalEntries.length >= 100 && new Set(d.journalEntries.map((j) => j.date)).size >= 60,
  },
  {
    id: 'focus-legend',
    title: 'Focus Legend',
    description: 'Log 50 hours of completed Pomodoro focus.',
    test: (d) => (d.pomodoro ?? []).filter((s) => s.completed && s.actualMinutes >= 15).reduce((sum, s) => sum + s.actualMinutes, 0) >= 3000,
  },
  { id: 'consistency-king', title: 'Consistency King', description: 'Stay active 90 days in a row.', test: (_d, r) => r.streaks.activity.longest >= 90 },
  {
    id: 'achievement-hunter',
    title: 'Achievement Hunter',
    description: 'Unlock 10 other achievements.',
    test: (d, r) => ACHIEVEMENTS.filter((a) => a.id !== 'achievement-hunter' && a.test(d, r)).length >= 10,
  },
];

/** Achievement ids the user now qualifies for that aren't stored yet. */
export function newlyEarned(data: UserDataSet, report: AnalyticsReport, unlocked: Set<string>): AchievementDefinition[] {
  return ACHIEVEMENTS.filter((a) => !unlocked.has(a.id) && a.test(data, report));
}
