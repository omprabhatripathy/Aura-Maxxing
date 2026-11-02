import { isValidIso } from '../core/dates';
import { ValidationError } from '../core/errors';
import type { StoredDoc } from '../db';
import {
  RECURRENCES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Attachment,
  type FocusSession,
  type Recurrence,
  type Subtask,
  type Task,
  type TaskActivity,
  type TaskActivityType,
  type TaskDayStats,
  type TaskInput,
  type TaskNotification,
  type TaskNotificationKind,
  type TaskPriority,
  type TaskStatus,
} from './types';

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);
const iso = (v: unknown): string => (typeof v === 'string' && v ? v : new Date(0).toISOString());
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function toSubtask(v: unknown): Subtask | null {
  if (!v || typeof v !== 'object') return null;
  const s = v as Record<string, unknown>;
  const title = str(s.title).trim();
  if (!title) return null;
  return { id: str(s.id) || title, title, done: s.done === true, completedAt: strOrNull(s.completedAt) };
}

function toAttachment(v: unknown): Attachment | null {
  if (!v || typeof v !== 'object') return null;
  const a = v as Record<string, unknown>;
  // Only storage URLs or inline data; never script-capable schemes in an href.
  if (!/^(https:|data:)/i.test(str(a.url))) return null;
  return { id: str(a.id), name: str(a.name, 'file'), size: num(a.size), type: str(a.type), url: str(a.url), path: strOrNull(a.path) };
}

export function toTask({ id, data }: StoredDoc): Task {
  const createdAt = iso(data.createdAt);
  const dueDate = typeof data.dueDate === 'string' && isValidIso(data.dueDate) ? data.dueDate : null;
  const estimate = num(data.estimateMinutes, 0);
  return {
    id,
    title: str(data.title, 'Untitled task'),
    description: str(data.description),
    notes: str(data.notes),
    status: oneOf<TaskStatus>(data.status, TASK_STATUSES, 'todo'),
    archivedFrom: data.archivedFrom ? oneOf<TaskStatus>(data.archivedFrom, TASK_STATUSES, 'todo') : null,
    priority: oneOf<TaskPriority>(data.priority, TASK_PRIORITIES, 'medium'),
    tags: arr(data.tags).filter((t): t is string => typeof t === 'string'),
    dueDate,
    dueTime: dueDate && typeof data.dueTime === 'string' && TIME_RE.test(data.dueTime) ? data.dueTime : null,
    estimateMinutes: estimate > 0 ? estimate : null,
    recurrence: oneOf<Recurrence>(data.recurrence, RECURRENCES, 'none'),
    recurrenceNextId: strOrNull(data.recurrenceNextId),
    subtasks: arr(data.subtasks).map(toSubtask).filter((s): s is Subtask => s !== null),
    attachments: arr(data.attachments).map(toAttachment).filter((a): a is Attachment => a !== null),
    dependsOn: arr(data.dependsOn).filter((d): d is string => typeof d === 'string' && d !== id),
    goalId: strOrNull(data.goalId),
    habitId: strOrNull(data.habitId),
    focusMinutes: Math.max(0, num(data.focusMinutes)),
    startedAt: strOrNull(data.startedAt),
    completedAt: strOrNull(data.completedAt),
    createdAt,
    updatedAt: iso(data.updatedAt ?? createdAt),
  };
}

export function toTaskActivity({ id, data }: StoredDoc): TaskActivity {
  return {
    id,
    taskId: str(data.taskId),
    taskTitle: str(data.taskTitle),
    type: oneOf<TaskActivityType>(
      data.type,
      ['created', 'status', 'priority', 'completed', 'reopened', 'edited', 'subtask', 'focus', 'deleted', 'archived', 'restored'],
      'edited'
    ),
    from: strOrNull(data.from),
    to: strOrNull(data.to),
    message: str(data.message),
    createdAt: iso(data.createdAt),
  };
}

