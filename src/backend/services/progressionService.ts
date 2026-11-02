/**
 * Progression engine: every score, XP total, level, streak and the Aura Radar is derived here from the user's
 * history. Nothing is incremented directly — values are recalculated from behaviour so they can't be farmed.
 */
import { addDays, dateRange, diffDays, isoFromTimestamp, weekStart } from '../core/dates';
import type { Goal, GoalProgress, Habit, HabitLog, JournalEntry, MoodLog, RadarScores } from '../models';
import type { Task } from '../todo/types';
import type { PomodoroSession } from '../pomodoro/types';
import { countsAsFocus, focusFactors } from '../pomodoro/analytics';
import type { Expense, FinanceSettings, Income } from '../finance/types';
import { financeFactors } from '../finance/analytics';
import { clamp01, weightedFactors, type RadarFactor } from '../analytics/factors';
import type { ScheduleItem } from '../schedule/types';
import { occurrencesOn } from '../schedule/analytics';
import { completedOn, isCompleted } from '../todo/analytics';
import { completionRate, groupLogs, habitStreak, type LogsByHabit } from '../analytics/habits';
import { BADGE_XP, newlyEarned, type AchievementDefinition } from '../achievements/engine';
import type { AnalyticsReport } from '../analytics/radar';

export interface UserDataSet {
  habits: Habit[];
  habitLogs: HabitLog[];
  goals: Goal[];
  goalProgress: GoalProgress[];
  journalEntries: JournalEntry[];
  moodLogs: MoodLog[];
  tasks?: Task[];
  /** Pomodoro sessions (legacy Todo focus sessions are mapped in). */
  pomodoro?: PomodoroSession[];
  expenses?: Expense[];
  income?: Income[];
  financeSettings?: FinanceSettings;
  schedule?: ScheduleItem[];
}

/* ================================================================== XP ================================================================== */

export const XP_RULES = {
  habit: 5,
  perfectDay: 25,
  goalShort: 50,
  goalLong: 200,
  journal: 3,
  journalDetailed: 10,
  mood: 2,
  todo: 2,
  focus: 10,
  scheduleBlock: 2,
  weeklyConsistency: 100,
  monthlyConsistency: 500,
  badge: BADGE_XP,
} as const;

/** Anti-farming limits. */
export const XP_LIMITS = {
  /** Habits needed on a day for the "all habits done" bonus, so one trivial habit can't farm it. */
  perfectDayMinHabits: 2,
  detailedJournalWords: 150,
  /** Reward multipliers for the 1st, 2nd… journal entry of a day; later entries earn nothing. */
  journalPerDay: [1, 0.5],
  moodPerDay: [1, 0.5],
  /** Todo completions per day that earn full XP, then half, then nothing. */
  todoFullPerDay: 5,
  todoHalfPerDay: 10,
  /** Tasks finished within this many minutes of being created earn nothing. */
  todoMinMinutes: 2,
  focusMinMinutes: 15,
  focusPerDay: 4,
  scheduleBlocksPerDay: 6,
  weeklyActiveDays: 6,
  monthlyActiveDays: 25,
} as const;

export type XpSource = 'habit' | 'perfect-day' | 'goal' | 'journal' | 'mood' | 'todo' | 'focus' | 'schedule' | 'weekly' | 'monthly' | 'badge';

export interface XpEntry {
  id: string;
  date: string;
  xp: number;
  source: XpSource;
  label: string;
  detail: string;
  habitId?: string;
}

export interface UnlockedBadge {
  id: string;
  title: string;
  tier: 'standard' | 'legendary';
  unlockedAt: string;
}

const normaliseText = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** Days with any meaningful action (habit, journal, mood, task, focus, goal milestone). */
export function activeDays(data: UserDataSet): Set<string> {
  const days = new Set<string>();
  data.habitLogs.forEach((l) => days.add(l.date));
  data.journalEntries.forEach((j) => days.add(j.date));
  data.moodLogs.forEach((m) => days.add(m.date));
  data.goalProgress.forEach((g) => (g.type === 'milestone' || g.type === 'completed') && days.add(isoFromTimestamp(g.createdAt)));
  (data.tasks ?? []).forEach((t) => {
    const d = completedOn(t);
    if (d) days.add(d);
  });
  (data.pomodoro ?? []).forEach((s) => countsAsFocus(s) && days.add(s.date));
  (data.schedule ?? []).forEach((i) => i.completedDates.forEach((d) => days.add(d)));
  (data.expenses ?? []).forEach((e) => days.add(e.date));
  (data.income ?? []).forEach((i) => days.add(i.date));
  return days;
}

