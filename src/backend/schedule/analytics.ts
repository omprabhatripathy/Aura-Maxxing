import { addDays, dateRange, fromIso } from '../core/dates';
import { toMinutes } from './model';
import type { ScheduleItem, ScheduleOccurrence } from './types';

/** Whether a (possibly recurring) item has an occurrence on `date`. */
export function occursOn(item: ScheduleItem, date: string): boolean {
  if (date < item.date || item.skippedDates.includes(date)) return false;
  const day = fromIso(date).getDay();
  switch (item.recurrence) {
    case 'none':
      return date === item.date;
    case 'daily':
      return true;
    case 'weekdays':
      return day >= 1 && day <= 5;
    case 'weekly':
      return day === fromIso(item.date).getDay();
  }
}

export function occurrencesOn(items: ScheduleItem[], date: string): ScheduleOccurrence[] {
  return items
    .filter((i) => occursOn(i, date))
    .map((item) => ({ item, date, start: item.start, end: item.end, minutes: toMinutes(item.end) - toMinutes(item.start), done: item.completedDates.includes(date) }))
    .sort((a, b) => a.start.localeCompare(b.start));
}

export interface PlanningStats {
  plannedMinutes: number;
  completedMinutes: number;
  /** 0–1, null when nothing was planned. */
  completionRate: number | null;
  plannedDays: number;
  blocks: number;
  doneBlocks: number;
}

/** Planned vs completed time for past/current days in [from, to]. */
export function planningStats(items: ScheduleItem[], from: string, to: string): PlanningStats {
  let plannedMinutes = 0;
  let completedMinutes = 0;
  let plannedDays = 0;
  let blocks = 0;
  let doneBlocks = 0;
  for (const date of dateRange(from, to)) {
    const occ = occurrencesOn(items, date);
    if (occ.length) plannedDays++;
    for (const o of occ) {
      blocks++;
      plannedMinutes += o.minutes;
      if (o.done) {
        doneBlocks++;
        completedMinutes += o.minutes;
      }
    }
  }
  return { plannedMinutes, completedMinutes, completionRate: plannedMinutes ? completedMinutes / plannedMinutes : null, plannedDays, blocks, doneBlocks };
}

/** Planning score 0–100: 70% completion of planned time + 30% planning consistency, over the last 7 days. */
export function planningScore(items: ScheduleItem[], today: string): number | null {
  const s = planningStats(items, addDays(today, -6), today);
  if (s.completionRate === null) return null;
  return Math.round((0.7 * s.completionRate + 0.3 * Math.min(1, s.plannedDays / 5)) * 100);
}

/** Overlapping blocks on a day get side-by-side lanes. */
export function layoutDay(occ: ScheduleOccurrence[]): (ScheduleOccurrence & { lane: number; lanes: number })[] {
  const out: (ScheduleOccurrence & { lane: number; lanes: number })[] = [];
  let group: (ScheduleOccurrence & { lane: number; lanes: number })[] = [];
  let groupEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...group.map((g) => g.lane + 1));
    group.forEach((g) => out.push({ ...g, lanes }));
    group = [];
  };
  for (const o of occ) {
    const start = toMinutes(o.start);
    if (start >= groupEnd && group.length) flush();
    const used = new Set(group.filter((g) => toMinutes(g.end) > start).map((g) => g.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    group.push({ ...o, lane, lanes: 1 });
    groupEnd = Math.max(groupEnd, toMinutes(o.end));
  }
  if (group.length) flush();
  return out;
}
