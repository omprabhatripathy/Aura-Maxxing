export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'done' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'blocked', 'done', 'archived'];
export const BOARD_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'blocked', 'done'];
export const TASK_PRIORITIES: TaskPriority[] = ['critical', 'high', 'medium', 'low'];
export const RECURRENCES: Recurrence[] = ['none', 'daily', 'weekly', 'monthly'];

export const PRIORITY_RANK: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3, critical: 4 };
export const TASK_XP: Record<TaskPriority, number> = { low: 10, medium: 20, high: 35, critical: 50 };

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  blocked: 'Blocked',
  done: 'Completed',
  archived: 'Archived',
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
export const PRIORITY_DOT: Record<TaskPriority, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  completedAt: string | null;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  /** Storage object path (Firebase mode only). */
  path: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  notes: string;
  status: TaskStatus;
  /** Status before archiving, so restore returns the task where it was. */
  archivedFrom: TaskStatus | null;
  priority: TaskPriority;
  tags: string[];
  dueDate: string | null;
  dueTime: string | null;
  estimateMinutes: number | null;
  recurrence: Recurrence;
  /** Id of the next occurrence once spawned, so re-completing doesn't duplicate it. */
  recurrenceNextId: string | null;
  subtasks: Subtask[];
  attachments: Attachment[];
  dependsOn: string[];
  goalId: string | null;
  habitId: string | null;
  focusMinutes: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description: string;
  notes: string;
  priority: TaskPriority;
  tags: string[];
  dueDate: string | null;
  dueTime: string | null;
  estimateMinutes: number | null;
  recurrence: Recurrence;
  subtasks: Subtask[];
  dependsOn: string[];
  goalId: string | null;
  habitId: string | null;
  status?: TaskStatus;
}

export type TaskActivityType = 'created' | 'status' | 'priority' | 'completed' | 'reopened' | 'edited' | 'subtask' | 'focus' | 'deleted' | 'archived' | 'restored';

export interface TaskActivity {
  id: string;
  taskId: string;
  taskTitle: string;
  type: TaskActivityType;
  from: string | null;
  to: string | null;
  message: string;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  taskId: string | null;
  taskTitle: string;
  mode: 'free' | 'pomodoro';
  startedAt: string;
  endedAt: string;
  minutes: number;
  distractions: number;
  date: string;
}

export type TaskNotificationKind = 'due-1d' | 'due-1h' | 'overdue' | 'focus';

export interface TaskNotification {
  id: string;
  taskId: string | null;
  kind: TaskNotificationKind;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface TaskDayStats {
  date: string;
  completed: number;
  created: number;
  focusMinutes: number;
  xp: number;
  streak: number;
  score: number;
}