/** Full XP ledger: one entry per rewarded action, with diminishing/capped rewards for repeats. */
export function calculateXP(data: UserDataSet, badges: UnlockedBadge[] = []): XpEntry[] {
  const ledger: XpEntry[] = [];
  const habitsById = new Map(data.habits.map((h) => [h.id, h]));

  // Habit completions: one per habit per period by construction.
  for (const l of data.habitLogs) {
    const h = habitsById.get(l.habitId);
    if (!h) continue;
    ledger.push({ id: `h_${l.id}`, date: l.date, xp: XP_RULES.habit, source: 'habit', label: h.label, detail: 'Habit completed', habitId: h.id });
  }

  // "All habits done" bonus: every daily habit that existed that day was completed, with at least 2 of them.
  const logsByDate = new Map<string, Set<string>>();
  data.habitLogs.forEach((l) => (logsByDate.get(l.date) ?? logsByDate.set(l.date, new Set()).get(l.date)!).add(l.habitId));
  for (const [date, done] of logsByDate) {
    const due = data.habits.filter((h) => !h.archived && h.frequency === 'daily' && isoFromTimestamp(h.createdAt) <= date);
    if (due.length >= XP_LIMITS.perfectDayMinHabits && due.every((h) => done.has(h.id))) {
      ledger.push({ id: `pd_${date}`, date, xp: XP_RULES.perfectDay, source: 'perfect-day', label: 'Perfect day', detail: `All ${due.length} daily habits completed` });
    }
  }

  // Goals: short-term = weekly-style goal, long-term = monthly-style goal. Same-day create+complete earns nothing.
  for (const g of data.goals) {
    if (g.status !== 'complete' || !g.completedAt) continue;
    const date = isoFromTimestamp(g.completedAt);
    const rushed = date === isoFromTimestamp(g.createdAt);
    const xp = rushed ? 0 : g.term === 'long' ? XP_RULES.goalLong : XP_RULES.goalShort;
    ledger.push({ id: `g_${g.id}`, date, xp, source: 'goal', label: g.title, detail: rushed ? 'Created and completed the same day — no XP' : `${g.term === 'long' ? 'Long-term' : 'Short-term'} goal completed` });
  }

  // Journal: diminishing per day, duplicates earn nothing, detailed entries earn more.
  const seenText = new Set<string>();
  const journalCount = new Map<string, number>();
  for (const j of [...data.journalEntries].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const key = normaliseText(j.text);
    const duplicate = seenText.has(key);
    seenText.add(key);
    const n = journalCount.get(j.date) ?? 0;
    if (!duplicate) journalCount.set(j.date, n + 1);
    const detailed = j.wordCount >= XP_LIMITS.detailedJournalWords;
    const base = detailed ? XP_RULES.journalDetailed : XP_RULES.journal;
    const factor = duplicate ? 0 : (XP_LIMITS.journalPerDay[n] ?? 0);
    const xp = Math.round(base * factor);
    ledger.push({
      id: `j_${j.id}`,
      date: j.date,
      xp,
      source: 'journal',
      label: detailed ? 'Detailed journal entry' : 'Journal entry',
      detail: duplicate ? 'Duplicate entry — no XP' : factor === 0 ? 'Daily journal reward limit reached' : `${j.wordCount} words${factor < 1 ? ' · reduced (extra entry today)' : ''}`,
    });
  }

  // Mood check-ins: small, capped per day.
  const moodCount = new Map<string, number>();
  for (const m of [...data.moodLogs].filter((x) => x.source === 'check-in').sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const n = moodCount.get(m.date) ?? 0;
    moodCount.set(m.date, n + 1);
    const xp = Math.round(XP_RULES.mood * (XP_LIMITS.moodPerDay[n] ?? 0));
    ledger.push({ id: `m_${m.id}`, date: m.date, xp, source: 'mood', label: 'Mood check-in', detail: xp ? 'Mood logged' : 'Daily mood reward limit reached' });
  }

  // Todos: full XP for the first few per day, then half, then nothing; instant create-and-complete earns nothing.
  const todoCount = new Map<string, number>();
  for (const t of (data.tasks ?? []).filter(isCompleted).sort((a, b) => a.completedAt!.localeCompare(b.completedAt!))) {
    const date = completedOn(t)!;
    const minutes = (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / 60000;
    if (minutes < XP_LIMITS.todoMinMinutes) {
      ledger.push({ id: `t_${t.id}`, date, xp: 0, source: 'todo', label: t.title, detail: 'Completed instantly — no XP' });
      continue;
    }
    const n = todoCount.get(date) ?? 0;
    todoCount.set(date, n + 1);
    const xp = n < XP_LIMITS.todoFullPerDay ? XP_RULES.todo : n < XP_LIMITS.todoHalfPerDay ? XP_RULES.todo / 2 : 0;
    ledger.push({ id: `t_${t.id}`, date, xp, source: 'todo', label: t.title, detail: xp === XP_RULES.todo ? 'Task completed' : xp ? 'Task completed · reduced (busy day)' : 'Daily task reward limit reached' });
  }

  // Pomodoro: only completed sessions of 15+ minutes count, capped per day.
  const focusCount = new Map<string, number>();
  for (const p of [...(data.pomodoro ?? [])].filter(countsAsFocus).sort((x, y) => x.startedAt.localeCompare(y.startedAt))) {
    const n = focusCount.get(p.date) ?? 0;
    focusCount.set(p.date, n + 1);
    const xp = n < XP_LIMITS.focusPerDay ? XP_RULES.focus : 0;
    ledger.push({ id: `f_${p.id}`, date: p.date, xp, source: 'focus', label: p.taskTitle || 'Pomodoro session', detail: xp ? `${Math.round(p.actualMinutes)} min focus` : 'Daily focus reward limit reached' });
  }

  // Schedule: completing a planned block earns a little, capped per day.
  const blockCount = new Map<string, number>();
  for (const item of data.schedule ?? []) {
    for (const date of [...item.completedDates].sort()) {
      const n = blockCount.get(date) ?? 0;
      blockCount.set(date, n + 1);
      const xp = n < XP_LIMITS.scheduleBlocksPerDay ? XP_RULES.scheduleBlock : 0;
      ledger.push({ id: `s_${item.id}_${date}`, date, xp, source: 'schedule', label: item.title, detail: xp ? 'Planned block completed' : 'Daily schedule reward limit reached' });
    }
  }

  // Consistency bonuses: paid the day the threshold is reached.
  const days = [...activeDays(data)].sort();
  const byWeek = new Map<string, string[]>();
  const byMonth = new Map<string, string[]>();
  for (const d of days) {
    (byWeek.get(weekStart(d)) ?? byWeek.set(weekStart(d), []).get(weekStart(d))!).push(d);
    (byMonth.get(d.slice(0, 7)) ?? byMonth.set(d.slice(0, 7), []).get(d.slice(0, 7))!).push(d);
  }
  for (const [week, list] of byWeek) {
    if (list.length >= XP_LIMITS.weeklyActiveDays) {
      const date = list[XP_LIMITS.weeklyActiveDays - 1];
      ledger.push({ id: `w_${week}`, date, xp: XP_RULES.weeklyConsistency, source: 'weekly', label: 'Weekly consistency bonus', detail: `Active ${XP_LIMITS.weeklyActiveDays}+ days in the week of ${week}` });
    }
  }
  for (const [month, list] of byMonth) {
    if (list.length >= XP_LIMITS.monthlyActiveDays) {
      const date = list[XP_LIMITS.monthlyActiveDays - 1];
      ledger.push({ id: `mo_${month}`, date, xp: XP_RULES.monthlyConsistency, source: 'monthly', label: 'Monthly consistency bonus', detail: `Active ${XP_LIMITS.monthlyActiveDays}+ days in ${month}` });
    }
  }

  for (const b of badges) {
    ledger.push({ id: `b_${b.id}`, date: isoFromTimestamp(b.unlockedAt), xp: XP_RULES.badge[b.tier], source: 'badge', label: b.title, detail: `${b.tier === 'legendary' ? 'Legendary' : 'Standard'} badge unlocked` });
  }

  return ledger.sort((a, b) => b.date.localeCompare(a.date));
}

export const totalXp = (ledger: XpEntry[]) => ledger.reduce((s, e) => s + e.xp, 0);

/* ================================================================ LEVELS ================================================================ */

/**
 * Cumulative XP needed to finish level n: 100·n + 4·n^2.2.
 * L1 104 · L5 ~640 · L10 ~1.6k · L25 ~6.9k · L50 ~27k (≈8 months of daily effort) · L100 ~110k (years).
 */
export function xpForLevel(n: number): number {
  if (n <= 0) return 0;
  return Math.round((100 * n + 4 * n ** 2.2) / 10) * 10;
}

const RANKS: [number, string][] = [
  [100, 'Ascended'],
  [75, 'Legend'],
  [50, 'Grandmaster'],
  [40, 'Master'],
  [30, 'Expert'],
  [20, 'Achiever'],
  [10, 'Adept'],
  [5, 'Apprentice'],
  [1, 'Novice'],
];

export interface LevelInfo {
  level: number;
  rank: string;
  xp: number;
  levelStart: number;
  nextLevel: number;
  /** 0–100 progress through the current level. */
  progress: number;
}

export function calculateLevel(xp: number): LevelInfo {
  let level = 1;
  while (xp >= xpForLevel(level)) level++;
  const levelStart = xpForLevel(level - 1);
  const nextLevel = xpForLevel(level);
  return {
    level,
    rank: RANKS.find(([min]) => level >= min)![1],
    xp,
    levelStart,
    nextLevel,
    progress: Math.round(((xp - levelStart) / (nextLevel - levelStart)) * 100),
  };
}

/* =============================================================== STREAKS =============================================================== */

export interface StreakSet {
  /** Any meaningful action; one missed day per 7 is forgiven ("streak shield"). */
  activity: { current: number; longest: number; shieldUsed: boolean };
  habit: { current: number; longest: number; habitLabel: string | null };
  /** Consecutive ISO weeks with goal progress. */
  goal: { current: number; longest: number };
  journal: { current: number; longest: number };
}

/** Current/longest run over a sorted day list, optionally forgiving one gap day per `graceEvery` days. */
function runLengths(days: Set<string>, today: string, graceEvery = 0): { current: number; longest: number; shieldUsed: boolean } {
  if (!days.size) return { current: 0, longest: 0, shieldUsed: false };
  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let sinceGrace = Infinity;
  let prev: string | null = null;
  for (const d of sorted) {
    const gap = prev ? diffDays(prev, d) : 1;
    if (gap === 1) run++;
    else if (graceEvery && gap === 2 && sinceGrace >= graceEvery) {
      run++;
      sinceGrace = 0;
    } else run = 1;
    sinceGrace++;
    longest = Math.max(longest, run);
    prev = d;
  }

  // Walk back from today (an unfinished today doesn't break the streak).
  let cursor = days.has(today) ? today : addDays(today, -1);
  let current = 0;
  let shieldUsed = false;
  let streakDaysSinceShield = Infinity;
  while (true) {
    if (days.has(cursor)) {
      current++;
      streakDaysSinceShield++;
      cursor = addDays(cursor, -1);
    } else if (graceEvery && current > 0 && streakDaysSinceShield >= graceEvery && days.has(addDays(cursor, -1))) {
      shieldUsed = shieldUsed || cursor >= addDays(today, -7);
      streakDaysSinceShield = 0;
      cursor = addDays(cursor, -1);
    } else break;
  }
  return { current, longest: Math.max(longest, current), shieldUsed };
}

export function calculateStreaks(data: UserDataSet, today: string, logs: LogsByHabit = groupLogs(data.habitLogs)): StreakSet {
  const activity = runLengths(activeDays(data), today, 7);

  let habit = { current: 0, longest: 0, habitLabel: null as string | null };
  for (const h of data.habits.filter((x) => !x.archived)) {
    const current = habitStreak(h, logs, today);
    const days = new Set(h.frequency === 'daily' ? [...(logs.get(h.id) ?? [])] : []);
    const longest = Math.max(current, runLengths(days, today).longest);
    if (current > habit.current || (current === habit.current && longest > habit.longest)) habit = { current, longest: Math.max(habit.longest, longest), habitLabel: h.label };
    else habit.longest = Math.max(habit.longest, longest);
  }

  const goalWeeks = new Set(data.goalProgress.filter((g) => g.type === 'milestone' || g.type === 'completed').map((g) => weekStart(isoFromTimestamp(g.createdAt))));
  let wCursor = goalWeeks.has(weekStart(today)) ? weekStart(today) : addDays(weekStart(today), -7);
  let goalCurrent = 0;
  while (goalWeeks.has(wCursor)) {
    goalCurrent++;
    wCursor = addDays(wCursor, -7);
  }
  let goalLongest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const w of [...goalWeeks].sort()) {
    run = prev && diffDays(prev, w) === 7 ? run + 1 : 1;
    goalLongest = Math.max(goalLongest, run);
    prev = w;
  }

  const journal = runLengths(new Set(data.journalEntries.map((j) => j.date)), today);
  return {
    activity,
    habit,
    goal: { current: goalCurrent, longest: Math.max(goalLongest, goalCurrent) },
    journal: { current: journal.current, longest: journal.longest },
  };
}

