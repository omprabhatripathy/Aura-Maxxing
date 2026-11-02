import { addDays, diffDays, fromIso, isoFromTimestamp, weekStart } from '../core/dates';
import type { Goal, GoalProgress, JournalEntry, Mood, MoodLog } from '../models';

export interface MoodDayPoint {
  date: string;
  average: number | null;
  count: number;
}

/** Average mood score per day; days without logs stay null so charts show gaps, not invented values. */
export function moodSeries(moods: MoodLog[], today: string, days: number): MoodDayPoint[] {
  const byDay = new Map<string, number[]>();
  moods.forEach((m) => byDay.set(m.date, [...(byDay.get(m.date) ?? []), m.score]));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - days + 1);
    const scores = byDay.get(date) ?? [];
    return {
      date,
      average: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
      count: scores.length,
    };
  });
}

export function moodDistribution(moods: MoodLog[], from: string, to: string): { mood: Mood; count: number; percent: number }[] {
  const inRange = moods.filter((m) => m.date >= from && m.date <= to);
  const counts = new Map<Mood, number>();
  inRange.forEach((m) => counts.set(m.mood, (counts.get(m.mood) ?? 0) + 1));
  return [...counts.entries()]
    .map(([mood, count]) => ({ mood, count, percent: Math.round((count / inRange.length) * 100) }))
    .sort((a, b) => b.count - a.count);
}

export interface JournalStats {
  total: number;
  last7: number;
  last30: number;
  totalWords: number;
  avgWords: number;
  writingStreak: number;
  topWeekday: string | null;
  topTags: { tag: string; count: number }[];
  weekly: { week: string; entries: number; words: number }[];
}

export function journalStats(entries: JournalEntry[], today: string, weeks = 8): JournalStats {
  const days = new Set(entries.map((e) => e.date));
  let cursor = days.has(today) ? today : addDays(today, -1);
  let writingStreak = 0;
  while (days.has(cursor)) {
    writingStreak++;
    cursor = addDays(cursor, -1);
  }
  const weekdayCounts = new Array(7).fill(0);
  entries.forEach((e) => weekdayCounts[fromIso(e.date).getDay()]++);
  const maxWeekday = Math.max(...weekdayCounts);
  const tagCounts = new Map<string, number>();
  entries.forEach((e) => e.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)));
  const totalWords = entries.reduce((s, e) => s + e.wordCount, 0);
  const currentWeek = weekStart(today);
  const weekly = Array.from({ length: weeks }, (_, i) => {
    const week = addDays(currentWeek, (i - weeks + 1) * 7);
    const inWeek = entries.filter((e) => weekStart(e.date) === week);
    return { week, entries: inWeek.length, words: inWeek.reduce((s, e) => s + e.wordCount, 0) };
  });
  return {
    total: entries.length,
    last7: entries.filter((e) => diffDays(e.date, today) < 7).length,
    last30: entries.filter((e) => diffDays(e.date, today) < 30).length,
    totalWords,
    avgWords: entries.length ? Math.round(totalWords / entries.length) : 0,
    writingStreak,
    topWeekday: maxWeekday > 0 ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weekdayCounts.indexOf(maxWeekday)] : null,
    topTags: [...tagCounts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 5),
    weekly,
  };
}

export interface GoalStats {
  total: number;
  active: number;
  completed: number;
  overdue: number;
  successRate: number | null;
  milestonesDone: number;
  milestonesTotal: number;
  avgDaysToComplete: number | null;
  milestonesLast30: number;
}

export function goalStats(goals: Goal[], history: GoalProgress[], today: string): GoalStats {
  const completed = goals.filter((g) => g.status === 'complete');
  const durations = completed
    .filter((g) => g.completedAt)
    .map((g) => Math.max(0, Math.round((new Date(g.completedAt!).getTime() - new Date(g.createdAt).getTime()) / 86400000)));
  const cutoff = addDays(today, -29);
  return {
    total: goals.length,
    active: goals.length - completed.length,
    completed: completed.length,
    overdue: goals.filter((g) => g.status !== 'complete' && g.dueDate && g.dueDate < today).length,
    successRate: goals.length ? Math.round((completed.length / goals.length) * 100) : null,
    milestonesDone: goals.reduce((s, g) => s + g.milestonesComplete, 0),
    milestonesTotal: goals.reduce((s, g) => s + g.milestones, 0),
    avgDaysToComplete: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    milestonesLast30: history.filter((h) => h.type === 'milestone' && isoFromTimestamp(h.createdAt) >= cutoff).length,
  };
}
