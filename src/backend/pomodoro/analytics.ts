import { addDays, diffDays, weekStart } from '../core/dates';
import { FOCUS_CATEGORIES, type FocusCategory, type PomodoroSession } from './types';
import { clamp01, weightedFactors, type RadarFactor } from '../analytics/factors';

/** Sessions shorter than this don't count as real focus. */
export const MIN_COUNTED_MINUTES = 15;

export const countsAsFocus = (s: PomodoroSession) => s.completed && s.actualMinutes >= MIN_COUNTED_MINUTES;

const sumMinutes = (list: PomodoroSession[]) => list.reduce((s, x) => s + x.actualMinutes, 0);

/** Consecutive most-recent completed sessions with no logged distractions. */
export function distractionFreeStreak(sessions: PomodoroSession[]): number {
  let n = 0;
  for (const s of [...sessions].filter(countsAsFocus).sort((a, b) => b.startedAt.localeCompare(a.startedAt))) {
    if (s.distractions > 0) break;
    n++;
  }
  return n;
}

/**
 * Focus score 0–1 from the last 30 days (rolling):
 * 50% completed sessions · 20% average focus length · 15% consistency (days with focus) ·
 * 10% weekly deep-work hours · 5% distraction-free streak.
 */
export function focusQuality(sessions: PomodoroSession[], asOf: string): number | null {
  const factors = focusFactors(sessions, asOf);
  return factors ? weightedFactors(factors) : null;
}

/** The individual Focus factors behind `focusQuality`; null before the first session. */
export function focusFactors(sessions: PomodoroSession[], asOf: string): RadarFactor[] | null {
  const all = sessions.filter((s) => s.date <= asOf);
  if (!all.length) return null;
  const from = addDays(asOf, -29);
  const recent = all.filter((s) => countsAsFocus(s) && s.date >= from);
  const avg = recent.length ? sumMinutes(recent) / recent.length : 0;
  const days = new Set(recent.map((s) => s.date)).size;
  const deepHours = Math.round((sumMinutes(recent.filter((s) => s.actualMinutes >= 45)) / 60 / 4.3) * 10) / 10;
  const calm = distractionFreeStreak(recent);
  return [
    { key: 'sessions', label: 'Completed sessions', value: clamp01(recent.length / 40), weight: 0.5, current: recent.length, target: 40, detail: `${recent.length} of 40 sessions in 30 days` },
    { key: 'length', label: 'Average session length', value: clamp01(avg / 50), weight: 0.2, current: Math.round(avg), target: 50, detail: `${Math.round(avg)} min average (full at 50)` },
    { key: 'consistency', label: 'Focus consistency', value: clamp01(days / 20), weight: 0.15, current: days, target: 20, detail: `${days} of 20 days with focus` },
    { key: 'deepWork', label: 'Weekly deep work', value: clamp01(deepHours / 6), weight: 0.1, current: deepHours, target: 6, detail: `${deepHours} h/week in 45+ min sessions (full at 6)` },
    { key: 'calm', label: 'Distraction-free streak', value: clamp01(calm / 10), weight: 0.05, current: calm, target: 10, detail: `${calm} distraction-free sessions in a row (full at 10)` },
  ];
}

export interface PomodoroStats {
  sessionsCompleted: number;
  todayMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
  currentStreak: number;
  longestStreak: number;
  /** 0–100 (same quality formula as the Focus radar, before experience is applied). */
  focusScore: number;
  byCategory: { category: FocusCategory; minutes: number; sessions: number }[];
  last7: { date: string; minutes: number }[];
  averageMinutes: number;
}

export function pomodoroStats(sessions: PomodoroSession[], today: string): PomodoroStats {
  const done = sessions.filter(countsAsFocus);
  const days = new Set(done.map((s) => s.date));
  let cursor = days.has(today) ? today : addDays(today, -1);
  let currentStreak = 0;
  while (days.has(cursor)) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }
  let longestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of [...days].sort()) {
    run = prev && diffDays(prev, d) === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prev = d;
  }
  const monthPrefix = today.slice(0, 7);
  return {
    sessionsCompleted: done.length,
    todayMinutes: sumMinutes(done.filter((s) => s.date === today)),
    weekMinutes: sumMinutes(done.filter((s) => s.date >= weekStart(today) && s.date <= today)),
    monthMinutes: sumMinutes(done.filter((s) => s.date.startsWith(monthPrefix))),
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    focusScore: Math.round((focusQuality(sessions, today) ?? 0) * 100),
    byCategory: FOCUS_CATEGORIES.map((category) => {
      const list = done.filter((s) => s.category === category);
      return { category, minutes: sumMinutes(list), sessions: list.length };
    }).filter((c) => c.sessions > 0),
    last7: Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((date) => ({ date, minutes: sumMinutes(done.filter((s) => s.date === date)) })),
    averageMinutes: done.length ? Math.round(sumMinutes(done) / done.length) : 0,
  };
}

export const formatMinutes = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};