/* ============================================================= AURA RADAR ============================================================= */

export const AREAS: (keyof RadarScores)[] = ['discipline', 'growth', 'wellness', 'focus', 'mindfulness', 'finance'];

/** Days of category activity (within the last 90) needed for full maturity. Earlier days count more (diminishing returns). */
export const MATURITY_WINDOW = 90;
const MATURITY_TAU = 25;

/** 0→1 curve: 10 active days ≈ 0.34, 30 ≈ 0.71, 60 ≈ 0.93, 90 = 1. */
export function maturity(activeDayCount: number): number {
  const d = Math.min(MATURITY_WINDOW, activeDayCount);
  return (1 - Math.exp(-d / MATURITY_TAU)) / (1 - Math.exp(-MATURITY_WINDOW / MATURITY_TAU));
}

const weighted = weightedFactors;

export interface RadarResult {
  scores: RadarScores;
  /** Areas with no underlying data are scored 0 and flagged here. */
  coverage: Record<keyof RadarScores, boolean>;
  /** 0–1 quality of recent behaviour per area (before maturity is applied). */
  quality: Record<keyof RadarScores, number>;
  /** 0–1 maturity per area from how many days of history back it up. */
  maturity: Record<keyof RadarScores, number>;
  /** The weighted inputs behind each area's quality. */
  factors: Record<keyof RadarScores, RadarFactor[]>;
  /** Days of area-relevant activity in the last 90 days (drives maturity). */
  evidenceDays: Record<keyof RadarScores, number>;
}

