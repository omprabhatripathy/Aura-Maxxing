import { addDays, formatDate } from '../../../../backend/core/dates';
import { dueAt, isOverdue } from '../../../../backend/todo/analytics';
import type { Task, TaskInput, TaskPriority, TaskStatus } from '../../../../backend/todo/types';

export function emptyTaskInput(overrides: Partial<TaskInput> = {}): TaskInput {
  return {
    title: '',
    description: '',
    notes: '',
    priority: 'medium',
    tags: [],
    dueDate: null,
    dueTime: null,
    estimateMinutes: null,
    recurrence: 'none',
    subtasks: [],
    dependsOn: [],
    goalId: null,
    habitId: null,
    ...overrides,
  };
}

export function taskToInput(task: Task): TaskInput {
  return {
    title: task.title,
    description: task.description,
    notes: task.notes,
    priority: task.priority,
    tags: task.tags,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    estimateMinutes: task.estimateMinutes,
    recurrence: task.recurrence,
    subtasks: task.subtasks,
    dependsOn: task.dependsOn,
    goalId: task.goalId,
    habitId: task.habitId,
  };
}

export const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: '#94a3b8',
  'in-progress': '#a78bfa',
  blocked: '#f87171',
  done: '#4ade80',
  archived: '#6b7280',
};

export const PRIORITY_COLOR: Record<TaskPriority, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

export type DueTone = 'overdue' | 'today' | 'soon' | 'later' | 'done';

export function dueLabel(task: Task, now: Date, today: string): { text: string; tone: DueTone } | null {
  if (!task.dueDate) return null;
  const time = task.dueTime ? ` ${task.dueTime}` : '';
  if (task.status === 'done' || task.status === 'archived') return { text: `${formatDate(task.dueDate)}${time}`, tone: 'done' };
  if (isOverdue(task, now)) {
    const hours = Math.floor((now.getTime() - dueAt(task)!.getTime()) / 3_600_000);
    return { text: hours < 24 ? `Overdue ${Math.max(1, hours)}h` : `Overdue · ${formatDate(task.dueDate)}`, tone: 'overdue' };
  }
  if (task.dueDate === today) return { text: `Today${time}`, tone: 'today' };
  if (task.dueDate === addDays(today, 1)) return { text: `Tomorrow${time}`, tone: 'soon' };
  return { text: `${formatDate(task.dueDate, { weekday: 'short', month: 'short', day: 'numeric' })}${time}`, tone: task.dueDate <= addDays(today, 3) ? 'soon' : 'later' };
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
