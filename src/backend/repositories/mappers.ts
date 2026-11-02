import { isValidIso, toIso } from '../core/dates';
import type { DocData, StoredDoc } from '../db';
import {
  DEFAULT_PREFERENCES,
  HABIT_CATEGORIES,
  MOODS,
  MOOD_SCORE,
  normalizeMilestoneNames,
  type Activity,
  type ActivityType,
  type Achievement,
  type AnalyticsSnapshot,
  type Gender,
  type Goal,
  type GoalProgress,
  type GoalProgressType,
  type Habit,
  type HabitCategory,
  type HabitFrequency,
  type HabitLog,
  type HabitPriority,
  type JournalEntry,
  type Mood,
  type MoodLog,
  type Preferences,
  type RadarScores,
  type UserProfile,
} from '../models';

// Mappers turn untrusted stored documents into typed models with safe defaults.

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);
const iso = (v: unknown): string => (typeof v === 'string' && v ? v : new Date(0).toISOString());
const dateOf = (v: unknown, createdAt: string): string => (typeof v === 'string' && isValidIso(v) ? v : toIso(new Date(createdAt)));

export function toHabit({ id, data }: StoredDoc): Habit {
  const createdAt = iso(data.createdAt);
  return {
    id,
    label: str(data.label, 'Untitled habit'),
    category: oneOf<HabitCategory>(data.category, HABIT_CATEGORIES, 'productivity'),
    priority: oneOf<HabitPriority>(data.priority, ['low', 'medium', 'high'], 'medium'),
    frequency: oneOf<HabitFrequency>(data.frequency, ['daily', 'weekly'], 'daily'),
    emoji: str(data.emoji).slice(0, 16),
    archived: bool(data.archived),
    createdAt,
    updatedAt: iso(data.updatedAt ?? createdAt),
  };
}

export function toHabitLog({ id, data }: StoredDoc): HabitLog | null {
  const date = str(data.date);
  const habitId = str(data.habitId);
  if (!habitId || !isValidIso(date)) return null;
  return { id, habitId, date, createdAt: iso(data.createdAt) };
}

export function toGoal({ id, data }: StoredDoc): Goal {
  const createdAt = iso(data.createdAt);
  const milestones = Math.max(1, Math.round(num(data.milestones, 1)));
  const milestonesComplete = Math.min(milestones, Math.max(0, Math.round(num(data.milestonesComplete))));
  const progress = Math.round((milestonesComplete / milestones) * 100);
  return {
    id,
    title: str(data.title, 'Untitled goal'),
    detail: str(data.detail),
    term: oneOf(data.term, ['short', 'long'] as const, 'short'),
    dueDate: typeof data.dueDate === 'string' && isValidIso(data.dueDate) ? data.dueDate : null,
    milestones,
    milestoneNames: normalizeMilestoneNames(data.milestoneNames, milestones),
    milestonesComplete,
    progress,
    status: progress >= 100 ? 'complete' : progress > 0 ? 'in-progress' : 'not-started',
    createdAt,
    updatedAt: iso(data.updatedAt ?? createdAt),
    completedAt: typeof data.completedAt === 'string' ? data.completedAt : null,
  };
}

export function toGoalProgress({ id, data }: StoredDoc): GoalProgress {
  return {
    id,
    goalId: str(data.goalId),
    type: oneOf<GoalProgressType>(data.type, ['created', 'milestone', 'milestone-undone', 'completed', 'reopened', 'edited'], 'edited'),
    progress: num(data.progress),
    milestonesComplete: num(data.milestonesComplete),
    createdAt: iso(data.createdAt),
  };
}

export function toJournalEntry({ id, data }: StoredDoc): JournalEntry {
  const createdAt = iso(data.createdAt);
  const text = str(data.text);
  return {
    id,
    text,
    mood: MOODS.includes(data.mood as Mood) ? (data.mood as Mood) : null,
    tags: Array.isArray(data.tags) ? data.tags.filter((t): t is string => typeof t === 'string') : [],
    wordCount: num(data.wordCount, text.trim().split(/\s+/).filter(Boolean).length),
    date: dateOf(data.date, createdAt),
    createdAt,
    updatedAt: iso(data.updatedAt ?? createdAt),
  };
}

export function toMoodLog({ id, data }: StoredDoc): MoodLog | null {
  const mood = data.mood as Mood;
  if (!MOODS.includes(mood)) return null;
  const createdAt = iso(data.createdAt);
  return {
    id,
    mood,
    score: Math.min(10, Math.max(1, num(data.score, MOOD_SCORE[mood]))),
    note: str(data.note),
    source: oneOf(data.source, ['check-in', 'journal'] as const, 'check-in'),
    journalEntryId: typeof data.journalEntryId === 'string' ? data.journalEntryId : null,
    date: dateOf(data.date, createdAt),
    createdAt,
  };
}

export function toActivity({ id, data }: StoredDoc): Activity {
  return {
    id,
    type: str(data.type, 'login') as ActivityType,
    message: str(data.message),
    entityId: typeof data.entityId === 'string' ? data.entityId : null,
    createdAt: iso(data.createdAt),
  };
}

export function toAchievement({ id, data }: StoredDoc): Achievement {
  return { id, unlockedAt: iso(data.unlockedAt) };
}

export function toSnapshot({ id, data }: StoredDoc): AnalyticsSnapshot {
  const s = (data.scores ?? {}) as DocData;
  const scores: RadarScores = {
    discipline: num(s.discipline),
    growth: num(s.growth),
    wellness: num(s.wellness),
    focus: num(s.focus),
    mindfulness: num(s.mindfulness),
    finance: num(s.finance),
  };
  return { id, date: str(data.date, id), scores, overall: num(data.overall), createdAt: iso(data.createdAt) };
}

export function toPreferences(doc: StoredDoc | null): Preferences {
  const d = doc?.data ?? {};
  const time = (v: unknown, fallback: string) => (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : fallback);
  return {
    theme: oneOf(d.theme, ['dark', 'light'] as const, DEFAULT_PREFERENCES.theme),
    habitReminder: bool(d.habitReminder, DEFAULT_PREFERENCES.habitReminder),
    habitReminderTime: time(d.habitReminderTime, DEFAULT_PREFERENCES.habitReminderTime),
    journalReminder: bool(d.journalReminder, DEFAULT_PREFERENCES.journalReminder),
    journalReminderTime: time(d.journalReminderTime, DEFAULT_PREFERENCES.journalReminderTime),
    browserNotifications: bool(d.browserNotifications, DEFAULT_PREFERENCES.browserNotifications),
  };
}

export function toUserProfile(uid: string, doc: StoredDoc | null, fallback: { email: string | null; name: string | null; photoURL: string | null }): UserProfile {
  const d = doc?.data ?? {};
  return {
    uid,
    username: str(d.username) || fallback.name || fallback.email || 'User',
    email: typeof d.email === 'string' ? d.email : fallback.email,
    photoURL: typeof d.photoURL === 'string' ? d.photoURL : fallback.photoURL,
    gender: oneOf<Gender | 'none'>(d.gender, ['male', 'female', 'other'], 'none') === 'none' ? null : (d.gender as Gender),
    createdAt: typeof d.createdAt === 'string' ? d.createdAt : null,
    schemaVersion: num(d.schemaVersion, 1),
  };
}
