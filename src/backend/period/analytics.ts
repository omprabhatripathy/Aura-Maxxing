import { addDays, diffDays, formatDate } from '../core/dates';
import { phaseFor, type Cycle, type CycleStats, type PeriodEntry, type Phase, type Prediction } from './cycle';
import { CYCLE_MOOD_LABEL, CYCLE_MOOD_SCORE, type CycleMood, type DailyLog, type Flow } from './types';

export type RangeKey = 'week' | 'month' | 'cycle' | '90days' | 'all';

export function rangeBounds(range: RangeKey, today: string, cycles: Cycle[]): { from: string; to: string } {
  switch (range) {
    case 'week':
      return { from: addDays(today, -6), to: today };
    case 'month':
      return { from: addDays(today, -29), to: today };
    case '90days':
      return { from: addDays(today, -89), to: today };
    case 'cycle': {
      const current = cycles[cycles.length - 1];
      return { from: current ? current.start : addDays(today, -29), to: today };
    }
    default:
      return { from: '0000-01-01', to: today };
  }
}

function inRange(log: DailyLog, from: string, to: string): boolean {
  return log.date >= from && log.date <= to;
}

/** Average valence of the moods selected that day (1–5), or null when no mood was logged. */
export function moodScore(log: DailyLog | undefined): number | null {
  if (!log || log.moods.length === 0) return null;
  const total = log.moods.reduce((sum, m) => sum + CYCLE_MOOD_SCORE[m], 0);
  return Math.round((total / log.moods.length) * 10) / 10;
}

export interface MoodDistribution {
  slices: { mood: CycleMood; count: number; percent: number; dates: string[] }[];
  totalSelections: number;
  daysLogged: number;
}

export function moodDistribution(logs: DailyLog[], from: string, to: string): MoodDistribution {
  const map = new Map<CycleMood, string[]>();
  let daysLogged = 0;
  for (const log of logs) {
    if (!inRange(log, from, to) || log.moods.length === 0) continue;
    daysLogged++;
    log.moods.forEach((m) => map.set(m, [...(map.get(m) ?? []), log.date]));
  }
  const totalSelections = [...map.values()].reduce((sum, d) => sum + d.length, 0);
  const slices = [...map.entries()]
    .map(([mood, dates]) => ({
      mood,
      count: dates.length,
      percent: totalSelections ? Math.round((dates.length / totalSelections) * 1000) / 10 : 0,
      dates: dates.sort(),
    }))
    .sort((a, b) => b.count - a.count);
  return { slices, totalSelections, daysLogged };
}

export interface SymptomFrequency {
  name: string;
  days: { date: string; severity: number }[];
}

