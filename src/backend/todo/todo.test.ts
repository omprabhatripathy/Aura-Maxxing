import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
});
vi.stubGlobal('window', { addEventListener: () => {}, removeEventListener: () => {} });

const { database, paths } = await import('../db');
const service = await import('./taskService');
const analytics = await import('./analytics');
const { toTask, validateTask } = await import('./model');
import type { Task, TaskInput } from './types';

const UID = 'user-1';
const TODAY = '2026-03-18'; // a Wednesday

const input = (overrides: Partial<TaskInput> = {}): TaskInput => ({
  title: 'Task',
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
});

const task = (overrides: Partial<Task> = {}): Task => ({
  ...input(),
  id: overrides.id ?? Math.random().toString(36).slice(2),
  status: 'todo',
  archivedFrom: null,
  recurrenceNextId: null,
  attachments: [],
  focusMinutes: 0,
  startedAt: null,
  completedAt: null,
  createdAt: `${TODAY}T08:00:00`,
  updatedAt: `${TODAY}T08:00:00`,
  ...overrides,
});

const loadAll = async () => (await database.list(paths.tasks(UID))).map(toTask);
const load = async (id: string) => toTask((await database.getDoc(paths.tasks(UID), id))!);
const activity = async () => (await database.list(paths.taskActivity(UID))).map((d) => d.data);

beforeEach(() => store.clear());