const GRATITUDE = /\b(grateful|gratitude|thankful|thank you|appreciate)\b/i;

/** A goal's progress as it stood on `date`, from its progress history. */
function goalProgressAt(goal: Goal, history: GoalProgress[], date: string): number {
  const events = history.filter((e) => e.goalId === goal.id && isoFromTimestamp(e.createdAt) <= date);
  if (!events.length) return history.some((e) => e.goalId === goal.id) ? 0 : goal.progress;
  return events.reduce((latest, e) => (e.createdAt > latest.createdAt ? e : latest)).progress;
}

/**
 * Recalculates the radar as of `asOf` from historical behaviour.
 * score = 100 × quality (weighted rolling 7/30/90-day factors) × maturity (diminishing returns on days of history).
 */
export function calculateRadarScore(data: UserDataSet, asOf: string, logs: LogsByHabit = groupLogs(data.habitLogs)): RadarResult {
  const from = (days: number) => addDays(asOf, -(days - 1));
  const within = (d: string, days: number) => d >= from(days) && d <= asOf;
  const active = data.habits.filter((h) => !h.archived && isoFromTimestamp(h.createdAt) <= asOf);
  const cat = (c: Habit['category']) => active.filter((h) => h.category === c);

  /** Rolling habit completion: 7-day 50%, 30-day 30%, 90-day 20% (missed habits pull it down). */
  const rollingRate = (habits: Habit[]): number | null =>
    weighted([7, 30, 90].map((days, i) => {
      const r = habits.length ? completionRate(habits, logs, from(days), asOf) : null;
      return { value: r === null ? null : r / 100, weight: [0.5, 0.3, 0.2][i] };
    }));

  const habitDays = (habits: Habit[]) => {
    const ids = new Set(habits.map((h) => h.id));
    return data.habitLogs.filter((l) => ids.has(l.habitId) && within(l.date, MATURITY_WINDOW)).map((l) => l.date);
  };
  const journals30 = data.journalEntries.filter((j) => within(j.date, 30));
  const journalDays30 = new Set(journals30.map((j) => j.date)).size;
  const moods30 = data.moodLogs.filter((m) => within(m.date, 30));
  const moodDays30 = new Set(moods30.map((m) => m.date)).size;
  const hasJournal = data.journalEntries.some((j) => j.date <= asOf);
  const hasMood = data.moodLogs.some((m) => m.date <= asOf);
  const goals = data.goals.filter((g) => isoFromTimestamp(g.createdAt) <= asOf);
  const openGoals = goals.filter((g) => !(g.completedAt && isoFromTimestamp(g.completedAt) <= asOf));
  const goalProgress = openGoals.length ? openGoals.reduce((s, g) => s + goalProgressAt(g, data.goalProgress, asOf), 0) / openGoals.length / 100 : null;
  const goalsDone90 = goals.filter((g) => g.completedAt && within(isoFromTimestamp(g.completedAt), 90)).length;
  const goalEventDays = data.goalProgress.filter((g) => (g.type === 'milestone' || g.type === 'completed') && within(isoFromTimestamp(g.createdAt), MATURITY_WINDOW)).map((g) => isoFromTimestamp(g.createdAt));
  const tasks = (data.tasks ?? []).filter((t) => isoFromTimestamp(t.createdAt) <= asOf);
  const sessions = (data.pomodoro ?? []).filter((s) => s.date <= asOf);
  const allActive = activeDays({ ...data, tasks, pomodoro: sessions });

  const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
  const habitFactor = (key: string, label: string, habits: Habit[], weight: number): RadarFactor => {
    const r = habits.length ? rollingRate(habits) : null;
    return { key, label, value: r, weight, detail: habits.length ? `${pct(r)} completion across ${habits.length} habit${habits.length === 1 ? '' : 's'} (7/30/90-day blend)` : 'No habits in this category yet' };
  };

  // Discipline
  const streak = runLengths(new Set([...allActive].filter((d) => d <= asOf)), asOf, 7).current;
  const firstActive = [...allActive].sort()[0];
  const weeks = [0, 1, 2, 3]
    .map((w) => ({ end: addDays(asOf, -7 * w), start: addDays(asOf, -7 * w - 6) }))
    .filter((w) => firstActive && w.end >= firstActive)
    .map((w) => [...allActive].filter((d) => d >= w.start && d <= w.end).length / 7);
  const weeklyShare = active.length && weeks.length ? weeks.reduce((a, b) => a + b, 0) / weeks.length : null;
  const disciplineFactors: RadarFactor[] = [
    habitFactor('habits', 'Habit completion', active, 0.45),
    { key: 'streak', label: 'Activity streak', value: active.length ? clamp01(streak / 21) : null, weight: 0.2, current: streak, target: 21, detail: `${streak}-day streak (full at 21)` },
    { key: 'weekly', label: 'Weekly consistency', value: weeklyShare, weight: 0.35, current: weeklyShare === null ? undefined : Math.round(weeklyShare * 7 * 10) / 10, target: 7, detail: weeklyShare === null ? 'Needs habits to measure' : `${(weeklyShare * 7).toFixed(1)} active days per week (last 4 weeks)` },
  ];

  // Growth (productivity habits count here now that Focus comes only from Pomodoro).
  const growthFactors: RadarFactor[] = [
    { key: 'goalsDone', label: 'Goals completed', value: goals.length ? clamp01(goalsDone90 / 3) : null, weight: 0.2, current: goalsDone90, target: 3, detail: goals.length ? `${goalsDone90} of 3 goals finished in 90 days` : 'No goals yet' },
    { key: 'goalProgress', label: 'Open goal progress', value: goalProgress, weight: 0.15, detail: goalProgress === null ? 'No open goals' : `${pct(goalProgress)} average progress on ${openGoals.length} open goal${openGoals.length === 1 ? '' : 's'}` },
    habitFactor('learning', 'Learning habits', cat('learning'), 0.3),
    habitFactor('productivity', 'Productivity habits', cat('productivity'), 0.15),
    { key: 'reflection', label: 'Reflection', value: hasJournal ? clamp01(journalDays30 / 12) : null, weight: 0.2, current: journalDays30, target: 12, detail: hasJournal ? `${journalDays30} of 12 journal days in 30` : 'No journal entries yet' },
  ];

  // Wellness
  const moodAvg = moods30.length ? moods30.reduce((s, m) => s + m.score, 0) / moods30.length : null;
  const checkInDays14 = new Set([
    ...data.moodLogs.filter((m) => within(m.date, 14)).map((m) => m.date),
    ...habitDays(cat('health')).filter((d) => within(d, 14)),
  ]).size;
  const wellnessFactors: RadarFactor[] = [
    habitFactor('health', 'Health habits', cat('health'), 0.35),
    { key: 'moodTracking', label: 'Mood tracking', value: hasMood ? clamp01(moodDays30 / 20) : null, weight: 0.25, current: moodDays30, target: 20, detail: hasMood ? `${moodDays30} of 20 mood days in 30` : 'No mood check-ins yet' },
    { key: 'moodLevel', label: 'Mood level', value: moodAvg === null ? null : clamp01((moodAvg - 2) / 7), weight: 0.15, detail: moodAvg === null ? 'No moods in 30 days' : `Average mood ${moodAvg.toFixed(1)}/10` },
    { key: 'checkIns', label: 'Recent check-ins', value: hasMood || cat('health').length ? clamp01(checkInDays14 / 14) : null, weight: 0.15, current: checkInDays14, target: 14, detail: `${checkInDays14} of 14 days with a mood or health check-in` },
    // Relationships are part of wellbeing now that Social became Financial Wellness.
    habitFactor('social', 'Social habits', cat('social'), 0.1),
  ];

  // Focus: Pomodoro sessions only (checking off tasks does not raise it).
  const focusList = focusFactors(sessions, asOf) ?? [];

  // Mindfulness
  const avgWords = journals30.length ? journals30.reduce((s, j) => s + j.wordCount, 0) / journals30.length : 0;
  const gratitude = journals30.filter((j) => GRATITUDE.test(j.text) || j.tags.some((t) => /grat|thank/.test(t))).length;
  const mindfulnessFactors: RadarFactor[] = [
    { key: 'journalFreq', label: 'Journaling frequency', value: hasJournal ? clamp01(journalDays30 / 15) : null, weight: 0.3, current: journalDays30, target: 15, detail: hasJournal ? `${journalDays30} of 15 journal days in 30` : 'No journal entries yet' },
    { key: 'journalDepth', label: 'Journal depth', value: hasJournal ? clamp01(avgWords / 150) : null, weight: 0.15, current: Math.round(avgWords), target: 150, detail: `${Math.round(avgWords)} words per entry (full at 150)` },
    { key: 'gratitude', label: 'Gratitude', value: hasJournal ? clamp01(gratitude / 8) : null, weight: 0.15, current: gratitude, target: 8, detail: `${gratitude} of 8 gratitude entries in 30 days` },
    { key: 'moodAwareness', label: 'Mood awareness', value: hasMood ? clamp01(moodDays30 / 20) : null, weight: 0.2, current: moodDays30, target: 20, detail: `${moodDays30} of 20 mood days in 30` },
    habitFactor('mindset', 'Mindset habits', cat('mindset'), 0.2),
  ];

  // Financial Wellness: savings rate, budget adherence, tracking consistency, saving goals.
  const expenses = (data.expenses ?? []).filter((e) => e.date <= asOf);
  const income = (data.income ?? []).filter((i) => i.date <= asOf);
  const financeList = financeFactors(expenses, income, data.financeSettings ?? { currency: '', monthlyBudget: null, categoryLimits: {}, savingGoals: [] }, asOf) ?? [];

  // Maturity: days of category-relevant activity in the last 90 days.
  const count = (dates: string[]) => new Set(dates).size;
  const journalDays90 = data.journalEntries.filter((j) => within(j.date, MATURITY_WINDOW)).map((j) => j.date);
  const moodDays90 = data.moodLogs.filter((m) => within(m.date, MATURITY_WINDOW)).map((m) => m.date);
  const focusDays90 = sessions.filter((s) => countsAsFocus(s) && within(s.date, MATURITY_WINDOW)).map((s) => s.date);
  const moneyDays90 = [...expenses, ...income].filter((t) => within(t.date, MATURITY_WINDOW)).map((t) => t.date);
  const evidence: Record<keyof RadarScores, number> = {
    discipline: count(habitDays(active)),
    growth: count([...habitDays(cat('learning')), ...habitDays(cat('productivity')), ...goalEventDays, ...journalDays90]),
    wellness: count([...habitDays(cat('health')), ...habitDays(cat('social')), ...moodDays90]),
    focus: count(focusDays90),
    mindfulness: count([...habitDays(cat('mindset')), ...journalDays90, ...moodDays90]),
    finance: count(moneyDays90),
  };

  const factors: Record<keyof RadarScores, RadarFactor[]> = {
    discipline: disciplineFactors,
    growth: growthFactors,
    wellness: wellnessFactors,
    focus: focusList,
    mindfulness: mindfulnessFactors,
    finance: financeList,
  };
  const scores = {} as RadarScores;
  const coverage = {} as Record<keyof RadarScores, boolean>;
  const quality = {} as Record<keyof RadarScores, number>;
  const mature = {} as Record<keyof RadarScores, number>;
  for (const a of AREAS) {
    const q = weighted(factors[a]);
    coverage[a] = q !== null;
    quality[a] = q ?? 0;
    mature[a] = maturity(evidence[a]);
    scores[a] = q === null ? 0 : Math.round(100 * clamp01(q) * mature[a]);
  }
  return { scores, coverage, quality, maturity: mature, factors, evidenceDays: evidence };
}

