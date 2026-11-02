import { useCallback } from 'react';
import { useAction } from './useAction';
import { useToast } from '../components/shared/feedback/useToast';
import { useTodo } from '../context/useTodo';
import * as service from '../../backend/todo/taskService';
import { TASK_XP, type Attachment, type Task, type TaskInput, type TaskStatus } from '../../backend/todo/types';

/** Task mutations with pending state and toasts. Validation errors from status/quick actions become error toasts. */
export function useTaskActions() {
  const { uid, tasks } = useTodo();
  const { run, isPending } = useAction();
  const toast = useToast();

  const quiet = useCallback(
    async (key: string, fn: () => Promise<unknown>, success?: string) => {
      try {
        return await run(key, fn, { success });
      } catch (error) {
        toast.error((error as Error).message);
        return false;
      }
    },
    [run, toast]
  );

  return {
    isPending,
    /** Throws ValidationError so forms can show it inline. */
    create: (input: TaskInput) => run('task:create', () => service.createTask(uid, input, tasks), { success: 'Task added.' }),
    update: (task: Task, input: TaskInput) => run(`task:update:${task.id}`, () => service.updateTask(uid, task, input, tasks), { success: 'Task updated.' }),
    setStatus: (task: Task, status: TaskStatus) =>
      quiet(
        `task:status:${task.id}`,
        () => service.setTaskStatus(uid, task, status, tasks),
        status === 'done' ? `Completed “${task.title}” · +${TASK_XP[task.priority]} XP${task.recurrence !== 'none' ? ' · next one scheduled' : ''}` : undefined
      ),
    restore: (task: Task) => quiet(`task:status:${task.id}`, () => service.restoreTask(uid, task, tasks), 'Task restored.'),
    toggleSubtask: (task: Task, subtaskId: string) => quiet(`task:subtask:${task.id}:${subtaskId}`, () => service.toggleSubtask(uid, task, subtaskId)),
    addSubtasks: (task: Task, titles: string[]) => quiet(`task:subtasks:${task.id}`, () => service.addSubtasks(uid, task, titles)),
    remove: (task: Task) => quiet(`task:delete:${task.id}`, () => service.deleteTask(uid, task, tasks), 'Task deleted.'),
    addAttachment: (task: Task, file: File) => quiet(`task:attach:${task.id}`, () => service.addAttachment(uid, task, file), 'File attached.'),
    removeAttachment: (task: Task, attachment: Attachment) => quiet(`task:attach:${task.id}`, () => service.removeAttachment(uid, task, attachment)),
    markRead: (ids: string[]) => quiet('task:notifications', () => service.markNotificationsRead(uid, ids)),
    clearNotifications: (ids: string[]) => quiet('task:notifications', () => service.clearNotifications(uid, ids)),
  };
}

export type TaskActions = ReturnType<typeof useTaskActions>;
