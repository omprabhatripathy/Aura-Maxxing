import { beforeEach, describe, expect, it, vi } from 'vitest';

// The services use the storage-agnostic database; without Firebase env vars that's the localStorage adapter.
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
});
vi.stubGlobal('window', { addEventListener: () => {}, removeEventListener: () => {} });

const { database, paths } = await import('../db');
const habitService = await import('./habitService');
const goalService = await import('./goalService');
const journalService = await import('./journalService');
const systemService = await import('./systemService');
const { toGoal, toHabit } = await import('../repositories/mappers');

const UID = 'user-1';
const TODAY = '2026-03-31';
const list = async (path: string[]): Promise<Array<Record<string, unknown> & { id: string }>> =>
  (await database.list(path)).map((d) => ({ ...d.data, id: d.id }));

beforeEach(() => store.clear());

describe('habit workflows', () => {
  it('create → saves habit and an activity entry atomically', async () => {
    const id = await habitService.createHabit(UID, { label: ' Read ', category: 'learning', priority: 'high', frequency: 'daily' }, []);
    expect(await list(paths.habits(UID))).toMatchObject([{ id, label: 'Read', archived: false }]);
    expect(await list(paths.activityHistory(UID))).toMatchObject([{ type: 'habit-created', entityId: id }]);
  });

  it('complete → log + activity; undo removes both; deleting the habit removes its history', async () => {
    const id = await habitService.createHabit(UID, { label: 'Run', category: 'health', priority: 'low', frequency: 'daily' }, []);
    const habit = toHabit((await database.getDoc(paths.habits(UID), id))!);
    await habitService.setHabitCompletion(UID, habit, TODAY, true);
    await habitService.setHabitCompletion(UID, habit, TODAY, true);
    expect(await list(paths.habitLogs(UID))).toHaveLength(1);
    expect((await list(paths.activityHistory(UID))).filter((a) => a.type === 'habit-completed')).toHaveLength(1);

    await habitService.setHabitCompletion(UID, habit, TODAY, false);
    expect(await list(paths.habitLogs(UID))).toHaveLength(0);
    expect((await list(paths.activityHistory(UID))).filter((a) => a.type === 'habit-completed')).toHaveLength(0);

    await habitService.setHabitCompletion(UID, habit, '2026-03-30', true);
    const logs = (await database.list(paths.habitLogs(UID))).map((d) => ({ id: d.id, habitId: String(d.data.habitId), date: String(d.data.date), createdAt: '' }));
    await habitService.deleteHabit(UID, habit, logs);
    expect(await list(paths.habits(UID))).toHaveLength(0);
    expect(await list(paths.habitLogs(UID))).toHaveLength(0);
  });

  it('weekly habits store one completion per week', async () => {
    const id = await habitService.createHabit(UID, { label: 'Review', category: 'productivity', priority: 'medium', frequency: 'weekly' }, []);
    const habit = toHabit((await database.getDoc(paths.habits(UID), id))!);
    await habitService.setHabitCompletion(UID, habit, '2026-03-30', true);
    await habitService.setHabitCompletion(UID, habit, '2026-04-02', true);
    expect(await list(paths.habitLogs(UID))).toHaveLength(1);
  });

  it('rejects duplicate names', async () => {
    await habitService.createHabit(UID, { label: 'Run', category: 'health', priority: 'low', frequency: 'daily' }, []);
    const existing = (await database.list(paths.habits(UID))).map(toHabit);
    await expect(habitService.createHabit(UID, { label: 'run', category: 'health', priority: 'low', frequency: 'daily' }, existing)).rejects.toThrow(/already/);
  });
});

