import { paths } from '../db';
import { nowIso, newId } from '../core/ids';
import { periodKey } from '../analytics/habits';
import { validateHabit, type HabitInput } from '../validators';
import type { Habit, HabitLog } from '../models';
import { activityOp, commit, deleteOp, setOp } from './ops';

export function habitLogId(habit: Habit, date: string): string {
  return `${habit.id}_${periodKey(habit, date)}`;
}

export async function createHabit(uid: string, input: HabitInput, existing: Habit[]): Promise<string> {
  const valid = validateHabit(input, existing.filter((h) => !h.archived).map((h) => h.label));
  const id = newId();
  const now = nowIso();
  await commit([
    setOp(paths.habits(uid), id, { ...valid, archived: false, createdAt: now, updatedAt: now }),
    activityOp(uid, 'habit-created', `Created habit: ${valid.label}`, id),
  ]);
  return id;
}

export async function updateHabit(uid: string, habit: Habit, input: HabitInput, existing: Habit[]): Promise<void> {
  const others = existing.filter((h) => h.id !== habit.id && !h.archived).map((h) => h.label);
  const valid = validateHabit(input, others);
  await commit([
    setOp(paths.habits(uid), habit.id, { ...valid, updatedAt: nowIso() }, true),
    activityOp(uid, 'habit-updated', `Updated habit: ${valid.label}`, habit.id),
  ]);
}

export async function setHabitArchived(uid: string, habit: Habit, archived: boolean): Promise<void> {
  await commit([
    setOp(paths.habits(uid), habit.id, { archived, updatedAt: nowIso() }, true),
    activityOp(uid, 'habit-archived', `${archived ? 'Archived' : 'Restored'} habit: ${habit.label}`, habit.id),
  ]);
}

/** Deletes the habit together with its completion history so analytics stay consistent. */
export async function deleteHabit(uid: string, habit: Habit, logs: HabitLog[]): Promise<void> {
  await commit([
    deleteOp(paths.habits(uid), habit.id),
    ...logs.filter((l) => l.habitId === habit.id).map((l) => deleteOp(paths.habitLogs(uid), l.id)),
    activityOp(uid, 'habit-deleted', `Deleted habit: ${habit.label}`, habit.id),
  ]);
}

/** Marks a habit done/undone for the period containing `date`. The activity entry shares the log's id so undo removes both. */
export async function setHabitCompletion(uid: string, habit: Habit, date: string, done: boolean): Promise<void> {
  const logId = habitLogId(habit, date);
  if (done) {
    await commit([
      setOp(paths.habitLogs(uid), logId, { habitId: habit.id, date, createdAt: nowIso() }),
      activityOp(uid, 'habit-completed', `Completed habit: ${habit.label}`, habit.id, `log_${logId}`),
    ]);
  } else {
    await commit([deleteOp(paths.habitLogs(uid), logId), deleteOp(paths.activityHistory(uid), `log_${logId}`)]);
  }
}
