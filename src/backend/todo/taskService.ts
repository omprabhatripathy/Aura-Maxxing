import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { paths, type DocData, type WriteOp } from '../db';
import { storage } from '../firebase/config';
import { ValidationError } from '../core/errors';
import { newId, nowIso } from '../core/ids';
import { todayIso } from '../core/dates';
import { commit, deleteOp, setOp } from '../services/ops';
import { validateTask } from './model';
import { isCompleted, nextOccurrence, unmetDependencies, type TaskReminder } from './analytics';
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  type Attachment,
  type Subtask,
  type Task,
  type TaskActivityType,
  type TaskDayStats,
  type TaskInput,
  type TaskStatus,
} from './types';

/** Splits the requested status from the persisted fields; status changes go through setTaskStatus. */
function splitStatus(input: TaskInput): { status: TaskInput['status']; fields: Omit<TaskInput, 'status'> } {
  const { status, ...fields } = input;
  return { status, fields };
}

function activity(uid: string, task: Pick<Task, 'id' | 'title'>, type: TaskActivityType, message: string, from: string | null = null, to: string | null = null): WriteOp {
  return setOp(paths.taskActivity(uid), newId(), { taskId: task.id, taskTitle: task.title, type, from, to, message, createdAt: nowIso() });
}

function assertNoCycle(taskId: string, dependsOn: string[], all: Task[]) {
  const byId = new Map(all.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const stack = [...dependsOn];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === taskId) throw new ValidationError('That dependency would create a loop.', 'dependsOn');
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(byId.get(id)?.dependsOn ?? []));
  }
}

export function newSubtask(title: string): Subtask {
  return { id: newId(), title: title.trim(), done: false, completedAt: null };
}

export async function createTask(uid: string, input: TaskInput, all: Task[] = []): Promise<string> {
  const valid = validateTask(input);
  const id = newId();
  assertNoCycle(id, valid.dependsOn, all);
  const now = nowIso();
  const { status: requested, fields } = splitStatus(valid);
  const status: TaskStatus = requested && requested !== 'archived' ? requested : 'todo';
  await commit([
    setOp(paths.tasks(uid), id, {
      ...fields,
      status,
      archivedFrom: null,
      recurrenceNextId: null,
      attachments: [],
      focusMinutes: 0,
      startedAt: status === 'in-progress' ? now : null,
      completedAt: status === 'done' ? now : null,
      createdAt: now,
      updatedAt: now,
    }),
    activity(uid, { id, title: valid.title }, 'created', `Created “${valid.title}”`),
  ]);
  return id;
}

/** Saves edits; priority changes get their own timeline entry. */
export async function updateTask(uid: string, task: Task, input: TaskInput, all: Task[]): Promise<void> {
  const valid = validateTask(input);
  assertNoCycle(task.id, valid.dependsOn, all);
  const { fields } = splitStatus(valid);
  const ops: WriteOp[] = [setOp(paths.tasks(uid), task.id, { ...fields, updatedAt: nowIso() }, true)];
  if (valid.priority !== task.priority) {
    ops.push(activity(uid, task, 'priority', `Priority ${PRIORITY_LABEL[task.priority]} → ${PRIORITY_LABEL[valid.priority]}`, task.priority, valid.priority));
  }
  const changed = (['title', 'description', 'notes', 'dueDate', 'dueTime', 'estimateMinutes', 'recurrence'] as const).some((k) => valid[k] !== task[k]) ||
    JSON.stringify([valid.tags, valid.subtasks, valid.dependsOn, valid.goalId, valid.habitId]) !== JSON.stringify([task.tags, task.subtasks, task.dependsOn, task.goalId, task.habitId]);
  if (changed) ops.push(activity(uid, { id: task.id, title: valid.title }, 'edited', `Edited “${valid.title}”`));
  await commit(ops);
}

/**
 * Moves a task between states. Completing records completion time and spawns the next occurrence of repeating tasks;
 * leaving "done" reopens it. Tasks with unfinished dependencies can't be started or completed.
 */