export function toFocusSession({ id, data }: StoredDoc): FocusSession {
  const startedAt = iso(data.startedAt);
  return {
    id,
    taskId: strOrNull(data.taskId),
    taskTitle: str(data.taskTitle),
    mode: data.mode === 'pomodoro' ? 'pomodoro' : 'free',
    startedAt,
    endedAt: iso(data.endedAt ?? startedAt),
    minutes: Math.max(0, num(data.minutes)),
    distractions: Math.max(0, num(data.distractions)),
    date: typeof data.date === 'string' && isValidIso(data.date) ? data.date : startedAt.slice(0, 10),
  };
}

export function toTaskNotification({ id, data }: StoredDoc): TaskNotification {
  return {
    id,
    taskId: strOrNull(data.taskId),
    kind: oneOf<TaskNotificationKind>(data.kind, ['due-1d', 'due-1h', 'overdue', 'focus'], 'due-1d'),
    title: str(data.title),
    body: str(data.body),
    read: data.read === true,
    createdAt: iso(data.createdAt),
  };
}

export function toTaskDayStats({ id, data }: StoredDoc): TaskDayStats {
  return {
    date: id,
    completed: num(data.completed),
    created: num(data.created),
    focusMinutes: num(data.focusMinutes),
    xp: num(data.xp),
    streak: num(data.streak),
    score: num(data.score),
  };
}

/* ---------------- Validation ---------------- */

export const TASK_LIMITS = { title: 120, description: 2000, notes: 5000, tags: 8, tag: 24, subtasks: 50, subtask: 120, attachments: 10 } as const;

export function parseTaskTags(raw: string): string[] {
  return [...new Set(raw.split(',').map((t) => t.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))].slice(0, TASK_LIMITS.tags);
}

export function validateTask(input: TaskInput): TaskInput {
  const title = input.title.trim().replace(/\s+/g, ' ');
  if (!title) throw new ValidationError('Give your task a title.', 'title');
  if (title.length > TASK_LIMITS.title) throw new ValidationError(`Titles must be ${TASK_LIMITS.title} characters or fewer.`, 'title');
  if (input.description.length > TASK_LIMITS.description) throw new ValidationError('The description is too long.', 'description');
  if (input.notes.length > TASK_LIMITS.notes) throw new ValidationError('Notes are too long.', 'notes');
  if (!TASK_PRIORITIES.includes(input.priority)) throw new ValidationError('Choose a valid priority.', 'priority');
  if (!RECURRENCES.includes(input.recurrence)) throw new ValidationError('Choose a valid repeat option.', 'recurrence');
  if (input.dueDate && !isValidIso(input.dueDate)) throw new ValidationError('Choose a valid due date.', 'dueDate');
  if (input.dueTime && !TIME_RE.test(input.dueTime)) throw new ValidationError('Choose a valid time.', 'dueTime');
  if (input.recurrence !== 'none' && !input.dueDate) throw new ValidationError('Repeating tasks need a due date.', 'dueDate');
  const estimate = input.estimateMinutes === null ? null : Math.round(Number(input.estimateMinutes));
  if (estimate !== null && (!Number.isFinite(estimate) || estimate < 1 || estimate > 24 * 60)) {
    throw new ValidationError('Estimates must be between 1 minute and 24 hours.', 'estimateMinutes');
  }
  if (input.subtasks.length > TASK_LIMITS.subtasks) throw new ValidationError(`Up to ${TASK_LIMITS.subtasks} subtasks per task.`, 'subtasks');
  const subtasks = input.subtasks
    .map((s) => ({ ...s, title: s.title.trim().slice(0, TASK_LIMITS.subtask) }))
    .filter((s) => s.title);
  return {
    ...input,
    title,
    description: input.description.trim(),
    notes: input.notes.trim(),
    tags: input.tags.map((t) => t.slice(0, TASK_LIMITS.tag)).slice(0, TASK_LIMITS.tags),
    dueDate: input.dueDate || null,
    dueTime: input.dueDate && input.dueTime ? input.dueTime : null,
    estimateMinutes: estimate,
    subtasks,
    dependsOn: [...new Set(input.dependsOn)],
  };
}