export function symptomFrequency(logs: DailyLog[], from: string, to: string): SymptomFrequency[] {
  const map = new Map<string, { date: string; severity: number }[]>();
  for (const log of logs) {
    if (!inRange(log, from, to)) continue;
    log.symptoms.forEach((s) => map.set(s.name, [...(map.get(s.name) ?? []), { date: log.date, severity: s.severity }]));
  }
  return [...map.entries()]
    .map(([name, days]) => ({ name, days: days.sort((a, b) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => b.days.length - a.days.length || a.name.localeCompare(b.name));
}

export interface TrendPoint {
  day: number;
  date: string;
  score: number | null;
  moods: CycleMood[];
  flow: Flow | null;
}

export function moodTrendForCycle(cycle: Cycle, logsByDate: Map<string, DailyLog>, prediction: Prediction | null, today: string): TrendPoint[] {
  let length = cycle.length;
  if (length === null) {
    const elapsed = diffDays(cycle.start, today) + 1;
    length = Math.max(elapsed, prediction?.averageCycle ?? elapsed);
  }
  return Array.from({ length }, (_, i) => {
    const date = addDays(cycle.start, i);
    const log = logsByDate.get(date);
    return {
      day: i + 1,
      date,
      score: moodScore(log),
      moods: log?.moods ?? [],
      flow: log?.period?.isPeriodDay ? log.period.flow : null,
    };
  });
}

export const PHASES: Phase[] = ['menstrual', 'follicular', 'ovulation', 'luteal'];

export const PHASE_LABEL: Record<Phase, string> = {
  menstrual: 'Menstrual',
  follicular: 'Follicular (est.)',
  ovulation: 'Around ovulation (est.)',
  luteal: 'Luteal (est.)',
};

export function phaseMoodAverages(logs: DailyLog[], cycles: Cycle[], prediction: Prediction | null): Record<Phase, { average: number | null; count: number }> {
  const buckets: Record<Phase, number[]> = { menstrual: [], follicular: [], ovulation: [], luteal: [] };
  for (const log of logs) {
    const score = moodScore(log);
    if (score === null) continue;
    const phase = phaseFor(log.date, cycles, prediction);
    if (phase) buckets[phase].push(score);
  }
  const result = {} as Record<Phase, { average: number | null; count: number }>;
  PHASES.forEach((p) => {
    const values = buckets[p];
    result[p] = {
      average: values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null,
      count: values.length,
    };
  });
  return result;
}

export const PAIN_KEY = 'Period pain';

export interface CorrelationPoint {
  date: string;
  mood: number | null;
  severity: number | null;
}

export interface CorrelationResult {
  points: CorrelationPoint[];
  avgMoodWith: number | null;
  avgMoodWithout: number | null;
  daysWith: number;
  daysWithout: number;
}

function symptomSeverity(log: DailyLog, symptom: string): number | null {
  if (symptom === PAIN_KEY) return log.period?.isPeriodDay ? log.period.pain : null;
  return log.symptoms.find((s) => s.name === symptom)?.severity ?? null;
}

export function moodSymptomCorrelation(logs: DailyLog[], symptom: string, from: string, to: string): CorrelationResult {
  const points: CorrelationPoint[] = [];
  const withSymptom: number[] = [];
  const withoutSymptom: number[] = [];
  for (const log of [...logs].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!inRange(log, from, to)) continue;
    const mood = moodScore(log);
    const severity = symptomSeverity(log, symptom);
    if (mood === null && severity === null) continue;
    points.push({ date: log.date, mood, severity });
    if (mood !== null) (severity !== null && severity > 0 ? withSymptom : withoutSymptom).push(mood);
  }
  const avg = (v: number[]) => (v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null);
  return {
    points,
    avgMoodWith: avg(withSymptom),
    avgMoodWithout: avg(withoutSymptom),
    daysWith: withSymptom.length,
    daysWithout: withoutSymptom.length,
  };
}

/** Data-backed, cautiously worded insights. Returns nothing for patterns the data cannot support. */
export function generateInsights(
  logs: DailyLog[],
  periods: PeriodEntry[],
  cycles: Cycle[],
  stats: CycleStats,
  today: string
): string[] {
  const insights: string[] = [];
  const byDate = new Map(logs.map((l) => [l.date, l]));

  const lastPeriod = [...periods].reverse().find((p) => p.end < today) ?? periods[periods.length - 1];
  if (lastPeriod) {
    const counts = new Map<string, number>();
    lastPeriod.days.forEach((d) => byDate.get(d)?.symptoms.forEach((s) => counts.set(s.name, (counts.get(s.name) ?? 0) + 1)));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) {
      insights.push(`You logged ${top[0].toLowerCase()} on ${top[1]} day${top[1] === 1 ? '' : 's'} during your period starting ${formatDate(lastPeriod.start)}.`);
    }
  }

  const recent = symptomFrequency(logs, addDays(today, -29), today);
  if (recent.length && recent[0].days.length >= 3) {
    insights.push(`${recent[0].name} was your most frequently logged symptom in the last 30 days (${recent[0].days.length} days).`);
  }

  if (stats.usableLengths.length >= 3 && stats.variation !== null) {
    const recentLengths = stats.usableLengths.slice(-4);
    const variation = Math.max(...recentLengths) - Math.min(...recentLengths);
    insights.push(`Your cycle length varied by ${variation} day${variation === 1 ? '' : 's'} across your last ${recentLengths.length} completed cycles.`);
  }

  const lastCompleted = [...cycles].reverse().find((c) => c.completed && !c.outlier);
  if (lastCompleted && lastCompleted.length && lastCompleted.length > 12) {
    const late: number[] = [];
    const mid: number[] = [];
    for (let i = 0; i < lastCompleted.length; i++) {
      const date = addDays(lastCompleted.start, i);
      const score = moodScore(byDate.get(date));
      if (score === null) continue;
      if (i >= lastCompleted.length - 5) late.push(score);
      else if (i >= 5) mid.push(score);
    }
    if (late.length >= 2 && mid.length >= 2) {
      const lateAvg = late.reduce((a, b) => a + b, 0) / late.length;
      const midAvg = mid.reduce((a, b) => a + b, 0) / mid.length;
      if (Math.abs(lateAvg - midAvg) >= 0.5) {
        insights.push(
          `Your average mood score was ${lateAvg < midAvg ? 'lower' : 'higher'} during the final days of your previous cycle (${lateAvg.toFixed(1)} vs ${midAvg.toFixed(1)} mid-cycle).`
        );
      }
    }
  }

  const periodScores: number[] = [];
  const otherScores: number[] = [];
  logs.forEach((l) => {
    const score = moodScore(l);
    if (score === null) return;
    (l.period?.isPeriodDay ? periodScores : otherScores).push(score);
  });
  if (periodScores.length >= 3 && otherScores.length >= 3) {
    const p = periodScores.reduce((a, b) => a + b, 0) / periodScores.length;
    const o = otherScores.reduce((a, b) => a + b, 0) / otherScores.length;
    if (Math.abs(p - o) >= 0.5) {
      insights.push(`Your data suggests your mood ratings tend to be ${p < o ? 'lower' : 'higher'} on period days (${p.toFixed(1)} vs ${o.toFixed(1)}).`);
    }
  }

  return insights;
}

export function describeMoods(moods: CycleMood[]): string {
  return moods.map((m) => CYCLE_MOOD_LABEL[m]).join(', ');
}
