export type HabitCategory = 'health' | 'learning' | 'productivity' | 'mindset' | 'social';
export type HabitPriority = 'low' | 'medium' | 'high';
export type HabitFrequency = 'daily' | 'weekly';

export interface Habit {
  id: string;
  label: string;
  category: HabitCategory;
  priority: HabitPriority;
  frequency: HabitFrequency;
  /** User-chosen emoji; empty means "use the category icon". */
  emoji: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

/** One completion. Id is `${habitId}_${date}` so a day can't be double-counted. */
export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  createdAt: string;
}

export type GoalTerm = 'short' | 'long';
export type GoalStatus = 'not-started' | 'in-progress' | 'complete';

export interface Goal {
  id: string;
  title: string;
  detail: string;
  term: GoalTerm;
  dueDate: string | null;
  milestones: number;
  /** One name per milestone; always `milestones` long. */
  milestoneNames: string[];
  milestonesComplete: number;
  progress: number;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export const MILESTONE_NAME_MAX = 60;

/** Pads/truncates stored names to `count`, filling blanks with "Milestone n". */
export function normalizeMilestoneNames(names: unknown, count: number): string[] {
  const list = Array.isArray(names) ? names : [];
  return Array.from({ length: count }, (_, i) => {
    const raw = typeof list[i] === 'string' ? (list[i] as string).trim().replace(/\s+/g, ' ').slice(0, MILESTONE_NAME_MAX) : '';
    return raw || `Milestone ${i + 1}`;
  });
}

export type GoalProgressType = 'created' | 'milestone' | 'milestone-undone' | 'completed' | 'reopened' | 'edited';

export interface GoalProgress {
  id: string;
  goalId: string;
  type: GoalProgressType;
  progress: number;
  milestonesComplete: number;
  createdAt: string;
}

export type Mood = 'happy' | 'energetic' | 'calm' | 'neutral' | 'low' | 'stressed';

export interface JournalEntry {
  id: string;
  text: string;
  mood: Mood | null;
  tags: string[];
  wordCount: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export type MoodSource = 'check-in' | 'journal';

export interface MoodLog {
  id: string;
  mood: Mood;
  score: number;
  note: string;
  source: MoodSource;
  journalEntryId: string | null;
  date: string;
  createdAt: string;
}

export type ActivityType =
  | 'focus-completed'
  | 'expense-added'
  | 'login'
  | 'registration'
  | 'habit-created'
  | 'habit-updated'
  | 'habit-archived'
  | 'habit-deleted'
  | 'habit-completed'
  | 'goal-created'
  | 'goal-updated'
  | 'goal-deleted'
  | 'goal-completed'
  | 'milestone-completed'
  | 'journal-created'
  | 'journal-updated'
  | 'journal-deleted'
  | 'mood-logged'
  | 'achievement-unlocked'
  | 'profile-updated'
  | 'data-exported';

export interface Activity {
  id: string;
  type: ActivityType;
  message: string;
  entityId: string | null;
  createdAt: string;
}

export interface Achievement {
  id: string;
  unlockedAt: string;
}

export interface RadarScores {
  discipline: number;
  growth: number;
  wellness: number;
  focus: number;
  mindfulness: number;
  finance: number;
}

export interface AnalyticsSnapshot {
  id: string;
  date: string;
  scores: RadarScores;
  overall: number;
  createdAt: string;
}

export type Theme = 'dark' | 'light';

export interface Preferences {
  theme: Theme;
  habitReminder: boolean;
  habitReminderTime: string;
  journalReminder: boolean;
  journalReminderTime: string;
  browserNotifications: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  habitReminder: false,
  habitReminderTime: '19:00',
  journalReminder: false,
  journalReminderTime: '21:00',
  browserNotifications: false,
};

export type Gender = 'male' | 'female' | 'other';

export interface UserProfile {
  uid: string;
  username: string;
  email: string | null;
  photoURL: string | null;
  gender: Gender | null;
  createdAt: string | null;
  schemaVersion: number;
}

export const MOOD_SCORE: Record<Mood, number> = {
  happy: 9,
  energetic: 8,
  calm: 7,
  neutral: 5,
  low: 3,
  stressed: 2,
};

export const MOODS: Mood[] = ['happy', 'energetic', 'calm', 'neutral', 'low', 'stressed'];
export const HABIT_CATEGORIES: HabitCategory[] = ['health', 'learning', 'productivity', 'mindset', 'social'];
export const PRIORITY_WEIGHT: Record<HabitPriority, number> = { high: 3, medium: 2, low: 1 };
export const AURA_POINTS: Record<HabitPriority, number> = { high: 15, medium: 10, low: 5 };