/** Average of tracked areas, scaled by breadth so a balanced Aura (all 6 areas) is needed for 100. */
export function auraScore(radar: RadarResult): number {
  const covered = AREAS.filter((a) => radar.coverage[a]);
  if (!covered.length) return 0;
  const average = covered.reduce((sum, a) => sum + radar.scores[a], 0) / covered.length;
  return Math.round(average * (0.5 + 0.5 * (covered.length / AREAS.length)));
}

/* ========================================================== PRODUCTIVITY SCORE ========================================================== */

export interface ProductivityScore {
  /** 0–100, from completed days only (updates once per day). */
  score: number;
  /** Change vs. the score a week earlier. */
  trend: number | null;
  asOf: string;
  daily: { date: string; value: number | null }[];
}

/** One day's productivity index (0–1) from habits, todos, goal progress and showing up. */
function dayIndex(data: UserDataSet, date: string, logs: LogsByHabit, active: Set<string>): number | null {
  const habits = data.habits.filter((h) => !h.archived && h.frequency === 'daily' && isoFromTimestamp(h.createdAt) <= date);
  const habitRate = habits.length ? completionRate(habits, logs, date, date) : null;
  const tasks = data.tasks ?? [];
  const doneToday = tasks.filter((t) => completedOn(t) === date).length;
  const dueMissed = tasks.filter((t) => t.dueDate === date && completedOn(t) !== date).length;
  const goalsExist = data.goals.some((g) => isoFromTimestamp(g.createdAt) <= date);
  const goalMoved = data.goalProgress.some((g) => (g.type === 'milestone' || g.type === 'completed') && isoFromTimestamp(g.createdAt) <= date && isoFromTimestamp(g.createdAt) > addDays(date, -7));
  const focusMinutes = (data.pomodoro ?? []).filter((p) => p.date === date && countsAsFocus(p)).reduce((s, p) => s + p.actualMinutes, 0);
  const hasFocused = (data.pomodoro ?? []).some((p) => p.date <= date);
  const planned = occurrencesOn(data.schedule ?? [], date);
  const plannedMinutes = planned.reduce((s, o) => s + o.minutes, 0);
  const doneMinutes = planned.filter((o) => o.done).reduce((s, o) => s + o.minutes, 0);
  return weighted([
    { value: habitRate === null ? null : habitRate / 100, weight: 0.3 },
    { value: doneToday + dueMissed ? doneToday / (doneToday + dueMissed) : null, weight: 0.2 },
    { value: goalsExist ? (goalMoved ? 1 : 0) : null, weight: 0.1 },
    { value: hasFocused ? clamp01(focusMinutes / 50) : null, weight: 0.15 },
    { value: plannedMinutes ? doneMinutes / plannedMinutes : null, weight: 0.1 },
    { value: active.has(date) ? 1 : 0, weight: 0.15 },
  ]);
}