describe('goal workflows', () => {
  it('milestones update progress, history, completion and activity; undo reopens', async () => {
    const id = await goalService.createGoal(UID, { title: 'Ship', detail: '', term: 'short', dueDate: null, milestones: 2 }, TODAY);
    const load = async () => toGoal((await database.getDoc(paths.goals(UID), id))!);

    await goalService.changeMilestone(UID, await load(), 1);
    expect(await load()).toMatchObject({ progress: 50, status: 'in-progress' });
    await goalService.changeMilestone(UID, await load(), 1);
    const done = await load();
    expect(done).toMatchObject({ progress: 100, status: 'complete' });
    expect(done.completedAt).not.toBeNull();
    await expect(goalService.changeMilestone(UID, done, 1)).rejects.toThrow(/already complete/);

    const types = (await list(paths.goalProgress(UID))).map((p) => p.type).sort();
    expect(types).toEqual(['completed', 'created', 'milestone', 'milestone']);
    expect((await list(paths.activityHistory(UID))).some((a) => a.type === 'goal-completed')).toBe(true);

    await goalService.changeMilestone(UID, done, -1);
    expect(await load()).toMatchObject({ status: 'in-progress', completedAt: null });
  });

  it('editing the milestone total recalculates progress and can complete the goal', async () => {
    const id = await goalService.createGoal(UID, { title: 'Read', detail: '', term: 'long', dueDate: null, milestones: 4 }, TODAY);
    const goal = toGoal((await database.getDoc(paths.goals(UID), id))!);
    await goalService.changeMilestone(UID, goal, 1);
    await goalService.changeMilestone(UID, toGoal((await database.getDoc(paths.goals(UID), id))!), 1);
    const halfway = toGoal((await database.getDoc(paths.goals(UID), id))!);
    await goalService.updateGoal(UID, halfway, { title: 'Read', detail: '', term: 'long', dueDate: null, milestones: 2 }, TODAY);
    expect(toGoal((await database.getDoc(paths.goals(UID), id))!)).toMatchObject({ progress: 100, status: 'complete' });
    await expect(goalService.updateGoal(UID, halfway, { title: 'Read', detail: '', term: 'long', dueDate: null, milestones: 1 }, TODAY)).rejects.toThrow(/can't be lower/);
  });

  it('stores milestone names and uses them in activity', async () => {
    const id = await goalService.createGoal(UID, { title: 'Run', detail: '', term: 'short', dueDate: null, milestones: 2, milestoneNames: ['5k', '10k'] }, TODAY);
    const goal = toGoal((await database.getDoc(paths.goals(UID), id))!);
    expect(goal).toMatchObject({ milestones: 2, milestoneNames: ['5k', '10k'] });
    await goalService.changeMilestone(UID, goal, 1);
    expect((await list(paths.activityHistory(UID))).some((a) => String(a.message).includes('(5k)'))).toBe(true);
  });
});

describe('journal and mood workflows', () => {
  it('a journal mood is mirrored into mood logs and cleaned up on edit/delete', async () => {
    const id = await journalService.createJournalEntry(UID, { text: 'Good day today', mood: 'happy', tags: ['work'] }, TODAY);
    expect(await list(paths.moodLogs(UID))).toMatchObject([{ id: `journal_${id}`, mood: 'happy', score: 9, source: 'journal', date: TODAY }]);
    const entry = (await database.list(paths.journalEntries(UID))).map((d) => ({ ...(d.data as object), id: d.id }))[0] as never;
    expect((entry as { wordCount: number }).wordCount).toBe(3);

    await journalService.updateJournalEntry(UID, entry, { text: 'Edited', mood: null, tags: [] });
    expect(await list(paths.moodLogs(UID))).toHaveLength(0);

    await journalService.deleteJournalEntry(UID, entry);
    expect(await list(paths.journalEntries(UID))).toHaveLength(0);
  });

  it('quick check-ins create mood logs and activity, never journal entries', async () => {
    await journalService.logMood(UID, 'calm', '', TODAY);
    expect(await list(paths.moodLogs(UID))).toMatchObject([{ mood: 'calm', source: 'check-in' }]);
    expect(await list(paths.journalEntries(UID))).toHaveLength(0);
    expect((await list(paths.activityHistory(UID)))[0]).toMatchObject({ type: 'mood-logged' });
  });
});

describe('system workflows', () => {
  it('exports and deletes all user data', async () => {
    await habitService.createHabit(UID, { label: 'Run', category: 'health', priority: 'low', frequency: 'daily' }, []);
    await journalService.logMood(UID, 'calm', '', TODAY);
    const blob = await systemService.exportUserData(UID);
    const exported = JSON.parse(await blob.text());
    expect(exported.collections.habits).toHaveLength(1);
    expect(exported.collections.moodLogs).toHaveLength(1);

    await systemService.deleteAllUserData(UID);
    expect(await list(paths.habits(UID))).toHaveLength(0);
    expect(await list(paths.activityHistory(UID))).toHaveLength(0);
  });
});
