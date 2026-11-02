import { createContext, useContext } from 'react';
import type { FocusSession, Task, TaskActivity, TaskDayStats, TaskNotification } from '../../backend/todo/types';

export interface TodoData {
  uid: string;
  today: string;
  /** Ticks every 30 seconds so due/overdue state stays live. */
  now: Date;
  loading: boolean;
  error: string | null;
  retry: () => void;
  tasks: Task[];
  activity: TaskActivity[];
  sessions: FocusSession[];
  notifications: TaskNotification[];
  dayStats: TaskDayStats[];
}

export const TodoContext = createContext<TodoData | null>(null);

export function useTodo(): TodoData {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error('useTodo must be used inside TodoProvider');
  return ctx;
}
