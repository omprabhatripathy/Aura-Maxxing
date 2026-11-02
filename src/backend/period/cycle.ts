import { addDays, dateRange, diffDays } from '../core/dates';
import type { DailyLog } from './types';

export const MIN_PLAUSIBLE_CYCLE = 15;
export const MAX_PLAUSIBLE_CYCLE = 60;
const LUTEAL_DAYS = 14;
const CYCLES_FOR_AVERAGE = 6;

export interface PeriodEntry {
  start: string;
  end: string;
  days: string[];
}

export interface Cycle {
  index: number;
  start: string;
  periodEnd: string;
  periodLength: number;
  nextStart: string | null;
  length: number | null;
  completed: boolean;
  // Completed cycles outside the plausible range usually mean tracking gaps, so they are excluded from averages.
  outlier: boolean;
}

export interface CycleStats {
  completedCount: number;
  usableLengths: number[];
  averageCycle: number | null;
  shortest: number | null;
  longest: number | null;
  variation: number | null;
  averagePeriod: number | null;
}

export interface FertileWindow {
  start: string;
  end: string;
  ovulation: string;
}

export interface Prediction {
  averageCycle: number;
  averagePeriod: number;
  variation: number;
  basedOnCycles: number;
  nextStart: string;
  overdueSince: string | null;
  periods: { start: string; end: string }[];
  fertileWindows: FertileWindow[];
}

export type Phase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

/** Groups consecutive logged period days into period entries. */
export function derivePeriods(logs: DailyLog[]): PeriodEntry[] {
  const days = logs
    .filter((l) => l.period?.isPeriodDay)
    .map((l) => l.date)
    .sort();
  const periods: PeriodEntry[] = [];
  for (const day of days) {
    const last = periods[periods.length - 1];
    if (last && diffDays(last.end, day) === 1) {
      last.end = day;
      last.days.push(day);
    } else {
      periods.push({ start: day, end: day, days: [day] });
    }
  }
  return periods;
}

export function deriveCycles(periods: PeriodEntry[]): Cycle[] {
  return periods.map((p, i) => {
    const nextStart = periods[i + 1]?.start ?? null;
    const length = nextStart ? diffDays(p.start, nextStart) : null;
    return {
      index: i,
      start: p.start,
      periodEnd: p.end,
      periodLength: p.days.length,
      nextStart,
      length,
      completed: nextStart !== null,
      outlier: length !== null && (length < MIN_PLAUSIBLE_CYCLE || length > MAX_PLAUSIBLE_CYCLE),
    };
  });
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function computeCycleStats(cycles: Cycle[], today: string): CycleStats {
  const completed = cycles.filter((c) => c.completed);
  const usable = completed.filter((c) => !c.outlier).map((c) => c.length as number);
  // An ongoing period's length is not final yet.
  const finishedPeriods = cycles.filter((c) => c.periodEnd < today || c.completed).map((c) => c.periodLength);
  return {
    completedCount: completed.length,
    usableLengths: usable,
    averageCycle: usable.length ? Math.round(mean(usable) * 10) / 10 : null,
    shortest: usable.length ? Math.min(...usable) : null,
    longest: usable.length ? Math.max(...usable) : null,
    variation: usable.length ? Math.max(...usable) - Math.min(...usable) : null,
    averagePeriod: finishedPeriods.length ? Math.round(mean(finishedPeriods) * 10) / 10 : null,
  };
}

/** Estimates upcoming periods from the user's own completed cycles; null when there is not enough history. */
export function predictCycles(cycles: Cycle[], today: string, count = 3): Prediction | null {
  const usable = cycles.filter((c) => c.completed && !c.outlier).slice(-CYCLES_FOR_AVERAGE);
  const last = cycles[cycles.length - 1];
  if (!usable.length || !last) return null;

  const lengths = usable.map((c) => c.length as number);
  const averageCycle = Math.round(mean(lengths));
  const periodLengths = cycles.filter((c) => c.completed || c.periodEnd < today).map((c) => c.periodLength);
  const averagePeriod = Math.max(1, Math.round(periodLengths.length ? mean(periodLengths) : last.periodLength));

  const firstEstimate = addDays(last.start, averageCycle);
  const overdueSince = firstEstimate < today && last.periodEnd < firstEstimate ? firstEstimate : null;

  const periods: { start: string; end: string }[] = [];
  const fertileWindows: FertileWindow[] = [];
  for (let k = 1; periods.length < count && k < count + 24; k++) {
    const start = addDays(last.start, averageCycle * k);
    const end = addDays(start, averagePeriod - 1);
    if (end < today || start <= last.periodEnd) continue;
    periods.push({ start, end });

    const ovulation = addDays(start, -LUTEAL_DAYS);
    const prevPeriodEnd = k === 1 ? last.periodEnd : addDays(addDays(last.start, averageCycle * (k - 1)), averagePeriod - 1);
    const fertileStart = addDays(ovulation, -5);
    const fertileEnd = addDays(ovulation, 1);
    if (fertileEnd >= today && fertileStart > prevPeriodEnd) {
      fertileWindows.push({ start: fertileStart, end: fertileEnd, ovulation });
    }
  }

  return {
    averageCycle,
    averagePeriod,
    variation: Math.max(...lengths) - Math.min(...lengths),
    basedOnCycles: usable.length,
    nextStart: periods[0]?.start ?? firstEstimate,
    overdueSince,
    periods,
    fertileWindows,
  };
}

export function cycleForDate(date: string, cycles: Cycle[]): Cycle | null {
  for (let i = cycles.length - 1; i >= 0; i--) {
    if (cycles[i].start <= date) {
      const c = cycles[i];
      return c.nextStart && date >= c.nextStart ? null : c;
    }
  }
  return null;
}

export function cycleDay(date: string, cycles: Cycle[]): number | null {
  const c = cycleForDate(date, cycles);
  return c ? diffDays(c.start, date) + 1 : null;
}

/** Estimated phase for a date; null when it cannot be estimated from the user's data. */
export function phaseFor(date: string, cycles: Cycle[], prediction: Prediction | null): Phase | null {
  const c = cycleForDate(date, cycles);
  if (!c) return null;
  if (date <= c.periodEnd) return 'menstrual';
  if (c.outlier) return null;

  let nextStart = c.nextStart;
  if (!nextStart) {
    if (!prediction) return null;
    nextStart = addDays(c.start, prediction.averageCycle);
    if (date >= nextStart) return null;
  }
  const ovulation = addDays(nextStart, -LUTEAL_DAYS);
  if (date >= addDays(ovulation, -1) && date <= addDays(ovulation, 1)) return 'ovulation';
  return date < ovulation ? 'follicular' : 'luteal';
}

export function predictedDaySet(prediction: Prediction | null): Set<string> {
  const set = new Set<string>();
  prediction?.periods.forEach((p) => dateRange(p.start, p.end).forEach((d) => set.add(d)));
  return set;
}

export function fertileDaySet(prediction: Prediction | null): { fertile: Set<string>; ovulation: Set<string> } {
  const fertile = new Set<string>();
  const ovulation = new Set<string>();
  prediction?.fertileWindows.forEach((w) => {
    dateRange(w.start, w.end).forEach((d) => fertile.add(d));
    ovulation.add(w.ovulation);
  });
  return { fertile, ovulation };
}