export async function setTaskStatus(uid: string, task: Task, status: TaskStatus, all: Task[]): Promise<void> {
  if (task.status === status) return;
  const byId = new Map(all.map((t) => [t.id, t]));
  const waiting = unmetDependencies(task, byId);
  if ((status === 'in-progress' || status === 'done') && waiting.length) {
    throw new ValidationError(`Waiting on “${waiting[0].title}”${waiting.length > 1 ? ` and ${waiting.length - 1} more` : ''}.`);
  }
  const now = nowIso();
  const patch: DocData = { status, updatedAt: now };
  const ops: WriteOp[] = [];

  if (status === 'archived') {
    patch.archivedFrom = task.status;
    ops.push(activity(uid, task, 'archived', `Archived “${task.title}”`, task.status, status));
  } else if (task.status === 'archived') {
    patch.archivedFrom = null;
    ops.push(activity(uid, task, 'restored', `Restored “${task.title}” to ${STATUS_LABEL[status]}`, task.status, status));
  }

  if (status === 'done') {
    patch.completedAt = now;
    if (task.status !== 'archived') ops.push(activity(uid, task, 'completed', `Completed “${task.title}”`, task.status, status));
    if (task.recurrence !== 'none' && task.dueDate && !task.recurrenceNextId) {
      const nextId = newId();
      patch.recurrenceNextId = nextId;
      ops.push(
        setOp(paths.tasks(uid), nextId, {
          title: task.title,
          description: task.description,
          notes: task.notes,
          priority: task.priority,
          tags: task.tags,
          dueDate: nextOccurrence(task.dueDate, task.recurrence),
          dueTime: task.dueTime,
          estimateMinutes: task.estimateMinutes,
          recurrence: task.recurrence,
          recurrenceNextId: null,
          subtasks: task.subtasks.map((s) => ({ ...s, done: false, completedAt: null })),
          attachments: [],
          dependsOn: [],
          goalId: task.goalId,
          habitId: task.habitId,
          status: 'todo',
          archivedFrom: null,
          focusMinutes: 0,
          startedAt: null,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
        }),
        activity(uid, { id: nextId, title: task.title }, 'created', `Scheduled next “${task.title}” (repeats ${task.recurrence})`)
      );
    }
  } else if (status !== 'archived') {
    if (isCompleted(task)) {
      patch.completedAt = null;
      ops.push(activity(uid, task, 'reopened', `Reopened “${task.title}”`, task.status, status));
    } else if (task.status !== 'archived') {
      ops.push(activity(uid, task, 'status', `${STATUS_LABEL[task.status]} → ${STATUS_LABEL[status]}`, task.status, status));
    }
    if (status === 'in-progress' && !task.startedAt) patch.startedAt = now;
  }

  ops.unshift(setOp(paths.tasks(uid), task.id, patch, true));
  await commit(ops);
}

export async function restoreTask(uid: string, task: Task, all: Task[]): Promise<void> {
  const target = task.archivedFrom && task.archivedFrom !== 'archived' ? task.archivedFrom : task.completedAt ? 'done' : 'todo';
  await setTaskStatus(uid, task, target, all);
}

/** Toggles a subtask; checking the first one moves a to-do task into progress. */
export async function toggleSubtask(uid: string, task: Task, subtaskId: string): Promise<void> {
  const now = nowIso();
  const subtasks = task.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done, completedAt: s.done ? null : now } : s));
  const changed = subtasks.find((s) => s.id === subtaskId);
  if (!changed) return;
  const patch: DocData = { subtasks, updatedAt: now };
  const ops: WriteOp[] = [];
  if (changed.done && task.status === 'todo') {
    patch.status = 'in-progress';
    patch.startedAt = task.startedAt ?? now;
    ops.push(activity(uid, task, 'status', 'To Do → In Progress', 'todo', 'in-progress'));
  }
  ops.unshift(setOp(paths.tasks(uid), task.id, patch, true));
  ops.push(activity(uid, task, 'subtask', `${changed.done ? 'Checked' : 'Unchecked'} “${changed.title}”`));
  await commit(ops);
}

export async function addSubtasks(uid: string, task: Task, titles: string[]): Promise<void> {
  const fresh = titles.map((t) => t.trim()).filter(Boolean).map(newSubtask);
  if (!fresh.length) return;
  if (task.subtasks.length + fresh.length > 50) throw new ValidationError('Up to 50 subtasks per task.');
  await commit([
    setOp(paths.tasks(uid), task.id, { subtasks: [...task.subtasks, ...fresh], updatedAt: nowIso() }, true),
    activity(uid, task, 'subtask', `Added ${fresh.length} subtask${fresh.length === 1 ? '' : 's'}`),
  ]);
}

export async function deleteTask(uid: string, task: Task, all: Task[]): Promise<void> {
  if (storage) await Promise.all(task.attachments.filter((a) => a.path).map((a) => deleteObject(ref(storage!, a.path!)).catch(() => undefined)));
  const ops: WriteOp[] = [deleteOp(paths.tasks(uid), task.id), activity(uid, task, 'deleted', `Deleted “${task.title}”`)];
  // Drop the deleted task from other tasks' dependency lists.
  all.filter((t) => t.dependsOn.includes(task.id)).forEach((t) => ops.push(setOp(paths.tasks(uid), t.id, { dependsOn: t.dependsOn.filter((d) => d !== task.id) }, true)));
  await commit(ops);
}

