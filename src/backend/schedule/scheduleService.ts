import { paths } from '../db';
import { newId, nowIso } from '../core/ids';
import { commit, deleteOp, setOp } from '../services/ops';
import { validateSchedule } from './model';
import type { ScheduleInput, ScheduleItem } from './types';

export async function createScheduleItem(uid: string, raw: ScheduleInput): Promise<void> {
  const input = validateSchedule(raw);
  const now = nowIso();
  await commit([setOp(paths.schedule(uid), newId(), { ...input, completedDates: [], skippedDates: [], createdAt: now, updatedAt: now })]);
}

export async function updateScheduleItem(uid: string, item: ScheduleItem, raw: ScheduleInput): Promise<void> {
  const input = validateSchedule(raw);
  await commit([setOp(paths.schedule(uid), item.id, { ...input, updatedAt: nowIso() }, true)]);
}

/** Drag-and-drop: moves a one-off block, or just this occurrence of a recurring one (split into a one-off). */
export async function moveScheduleItem(uid: string, item: ScheduleItem, fromDate: string, toDate: string, start: string, end: string): Promise<void> {
  const now = nowIso();
  if (item.recurrence === 'none') {
    validateSchedule({ ...item, date: toDate, start, end });
    await commit([setOp(paths.schedule(uid), item.id, { date: toDate, start, end, updatedAt: now }, true)]);
    return;
  }
  const single = validateSchedule({ ...item, date: toDate, start, end, recurrence: 'none' });
  await commit([
    setOp(paths.schedule(uid), item.id, { skippedDates: [...new Set([...item.skippedDates, fromDate])], updatedAt: now }, true),
    setOp(paths.schedule(uid), newId(), { ...single, completedDates: item.completedDates.includes(fromDate) ? [toDate] : [], skippedDates: [], createdAt: now, updatedAt: now }),
  ]);
}

export async function setScheduleDone(uid: string, item: ScheduleItem, date: string, done: boolean): Promise<void> {
  const completedDates = done ? [...new Set([...item.completedDates, date])] : item.completedDates.filter((d) => d !== date);
  await commit([setOp(paths.schedule(uid), item.id, { completedDates, updatedAt: nowIso() }, true)]);
}

/** Deletes the whole series, or only one occurrence of a recurring block. */
export async function deleteScheduleItem(uid: string, item: ScheduleItem, onlyDate?: string): Promise<void> {
  if (onlyDate && item.recurrence !== 'none') {
    await commit([setOp(paths.schedule(uid), item.id, { skippedDates: [...new Set([...item.skippedDates, onlyDate])], updatedAt: nowIso() }, true)]);
    return;
  }
  await commit([deleteOp(paths.schedule(uid), item.id)]);
}