describe('task analytics', () => {
  const now = new Date(2026, 2, 18, 15, 0);

  it('computes due moments, overdue state and progress', () => {
    expect(analytics.dueAt(task({ dueDate: TODAY, dueTime: '09:30' }))!.getHours()).toBe(9);
    expect(analytics.isOverdue(task({ dueDate: TODAY, dueTime: '09:30' }), now)).toBe(true);
    expect(analytics.isOverdue(task({ dueDate: TODAY }), now)).toBe(false);
    expect(analytics.isOverdue(task({ dueDate: '2026-03-17', status: 'done' }), now)).toBe(false);

    const steps = [
      { id: 'a', title: 'Design', done: true, completedAt: null },
      { id: 'b', title: 'Frontend', done: true, completedAt: null },
      { id: 'c', title: 'Backend', done: false, completedAt: null },
      { id: 'd', title: 'Testing', done: false, completedAt: null },
    ];
    expect(analytics.taskProgress(task({ subtasks: steps }))).toBe(50);
    expect(analytics.taskProgress(task({ estimateMinutes: 60, focusMinutes: 30 }))).toBe(50);
    expect(analytics.taskProgress(task({ estimateMinutes: 10, focusMinutes: 30 }))).toBe(95);
    expect(analytics.taskProgress(task({ status: 'done' }))).toBe(100);
  });

  it('schedules recurrences, clamping month ends', () => {
    expect(analytics.nextOccurrence('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(analytics.nextOccurrence('2026-03-18', 'weekly')).toBe('2026-03-25');
    expect(analytics.nextOccurrence('2026-12-31', 'daily')).toBe('2027-01-01');
  });

  it('counts completion streaks and levels', () => {
    const done = (d: string) => task({ status: 'done', completedAt: new Date(`${d}T10:00:00`).toISOString() });
    const tasks = [done('2026-03-18'), done('2026-03-17'), done('2026-03-16'), done('2026-03-10'), done('2026-03-11')];
    expect(analytics.completionStreak(tasks, TODAY)).toEqual({ current: 3, longest: 3 });
    expect(analytics.completionStreak(tasks.slice(1), TODAY).current).toBe(2);
    expect(analytics.levelFor(0)).toMatchObject({ level: 1, rank: 'Novice' });
    expect(analytics.levelFor(100)).toMatchObject({ level: 2, progress: 0 });
    expect(analytics.levelFor(450)).toMatchObject({ level: 3, rank: 'Apprentice', progress: 50 });
  });

  it('awards XP for priority, early completion, focus and streaks', () => {
    const early = task({ priority: 'critical', dueDate: '2026-03-20', status: 'done', completedAt: new Date(`${TODAY}T10:00:00`).toISOString() });
    const late = task({ priority: 'low', dueDate: '2026-03-10', status: 'done', completedAt: new Date(`${TODAY}T10:00:00`).toISOString() });
    const sessions = [{ id: 's', taskId: null, taskTitle: '', mode: 'free' as const, startedAt: '', endedAt: '', minutes: 27, distractions: 0, date: TODAY }];
    expect(analytics.computeXp([early, late], sessions, TODAY)).toEqual({ tasks: 60, early: 15, focus: 5, streak: 10, total: 90 });
  });

  it('recommends priorities, breakdowns and the next task', () => {
    expect(analytics.recommendPriority('Fix login ASAP', null, TODAY)).toBe('critical');
    expect(analytics.recommendPriority('Pay rent', TODAY, TODAY)).toBe('high');
    expect(analytics.recommendPriority('Read a book', '2026-03-24', TODAY)).toBe('medium');
    expect(analytics.recommendPriority('Read a book', null, TODAY)).toBeNull();
    expect(analytics.breakdownTask('Launch new feature')).toEqual(['Define scope & success criteria', 'Design', 'Build', 'Test', 'Launch & announce']);

    const blocker = task({ id: 'blocker', title: 'Blocker', priority: 'low' });
    const waiting = task({ title: 'Waiting', priority: 'critical', dependsOn: ['blocker'] });
    const overdue = task({ title: 'Overdue', priority: 'medium', dueDate: '2026-03-15' });
    const next = analytics.suggestNextTask([blocker, waiting, overdue], now, TODAY);
    expect(next).toMatchObject({ task: { title: 'Overdue' }, reason: 'Overdue' });
  });

  it('creates deterministic reminders', () => {
    const tasks = [
      task({ id: 'soon', dueDate: TODAY, dueTime: '15:40' }),
      task({ id: 'tomorrow', dueDate: '2026-03-19' }),
      task({ id: 'late', dueDate: '2026-03-17' }),
      task({ id: 'far', dueDate: '2026-04-01' }),
    ];
    const ids = analytics.dueReminders(tasks, [], now, TODAY).map((r) => r.id);
    expect(ids).toEqual(['soon_due-1h_2026-03-18', 'tomorrow_due-1d_2026-03-19', 'late_overdue_2026-03-17', 'focus_2026-03-18']);
  });

  it('derives insights from real completion data', () => {
    const at = (d: string, h: number, tags: string[] = [], due: string | null = null) =>
      task({ status: 'done', tags, dueDate: due, completedAt: new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).toISOString() });
    const tasks = [
      at('2026-03-17', 8),
      at('2026-03-17', 9),
      at('2026-03-10', 10),
      at('2026-03-03', 7),
      at('2026-03-12', 20),
      at('2026-03-13', 14, ['health'], '2026-03-11'),
      at('2026-03-14', 14, ['health'], '2026-03-12'),
    ];
    const insights = analytics.taskInsights(tasks, [], TODAY, now);
    expect(insights).toContain('You complete 300% more tasks in the morning than in the evening.');
    expect(insights).toContain('Your highest productivity day is Tuesday (4 tasks completed in the last 60 days).');
    expect(insights.some((i) => i.startsWith('You are delaying Health related tasks'))).toBe(true);
  });

  it('validates input', () => {
    expect(() => validateTask(input({ title: '  ' }))).toThrow(/title/);
    expect(() => validateTask(input({ recurrence: 'daily' }))).toThrow(/due date/);
    expect(() => validateTask(input({ estimateMinutes: 0 }))).toThrow(/Estimates/);
    expect(validateTask(input({ title: ' Ship ', dueTime: '10:00' }))).toMatchObject({ title: 'Ship', dueTime: null });
  });
});

describe('task workflows', () => {
  it('creates, completes a repeating task (spawning the next one once) and reopens', async () => {
    const id = await service.createTask(UID, input({ title: 'Water plants', dueDate: TODAY, recurrence: 'weekly', subtasks: [service.newSubtask('Balcony')] }));
    let t = await load(id);
    await service.setTaskStatus(UID, { ...t, subtasks: [{ ...t.subtasks[0], done: true, completedAt: null }] }, 'done', await loadAll());
    let all = await loadAll();
    expect(all).toHaveLength(2);
    const next = all.find((x) => x.id !== id)!;
    expect(next).toMatchObject({ status: 'todo', dueDate: '2026-03-25', recurrence: 'weekly' });
    expect(next.subtasks[0].done).toBe(false);

    t = await load(id);
    expect(t.completedAt).not.toBeNull();
    await service.setTaskStatus(UID, t, 'todo', all);
    await service.setTaskStatus(UID, await load(id), 'done', await loadAll());
    all = await loadAll();
    expect(all).toHaveLength(2);
    const types = (await activity()).map((a) => a.type);
    expect(types).toEqual(expect.arrayContaining(['created', 'completed', 'reopened']));
  });

  it('enforces dependencies and rejects cycles', async () => {
    const a = await service.createTask(UID, input({ title: 'A' }));
    const b = await service.createTask(UID, input({ title: 'B', dependsOn: [a] }), await loadAll());
    await expect(service.setTaskStatus(UID, await load(b), 'done', await loadAll())).rejects.toThrow(/Waiting on “A”/);
    await expect(service.updateTask(UID, await load(a), { ...input({ title: 'A' }), dependsOn: [b] }, await loadAll())).rejects.toThrow(/loop/);
    await service.setTaskStatus(UID, await load(a), 'done', await loadAll());
    await service.setTaskStatus(UID, await load(b), 'done', await loadAll());
    expect((await load(b)).status).toBe('done');

    await service.deleteTask(UID, await load(a), await loadAll());
    expect((await load(b)).dependsOn).toEqual([]);
  });

  it('subtasks and focus sessions move work forward', async () => {
    const id = await service.createTask(UID, input({ title: 'Report', estimateMinutes: 60, subtasks: [] }));
    await service.addSubtasks(UID, await load(id), ['Outline', 'Draft']);
    let t = await load(id);
    await service.toggleSubtask(UID, t, t.subtasks[0].id);
    t = await load(id);
    expect(t).toMatchObject({ status: 'in-progress' });
    expect(analytics.taskProgress(t)).toBe(50);

    await service.logFocusSession(UID, { task: t, mode: 'pomodoro', startedAt: new Date().toISOString(), minutes: 25, distractions: 1 });
    expect((await load(id)).focusMinutes).toBe(25);
    expect(await database.list(paths.focusSessions(UID))).toHaveLength(1);

    const blocker = await service.createTask(UID, input({ title: 'Blocker' }));
    const waiting = await service.createTask(UID, input({ title: 'Waiting', dependsOn: [blocker] }), await loadAll());
    await service.logFocusSession(UID, { task: await load(waiting), mode: 'free', startedAt: new Date().toISOString(), minutes: 10, distractions: 0 }, await loadAll());
    expect(await load(waiting)).toMatchObject({ status: 'todo', focusMinutes: 10 });
  });

  it('archives and restores to the previous status; priority edits are logged', async () => {
    const id = await service.createTask(UID, input({ title: 'Plan', status: 'blocked' }));
    await service.setTaskStatus(UID, await load(id), 'archived', await loadAll());
    expect(await load(id)).toMatchObject({ status: 'archived', archivedFrom: 'blocked' });
    await service.restoreTask(UID, await load(id), await loadAll());
    expect((await load(id)).status).toBe('blocked');

    await service.updateTask(UID, await load(id), input({ title: 'Plan', priority: 'critical' }), await loadAll());
    expect((await activity()).some((a) => a.type === 'priority' && a.to === 'critical')).toBe(true);
    expect((await load(id)).status).toBe('blocked');
  });

  it('stores reminders once per id', async () => {
    const reminder = { id: 'x_overdue_2026-03-17', taskId: 'x', kind: 'overdue' as const, title: 'Task overdue', body: 'b' };
    await service.storeTaskNotifications(UID, [reminder]);
    await service.markNotificationsRead(UID, [reminder.id]);
    const docs = await database.list(paths.taskNotifications(UID));
    expect(docs).toHaveLength(1);
    expect(docs[0].data.read).toBe(true);
  });
});