/* ---------------- Focus ---------------- */

export interface FocusResult {
  task: Task | null;
  mode: 'free' | 'pomodoro';
  startedAt: string;
  minutes: number;
  distractions: number;
}

/** Records a focus session and credits the minutes to the task (starting it if its dependencies allow). */
export async function logFocusSession(uid: string, result: FocusResult, all: Task[] = []): Promise<void> {
  const minutes = Math.round(result.minutes);
  if (minutes < 1) return;
  const now = nowIso();
  const ops: WriteOp[] = [
    setOp(paths.focusSessions(uid), newId(), {
      taskId: result.task?.id ?? null,
      taskTitle: result.task?.title ?? 'Free focus',
      mode: result.mode,
      startedAt: result.startedAt,
      endedAt: now,
      minutes,
      distractions: result.distractions,
      date: todayIso(),
    }),
  ];
  const task = result.task;
  if (task) {
    const patch: DocData = { focusMinutes: task.focusMinutes + minutes, updatedAt: now };
    if (task.status === 'todo' && !unmetDependencies(task, new Map(all.map((t) => [t.id, t]))).length) {
      patch.status = 'in-progress';
      patch.startedAt = task.startedAt ?? result.startedAt;
      ops.push(activity(uid, task, 'status', 'To Do → In Progress', 'todo', 'in-progress'));
    }
    ops.push(setOp(paths.tasks(uid), task.id, patch, true), activity(uid, task, 'focus', `Focused ${minutes} min on “${task.title}”`));
  }
  await commit(ops);
}

/* ---------------- Attachments ---------------- */

const MAX_CLOUD_BYTES = 10 * 1024 * 1024;
const MAX_LOCAL_BYTES = 300 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Uploads to Firebase Storage (or stores a small data URL in local mode) and attaches it to the task. */
export async function addAttachment(uid: string, task: Task, file: File): Promise<void> {
  if (task.attachments.length >= 10) throw new ValidationError('Up to 10 attachments per task.');
  const limit = storage ? MAX_CLOUD_BYTES : MAX_LOCAL_BYTES;
  if (file.size > limit) throw new ValidationError(`Files must be ${storage ? '10 MB' : '300 KB (local mode)'} or smaller.`);
  const id = newId();
  const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-80) || 'file';
  let url: string;
  let path: string | null = null;
  if (storage) {
    path = `users/${uid}/tasks/${task.id}/${id}-${safeName}`;
    const objectRef = ref(storage, path);
    await uploadBytes(objectRef, file, { contentType: file.type || 'application/octet-stream' });
    url = await getDownloadURL(objectRef);
  } else {
    url = await fileToDataUrl(file);
  }
  const attachment: Attachment = { id, name: file.name.slice(0, 120), size: file.size, type: file.type, url, path };
  await commit([
    setOp(paths.tasks(uid), task.id, { attachments: [...task.attachments, attachment], updatedAt: nowIso() }, true),
    activity(uid, task, 'edited', `Attached ${attachment.name}`),
  ]);
}

export async function removeAttachment(uid: string, task: Task, attachment: Attachment): Promise<void> {
  if (storage && attachment.path) await deleteObject(ref(storage, attachment.path)).catch(() => undefined);
  await commit([setOp(paths.tasks(uid), task.id, { attachments: task.attachments.filter((a) => a.id !== attachment.id), updatedAt: nowIso() }, true)]);
}

/* ---------------- Notifications & stats ---------------- */

export async function storeTaskNotifications(uid: string, reminders: TaskReminder[]): Promise<void> {
  if (!reminders.length) return;
  const now = nowIso();
  await commit(reminders.map((r) => setOp(paths.taskNotifications(uid), r.id, { taskId: r.taskId, kind: r.kind, title: r.title, body: r.body, read: false, createdAt: now })));
}

export async function markNotificationsRead(uid: string, ids: string[]): Promise<void> {
  if (ids.length) await commit(ids.map((id) => setOp(paths.taskNotifications(uid), id, { read: true }, true)));
}

export async function clearNotifications(uid: string, ids: string[]): Promise<void> {
  if (ids.length) await commit(ids.map((id) => deleteOp(paths.taskNotifications(uid), id)));
}

/** One analytics row per day (streak, XP, score) so progress history survives task deletion. */
export async function saveDayStats(uid: string, stats: TaskDayStats): Promise<void> {
  const { date, ...rest } = stats;
  await commit([setOp(paths.taskStats(uid), date, { ...rest, updatedAt: nowIso() })]);
}
