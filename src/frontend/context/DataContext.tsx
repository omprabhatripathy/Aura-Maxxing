import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { database, paths, type QueryOptions, type StoredDoc } from '../../backend/db';
import {
  toAchievement,
  toActivity,
  toGoal,
  toGoalProgress,
  toHabit,
  toHabitLog,
  toJournalEntry,
  toMoodLog,
  toPreferences,
  toSnapshot,
} from '../../backend/repositories/mappers';
import { buildReport } from '../../backend/analytics/radar';
import { groupLogs } from '../../backend/analytics/habits';
import { ACHIEVEMENTS, badgeTier } from '../../backend/achievements/engine';
import { buildProgression, calculateAchievements } from '../../backend/services/progressionService';
import { toFocusSession, toTask } from '../../backend/todo/model';
import type { FocusSession, Task } from '../../backend/todo/types';
import { fromLegacyFocus, toPomodoroSession } from '../../backend/pomodoro/model';
import type { PomodoroSession } from '../../backend/pomodoro/types';
import { toExpense, toFinanceSettings, toIncome } from '../../backend/finance/model';
import type { Expense, Income } from '../../backend/finance/types';
import { toScheduleItem } from '../../backend/schedule/model';
import type { ScheduleItem } from '../../backend/schedule/types';
import { saveAnalyticsSnapshot, unlockAchievements } from '../../backend/services/systemService';
import { toUserMessage } from '../../backend/core/errors';
import { todayIso } from '../../backend/core/dates';
import type { Achievement, Activity, AnalyticsSnapshot, Goal, GoalProgress, Habit, HabitLog, JournalEntry, MoodLog } from '../../backend/models';
import { emitAchievementsUnlocked } from '../lib/achievementEvents';
import { useAuth } from './useAuth';
import { DataContext, type UserData } from './useUserData';

type Status = 'loading' | 'ready' | 'error';

interface CollectionSpec<T> {
  key: string;
  path: (uid: string) => string[];
  options: QueryOptions;
  map: (doc: StoredDoc) => T | null;
}

const specs = {
  habits: { key: 'habits', path: paths.habits, options: { orderBy: 'createdAt' }, map: toHabit } as CollectionSpec<Habit>,
  habitLogs: { key: 'habitLogs', path: paths.habitLogs, options: {}, map: toHabitLog } as CollectionSpec<HabitLog>,
  goals: { key: 'goals', path: paths.goals, options: { orderBy: 'createdAt' }, map: toGoal } as CollectionSpec<Goal>,
  goalProgress: { key: 'goalProgress', path: paths.goalProgress, options: { orderBy: 'createdAt' }, map: toGoalProgress } as CollectionSpec<GoalProgress>,
  journalEntries: { key: 'journalEntries', path: paths.journalEntries, options: { orderBy: 'createdAt', direction: 'desc' }, map: toJournalEntry } as CollectionSpec<JournalEntry>,
  moodLogs: { key: 'moodLogs', path: paths.moodLogs, options: { orderBy: 'createdAt', direction: 'desc' }, map: toMoodLog } as CollectionSpec<MoodLog>,
  activity: { key: 'activity', path: paths.activityHistory, options: { orderBy: 'createdAt', direction: 'desc', limit: 300 }, map: toActivity } as CollectionSpec<Activity>,
  achievements: { key: 'achievements', path: paths.achievements, options: {}, map: toAchievement } as CollectionSpec<Achievement>,
  snapshots: { key: 'snapshots', path: paths.analyticsSnapshots, options: { orderBy: 'date', direction: 'desc', limit: 120 }, map: toSnapshot } as CollectionSpec<AnalyticsSnapshot>,
  // Needed by the progression engine (Focus area, XP); the Todo page keeps its own richer subscription.
  tasks: { key: 'tasks', path: paths.tasks, options: { orderBy: 'createdAt' }, map: toTask } as CollectionSpec<Task>,
  focusSessions: { key: 'focusSessions', path: paths.focusSessions, options: { orderBy: 'startedAt', direction: 'desc', limit: 500 }, map: toFocusSession } as CollectionSpec<FocusSession>,
  pomodoroSessions: { key: 'pomodoroSessions', path: paths.pomodoro, options: { orderBy: 'startedAt', direction: 'desc', limit: 1000 }, map: toPomodoroSession } as CollectionSpec<PomodoroSession>,
  expenses: { key: 'expenses', path: paths.expenses, options: { orderBy: 'date', direction: 'desc' }, map: toExpense } as CollectionSpec<Expense>,
  income: { key: 'income', path: paths.income, options: { orderBy: 'date', direction: 'desc' }, map: toIncome } as CollectionSpec<Income>,
  schedule: { key: 'schedule', path: paths.schedule, options: { orderBy: 'date' }, map: toScheduleItem } as CollectionSpec<ScheduleItem>,
};