export function calculateProductivityScore(data: UserDataSet, today: string, logs: LogsByHabit = groupLogs(data.habitLogs)): ProductivityScore {
  const active = activeDays(data);
  const first = [...active].sort()[0];
  const asOf = addDays(today, -1);
  if (!first || first > asOf) return { score: 0, trend: null, asOf, daily: [] };

  // Days before the user started count as 0, so the score has to be earned across the full 7/30-day windows.
  const daily = dateRange(addDays(asOf, -36), asOf).map((date) => ({ date, value: date < first ? 0 : dayIndex(data, date, logs, active) }));
  const at = (end: string) => {
    const avg = (days: number) => {
      const values = daily.filter((d) => d.date <= end && d.date > addDays(end, -days) && d.value !== null).map((d) => d.value as number);
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };
    const v = weighted([
      { value: avg(7), weight: 0.6 },
      { value: avg(30), weight: 0.4 },
    ]);
    return v === null ? null : Math.round(v * 100);
  };
  const score = at(asOf) ?? 0;
  const before = at(addDays(asOf, -7));
  return { score, trend: before === null ? null : score - before, asOf, daily: daily.slice(-30) };
}

/* ============================================================ ACHIEVEMENTS ============================================================ */

/** Achievements the user now qualifies for that aren't unlocked yet. Badges, not big XP: each adds only 10–25 XP. */
export function calculateAchievements(data: UserDataSet, report: AnalyticsReport, unlocked: Set<string>): AchievementDefinition[] {
  return newlyEarned(data, report, unlocked);
}

/* ============================================================ SUMMARY ============================================================ */

export interface Progression {
  xp: { total: number; today: number; ledger: XpEntry[] };
  level: LevelInfo;
  streaks: StreakSet;
  productivity: ProductivityScore;
  auraScore: number;
  achievementCount: number;
}

/** Everything the profile and dashboards display, from one place. */
export function buildProgression(
  data: UserDataSet,
  today: string,
  radar: RadarResult,
  badges: UnlockedBadge[],
  logs: LogsByHabit = groupLogs(data.habitLogs)
): Progression {
  const ledger = calculateXP(data, badges);
  const total = totalXp(ledger);
  return {
    xp: { total, today: totalXp(ledger.filter((e) => e.date === today)), ledger },
    level: calculateLevel(total),
    streaks: calculateStreaks(data, today, logs),
    productivity: calculateProductivityScore(data, today, logs),
    auraScore: auraScore(radar),
    achievementCount: badges.length,
  };
}
