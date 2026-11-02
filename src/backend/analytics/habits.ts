import { addDays, diffDays, isoFromTimestamp, weekStart } from '../core/dates';
import { PRIORITY_WEIGHT, type Habit, type HabitLog } from '../models';

export type LogsByHabit = Map<string, Set<string>>;

export function groupLogs(logs: HabitLog[]): LogsByHabit {
  const map: LogsByHabit = new Map();
  logs.forEach((l) => {
    const set = map.get(l.habitId) ?? new Set<string>();
    set.add(l.date);
    map.set(l.habitId, set);
  });
  return map;
}

function createdDate(habit: Habit): string {
  return isoFromTimestamp(habit.createdAt);
}

function weeksBetween(from: string, to: string): string[] {
  const weeks: string[] = [];
  for (let w = weekStart(from); w <= to; w = addDays(w, 7)) weeks.push(w);
  return weeks;
}

/** The date key a completion is stored under: the day for daily habits, the week's Monday for weekly ones. */
export function periodKey(habit: Habit, date: string): string {
  return habit.frequency === 'weekly' ? weekStart(date) : date;
}

export function isDone(habit: Habit, logs: LogsByHabit, today: string): boolean {
  const dates = logs.get(habit.id);
  if (!dates) return false;
  if (habit.frequency === 'daily') return dates.has(today);
  const start = weekStart(today);
  return [...dates].some((d) => d >= start && d <= today);
}

export function expectedOccurrences(habit: Habit, from: string, to: string): number {
  const start = createdDate(habit) > from ? createdDate(habit) : from;
  if (start > to) return 0;
  return habit.frequency === 'daily' ? diffDays(start, to) + 1 : weeksBetween(start, to).length;
}

export function completedOccurrences(habit: Habit, logs: LogsByHabit, from: string, to: string): number {
  const dates = [...(logs.get(habit.id) ?? [])].filter((d) => d >= from && d <= to);
  const count = habit.frequency === 'daily' ? dates.length : new Set(dates.map(weekStart)).size;
  return Math.min(count, expectedOccurrences(habit, from, to) || count);
}

/** Priority-weighted share of scheduled occurrences completed, or null when nothing was scheduled. */
export function completionRate(habits: Habit[], logs: LogsByHabit, from: string, to: string): number | null {
  let expected = 0;
  let done = 0;
  habits.forEach((h) => {
    const weight = PRIORITY_WEIGHT[h.priority];
    expected += expectedOccurrences(h, from, to) * weight;
    done += completedOccurrences(h, logs, from, to) * weight;
  });
  return expected ? Math.min(100, Math.round((done / expected) * 100)) : null;
}

/** Consecutive completed periods ending today (or the previous period, so an unfinished today doesn't reset it). */
export function habitStreak(habit: Habit, logs: LogsByHabit, today: string): number {
  const dates = logs.get(habit.id) ?? new Set<string>();
  const step = habit.frequency === 'weekly' ? 7 : 1;
  const keys = habit.frequency === 'weekly' ? new Set([...dates].map(weekStart)) : dates;
  let cursor = periodKey(habit, today);
  if (!keys.has(cursor)) cursor = addDays(cursor, -step);
  let streak = 0;
  while (keys.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -step);
  }
  return streak;
}

export function dayStreaks(logs: HabitLog[], today: string): { current: number; longest: number } {
  const days = new Set(logs.map((l) => l.date));
  if (days.size === 0) return { current: 0, longest: 0 };
  let cursor = days.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (days.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  [...days].sort().forEach((d) => {
    run = prev && diffDays(prev, d) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  });
  return { current, longest };
}

/** Share of active daily habits completed on each of the last `days` days (oldest first). */
export function dailyCompletionSeries(habits: Habit[], logs: LogsByHabit, today: string, days = 7): { date: string; percent: number | null }[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - days + 1);
    const due = habits.filter((h) => h.frequency === 'daily' && createdDate(h) <= date);
    if (!due.length) return { date, percent: null };
    const done = due.filter((h) => logs.get(h.id)?.has(date)).length;
    return { date, percent: Math.round((done / due.length) * 100) };
  });
}
