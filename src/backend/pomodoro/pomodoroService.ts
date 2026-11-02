import { paths, type WriteOp } from '../db';
import { newId, nowIso } from '../core/ids';
import { todayIso } from '../core/dates';
import { activityOp, commit, deleteOp, setOp } from '../services/ops';
import { setTaskStatus } from '../todo/taskService';
import type { Task } from '../todo/types';
import { validatePomodoro } from './model';
import { FOCUS_CATEGORY_META, type PomodoroInput, type PomodoroSession } from './types';

/**
 * Saves a finished (or stopped) focus session. A completed session linked to a task credits its minutes and
 * marks the task done.
 */
export async function logPomodoroSession(uid: string, raw: PomodoroInput, linkedTask: Task | null = null, allTasks: Task[] = []): Promise<void> {
  const input = validatePomodoro(raw);
  if (input.actualMinutes < 1) return;
  const now = nowIso();
  const label = input.category === 'custom' && input.customCategory ? input.customCategory : FOCUS_CATEGORY_META[input.category].label;
  const ops: WriteOp[] = [
    setOp(paths.pomodoro(uid), newId(), {
      mode: input.mode,
      category: input.category,
      customCategory: input.customCategory ?? '',
      notes: input.notes ?? '',
      focusMinutes: input.focusMinutes,
      actualMinutes: input.actualMinutes,
      breakMinutes: input.breakMinutes,
      completed: input.completed,
      distractions: input.distractions ?? 0,
      taskId: linkedTask?.id ?? input.taskId ?? null,
      taskTitle: linkedTask?.title ?? input.taskTitle ?? '',
      startedAt: input.startedAt,
      endedAt: now,
      date: todayIso(),
      createdAt: now,
    }),
  ];
  if (input.completed) ops.push(activityOp(uid, 'focus-completed', `Focused ${Math.round(input.actualMinutes)} min · ${label}${linkedTask ? ` on “${linkedTask.title}”` : ''}`));
  if (linkedTask) ops.push(setOp(paths.tasks(uid), linkedTask.id, { focusMinutes: linkedTask.focusMinutes + Math.round(input.actualMinutes), updatedAt: now }, true));
  await commit(ops);
  if (linkedTask && input.completed && linkedTask.status !== 'done' && linkedTask.status !== 'archived') {
    await setTaskStatus(uid, { ...linkedTask, focusMinutes: linkedTask.focusMinutes + Math.round(input.actualMinutes) }, 'done', allTasks);
  }
}

export async function updatePomodoroSession(uid: string, session: PomodoroSession, patch: Pick<PomodoroSession, 'notes' | 'category' | 'customCategory'>): Promise<void> {
  validatePomodoro({ ...session, ...patch });
  await commit([setOp(paths.pomodoro(uid), session.id, { notes: patch.notes.trim(), category: patch.category, customCategory: patch.customCategory.trim() }, true)]);
}

export async function deletePomodoroSession(uid: string, session: PomodoroSession): Promise<void> {
  if (session.id.startsWith('legacy_')) {
    await commit([deleteOp(paths.focusSessions(uid), session.id.slice('legacy_'.length))]);
    return;
  }
  await commit([deleteOp(paths.pomodoro(uid), session.id)]);
}