type SpecKey = keyof typeof specs;
type Collections = { [K in SpecKey]: (typeof specs)[K] extends CollectionSpec<infer T> ? T[] : never };

interface State {
  uid: string | null;
  data: Partial<Collections>;
  status: Partial<Record<SpecKey | 'settings', Status>>;
  errors: Partial<Record<SpecKey | 'settings', string>>;
  settings: Record<string, StoredDoc>;
}

const SPEC_KEYS = Object.keys(specs) as SpecKey[];
const EMPTY: never[] = [];

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [state, setState] = useState<State>({ uid: null, data: {}, status: {}, errors: {}, settings: {} });
  const [attempt, setAttempt] = useState(0);
  const [today, setToday] = useState(todayIso);

  // Roll the "today" boundary over at midnight so streaks and due habits stay correct for long sessions.
  useEffect(() => {
    const timer = window.setInterval(() => setToday(todayIso()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsubs = SPEC_KEYS.map((key) => {
      const spec = specs[key] as CollectionSpec<unknown>;
      return database.subscribe(
        spec.path(uid),
        spec.options,
        (docs) =>
          setState((s) => ({
            ...(s.uid === uid ? s : { uid, data: {}, status: {}, errors: {}, settings: {} }),
            data: { ...(s.uid === uid ? s.data : {}), [key]: docs.map(spec.map).filter((x) => x !== null) },
            status: { ...(s.uid === uid ? s.status : {}), [key]: 'ready' },
          })),
        (error) => {
          console.error(`Subscription failed: ${key}`, error);
          setState((s) => ({
            ...s,
            uid,
            status: { ...s.status, [key]: 'error' },
            errors: { ...s.errors, [key]: toUserMessage(error, 'Some of your data could not be loaded.') },
          }));
        }
      );
    });
    unsubs.push(
      database.subscribe(
        paths.settings(uid),
        {},
        (docs) =>
          setState((s) => ({
            ...(s.uid === uid ? s : { uid, data: {}, status: {}, errors: {}, settings: {} }),
            settings: Object.fromEntries(docs.map((d) => [d.id, d])),
            status: { ...(s.uid === uid ? s.status : {}), settings: 'ready' },
          })),
        (error) => setState((s) => ({ ...s, status: { ...s.status, settings: 'error' }, errors: { ...s.errors, settings: toUserMessage(error) } }))
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [uid, attempt]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, status: {}, errors: {} }));
    setAttempt((a) => a + 1);
  }, []);

  const current = state.uid === uid ? state : null;
  const pick = <K extends SpecKey>(key: K): Collections[K] => ((current?.data[key] as Collections[K]) ?? (EMPTY as Collections[K]));
  const habits = pick('habits');
  const habitLogs = pick('habitLogs');
  const goals = pick('goals');
  const goalProgress = pick('goalProgress');
  const journalEntries = pick('journalEntries');
  const moodLogs = pick('moodLogs');
  const activity = pick('activity');
  const achievements = pick('achievements');
  const snapshots = pick('snapshots');
  const tasks = pick('tasks');
  const focusSessions = pick('focusSessions');
  const pomodoroSessions = pick('pomodoroSessions');
  const expenses = pick('expenses');
  const income = pick('income');
  const schedule = pick('schedule');
  // Old Todo focus sessions keep counting as Pomodoro history.
  const pomodoro = useMemo(
    () => [...pomodoroSessions, ...focusSessions.map(fromLegacyFocus)].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [pomodoroSessions, focusSessions]
  );
  const settings = current?.settings;

  const allKeys = [...SPEC_KEYS, 'settings'] as const;
  const loading = !current || allKeys.some((k) => !current.status[k]);
  const errorKey = current ? allKeys.find((k) => current.status[k] === 'error') : undefined;
  const error = errorKey && current ? current.errors[errorKey] ?? 'Some data failed to load.' : null;

  const logsByHabit = useMemo(() => groupLogs(habitLogs), [habitLogs]);
  const financeSettings = useMemo(() => toFinanceSettings(settings?.finance ?? null), [settings]);
  const dataset = useMemo(
    () => ({ habits, habitLogs, goals, goalProgress, journalEntries, moodLogs, tasks, pomodoro, expenses, income, financeSettings, schedule }),
    [habits, habitLogs, goals, goalProgress, journalEntries, moodLogs, tasks, pomodoro, expenses, income, financeSettings, schedule]
  );
  const report = useMemo(
    () => buildReport(dataset, today),
    [dataset, today]
  );
  const { current: currentRadar } = report;
  const progression = useMemo(() => {
    const badges = achievements.flatMap((a) => {
      const def = ACHIEVEMENTS.find((x) => x.id === a.id);
      return def ? [{ id: a.id, title: def.title, tier: badgeTier(a.id), unlockedAt: a.unlockedAt }] : [];
    });
    return buildProgression(dataset, today, currentRadar, badges, logsByHabit);
  }, [dataset, today, currentRadar, achievements, logsByHabit]);
  const preferences = useMemo(() => toPreferences(settings?.preferences ?? null), [settings]);

  // Reaction engine: whenever data changes, unlock earned achievements and keep today's analytics snapshot current.
  const pendingAchievements = useRef(new Set<string>());
  const lastSnapshot = useRef<string>('');
  useEffect(() => {
    if (!uid || loading || error) return;
    const data = dataset;
    const unlocked = new Set([...achievements.map((a) => a.id), ...pendingAchievements.current]);
    const earned = calculateAchievements(data, report, unlocked);
    if (earned.length) {
      earned.forEach((a) => pendingAchievements.current.add(a.id));
      unlockAchievements(uid, earned)
        .then(() => emitAchievementsUnlocked(earned))
        .catch(() => earned.forEach((a) => pendingAchievements.current.delete(a.id)));
    }

    const hasData = habits.length + goals.length + journalEntries.length + moodLogs.length > 0;
    const signature = JSON.stringify([report.current.scores, report.overall]);
    const stored = snapshots.find((s) => s.date === today);
    const storedSignature = stored ? JSON.stringify([stored.scores, stored.overall]) : '';
    if (hasData && signature !== storedSignature && lastSnapshot.current !== `${today}:${signature}`) {
      lastSnapshot.current = `${today}:${signature}`;
      saveAnalyticsSnapshot(uid, today, report).catch(() => (lastSnapshot.current = ''));
    }
  }, [uid, loading, error, report, achievements, snapshots, habits, habitLogs, goals, goalProgress, journalEntries, moodLogs, dataset, today]);

  // Apply the saved theme (also cached locally so the first paint after reload matches).
  useEffect(() => {
    if (!settings?.preferences) return;
    document.documentElement.setAttribute('data-theme', preferences.theme);
    localStorage.setItem('aura-theme', preferences.theme);
  }, [settings, preferences.theme]);

  const settingsDoc = useCallback((id: string) => settings?.[id] ?? null, [settings]);

  if (!uid) return <>{children}</>;

  const value: UserData = {
    uid,
    today,
    loading,
    error,
    retry,
    habits,
    habitLogs,
    goals,
    goalProgress,
    journalEntries,
    moodLogs,
    activity,
    achievements,
    snapshots,
    logsByHabit,
    report,
    preferences,
    settingsDoc,
    progression,
    tasks,
    pomodoro,
    expenses,
    income,
    financeSettings,
    schedule,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
