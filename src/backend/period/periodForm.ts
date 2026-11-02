import { addDays, dateRange, diffDays, isValidIso } from '../core/dates';
import type { PeriodEntry } from './cycle';
import type { LogChanges } from './store';
import { emptyLog, type DailyLog, type Flow, type SymptomEntry } from './types';

export const MAX_PERIOD_DAYS = 20;

export interface PeriodDayInput {
  flow: Flow;
  pain: number;
}

export function validatePeriodRange(
  start: string,
  end: string,
  today: string,
  periods: PeriodEntry[],
  editing: PeriodEntry | null
): string | null {
  if (!isValidIso(start)) return 'Choose a valid start date.';
  if (!isValidIso(end)) return 'Choose a valid end date.';
  if (start > today) return "The start date can't be in the future.";
  if (end > today) return "The end date can't be in the future. Mark the period as ongoing instead.";
  if (end < start) return 'The end date must be on or after the start date.';
  if (diffDays(start, end) + 1 > MAX_PERIOD_DAYS) return `A single period entry can be at most ${MAX_PERIOD_DAYS} days.`;

  // Touching another period would silently merge the two entries, so treat adjacency as a conflict too.
  const conflict = periods.find(
    (p) => p.start !== editing?.start && start <= addDays(p.end, 1) && end >= addDays(p.start, -1)
  );
  if (conflict) return 'These dates overlap or touch an existing period. Edit that period instead.';
  return null;
}

/** Builds the per-day upserts/deletes for saving a period range while preserving each day's other data. */
export function buildPeriodChanges(params: {
  start: string;
  end: string;
  days: Record<string, PeriodDayInput>;
  editing: PeriodEntry | null;
  logsByDate: Map<string, DailyLog>;
  symptoms: SymptomEntry[];
  notes: string;
}): LogChanges {
  const { start, end, days, editing, logsByDate, symptoms, notes } = params;
  const newDays = new Set(dateRange(start, end));
  const upserts: DailyLog[] = [];

  for (const date of newDays) {
    const existing = logsByDate.get(date) ?? emptyLog(date);
    const input = days[date] ?? { flow: 'medium', pain: 0 };
    const mergedSymptoms = [...existing.symptoms];
    symptoms.forEach((s) => {
      const i = mergedSymptoms.findIndex((m) => m.name === s.name);
      if (i >= 0) mergedSymptoms[i] = s;
      else mergedSymptoms.push(s);
    });
    upserts.push({
      ...existing,
      period: { isPeriodDay: true, flow: input.flow, pain: Math.min(10, Math.max(0, Math.round(input.pain))) },
      symptoms: mergedSymptoms,
      notes: existing.notes || notes.trim() || undefined,
    });
  }

  for (const date of editing?.days ?? []) {
    if (newDays.has(date)) continue;
    const existing = logsByDate.get(date);
    if (existing) upserts.push({ ...existing, period: undefined });
  }

  return { upserts, deletes: [] };
}

/** Removes the period marker from every day of an entry, keeping moods, symptoms and notes. */
export function buildPeriodDeletion(period: PeriodEntry, logsByDate: Map<string, DailyLog>): LogChanges {
  const upserts = period.days
    .map((d) => logsByDate.get(d))
    .filter((l): l is DailyLog => Boolean(l))
    .map((l) => ({ ...l, period: undefined }));
  return { upserts, deletes: [] };
}
