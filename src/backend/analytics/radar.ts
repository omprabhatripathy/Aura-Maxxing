import { addDays } from '../core/dates';
import type { MoodLog, RadarScores } from '../models';
import { completionRate, groupLogs } from './habits';
import {
  AREAS,
  auraScore,
  calculateRadarScore,
  calculateStreaks,
  calculateXP,
  totalXp,
  type RadarResult,
  type StreakSet,
  type UserDataSet,
} from '../services/progressionService';

export { AREAS };
export type { RadarResult, UserDataSet };

export const AREA_LABELS: Record<keyof RadarScores, string> = {
  discipline: 'Discipline',
  growth: 'Growth',
  wellness: 'Wellness',
  focus: 'Focus',
  mindfulness: 'Mindfulness',
  finance: 'Financial Wellness',
};

/** Plain-language explanation of what raises each area (mirrors calculateRadarScore). */
export const AREA_HOW_TO: Record<keyof RadarScores, string> = {
  discipline: 'Complete your habits on schedule every day, keep your activity streak alive and stay active 6+ days a week. Missed habits pull it down.',
  growth: 'Finish goals, keep learning habits going and reflect in your journal regularly.',
  wellness: 'Complete health and social habits (sleep, exercise, calls, meet-ups), check in on your mood most days and keep your mood trending up.',
  focus: 'Complete Pomodoro sessions regularly: more sessions, longer focus, focusing most days, weekly deep work and distraction-free streaks. Ticking off tasks does not count.',
  mindfulness: 'Journal often and in depth, write about what you are grateful for, log moods and keep mindset habits going.',
  finance: 'Save 20%+ of your income, stay within your budget and category limits, log expenses regularly and fund your saving goals.',
};

/** Score = quality of recent behaviour × maturity; shown in the score history. */
export const RADAR_RULE =
  'Each area = quality of your recent behaviour (rolling 7/30/90-day averages) × experience (days of activity in the last 90, with diminishing returns). ~10 active days reach about a third, 30 days about 70%, and the last stretch to 100 takes months of steady effort. The overall Aura averages your tracked areas and rewards a balanced radar.';

export interface AnalyticsReport {
  current: RadarResult;
  previous: RadarResult;
  overall: number;
  previousOverall: number;
  /** Percentage change per area vs. 30 days ago; null when there is no baseline. */
  improvement: Record<keyof RadarScores, number | null>;
  strongest: keyof RadarScores | null;
  weakest: keyof RadarScores | null;
  /** Daily activity streak (any meaningful action, one missed day per week forgiven). */
  streak: number;
  longestStreak: number;
  streaks: StreakSet;
  completionRate7d: number | null;
  wellbeing: number | null;
  /** XP from behaviour only (badges excluded), used by XP-based achievements. */
  behaviourXp: number;
  insights: string[];
}

function moodAverage(moods: MoodLog[], from: string, to: string): number | null {
  const values = moods.filter((m) => m.date >= from && m.date <= to).map((m) => m.score);
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export function buildReport(data: UserDataSet, today: string): AnalyticsReport {
  const logs = groupLogs(data.habitLogs);
  const current = calculateRadarScore(data, today, logs);
  const previous = calculateRadarScore(data, addDays(today, -30), logs);
  const covered = AREAS.filter((a) => current.coverage[a]);

  const improvement = {} as Record<keyof RadarScores, number | null>;
  AREAS.forEach((a) => {
    const prev = previous.scores[a];
    improvement[a] = previous.coverage[a] && current.coverage[a] && prev > 0 ? Math.round(((current.scores[a] - prev) / prev) * 100) : null;
  });

  const strongest = covered.length ? covered.reduce((a, b) => (current.scores[a] >= current.scores[b] ? a : b)) : null;
  const weakest = covered.length ? covered.reduce((a, b) => (current.scores[a] <= current.scores[b] ? a : b)) : null;
  const streaks = calculateStreaks(data, today, logs);
  const completionRate7d = completionRate(data.habits.filter((h) => !h.archived), logs, addDays(today, -6), today);
  const wellbeingAvg = moodAverage(data.moodLogs, addDays(today, -13), today);
  const wellbeing = wellbeingAvg === null ? null : Math.round(wellbeingAvg * 10);

  const insights: string[] = [];
  AREAS.forEach((a) => {
    if (!current.coverage[a] || !previous.coverage[a]) return;
    const delta = current.scores[a] - previous.scores[a];
    if (Math.abs(delta) >= 10) insights.push(`${AREA_LABELS[a]} ${delta > 0 ? 'grew' : 'dropped'} by ${Math.abs(delta)} points over the last 30 days.`);
  });
  if (weakest && strongest && weakest !== strongest) {
    insights.push(`Focus area: ${AREA_LABELS[weakest]} (${current.scores[weakest]}). ${AREA_HOW_TO[weakest]}`);
  }
  const young = covered.filter((a) => current.maturity[a] < 0.5 && current.quality[a] >= 0.7);
  if (young.length) {
    insights.push(`${young.map((a) => AREA_LABELS[a]).join(', ')}: great quality so far — keep it up for a few more weeks and the score will climb.`);
  }
  const missing = AREAS.filter((a) => !current.coverage[a]);
  if (missing.length && missing.length < AREAS.length) {
    insights.push(`${missing.map((a) => AREA_LABELS[a]).join(', ')} ${missing.length === 1 ? 'has' : 'have'} no data yet — a balanced Aura needs every area.`);
  }
  const thisWeekMood = moodAverage(data.moodLogs, addDays(today, -6), today);
  const lastWeekMood = moodAverage(data.moodLogs, addDays(today, -13), addDays(today, -7));
  if (thisWeekMood !== null && lastWeekMood !== null && Math.abs(thisWeekMood - lastWeekMood) >= 1) {
    insights.push(`Your average mood this week is ${thisWeekMood}/10, ${thisWeekMood > lastWeekMood ? 'up' : 'down'} from ${lastWeekMood} last week.`);
  }
  if (streaks.activity.current >= 3) insights.push(`You're on a ${streaks.activity.current}-day activity streak. Keep it going today.`);
  else if (data.habits.length && streaks.activity.current === 0) insights.push('No active streak — any habit, journal entry or check-in today starts a new one.');

  return {
    current,
    previous,
    overall: auraScore(current),
    previousOverall: auraScore(previous),
    improvement,
    strongest,
    weakest,
    streak: streaks.activity.current,
    longestStreak: streaks.activity.longest,
    streaks,
    completionRate7d,
    wellbeing,
    behaviourXp: totalXp(calculateXP(data)),
    insights,
  };
}
