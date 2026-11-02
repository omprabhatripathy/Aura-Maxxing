import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { database, paths, type QueryOptions, type StoredDoc } from '../../backend/db';
import { toFocusSession, toTask, toTaskActivity, toTaskDayStats, toTaskNotification } from '../../backend/todo/model';
import { completionStreak, computeXp, dueReminders, productivityScore, completedOn } from '../../backend/todo/analytics';
import { saveDayStats, storeTaskNotifications } from '../../backend/todo/taskService';
import { toUserMessage } from '../../backend/core/errors';
import { isoFromTimestamp } from '../../backend/core/dates';
import { deliverNotifications } from '../components/shared/reminders/notify';
import { useUserData } from './useUserData';
import { TodoContext, type TodoData } from './useTodo';

interface Spec {
  path: (uid: string) => string[];
  options: QueryOptions;
  map: (doc: StoredDoc) => unknown;
}

const SPECS = {
  tasks: { path: paths.tasks, options: { orderBy: 'createdAt' }, map: toTask },
  activity: { path: paths.taskActivity, options: { orderBy: 'createdAt', direction: 'desc', limit: 300 }, map: toTaskActivity },
  sessions: { path: paths.focusSessions, options: { orderBy: 'startedAt', direction: 'desc', limit: 500 }, map: toFocusSession },
  notifications: { path: paths.taskNotifications, options: { orderBy: 'createdAt', direction: 'desc', limit: 100 }, map: toTaskNotification },
  dayStats: { path: paths.taskStats, options: {}, map: toTaskDayStats },
} satisfies Record<string, Spec>;

type Key = keyof typeof SPECS;
const KEYS = Object.keys(SPECS) as Key[];

interface State {
  uid: string | null;
  data: Partial<Record<Key, unknown[]>>;
  ready: Partial<Record<Key, boolean>>;
  error: string | null;
}

export function TodoProvider({ children }: { children: ReactNode }) {
  const { uid, today, preferences } = useUserData();
  const [state, setState] = useState<State>({ uid: null, data: {}, ready: {}, error: null });
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubs = KEYS.map((key) => {
      const spec = SPECS[key] as Spec;
      return database.subscribe(
        spec.path(uid),
        spec.options,
        (docs) =>
          setState((s) => {
            const base = s.uid === uid ? s : { uid, data: {}, ready: {}, error: null };
            return { ...base, data: { ...base.data, [key]: docs.map(spec.map) }, ready: { ...base.ready, [key]: true } };
          }),
        (error) => {
          console.error(`Todo subscription failed: ${key}`, error);
          setState((s) => ({ ...s, uid, error: toUserMessage(error, 'Your tasks could not be loaded.') }));
        }
      );
    });
    return () => unsubs.forEach((u) => u());
  }, [uid, attempt]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, ready: {}, error: null }));
    setAttempt((a) => a + 1);
  }, []);

  const current = state.uid === uid ? state : null;
  const loading = !current || KEYS.some((k) => !current.ready[k]);
  const value = useMemo<TodoData>(
    () => ({
      uid,
      today,
      now,
      loading,
      error: current?.error ?? null,
      retry,
      tasks: (current?.data.tasks ?? []) as TodoData['tasks'],
      activity: (current?.data.activity ?? []) as TodoData['activity'],
      sessions: (current?.data.sessions ?? []) as TodoData['sessions'],
      notifications: (current?.data.notifications ?? []) as TodoData['notifications'],
      dayStats: (current?.data.dayStats ?? []) as TodoData['dayStats'],
    }),
    [uid, today, now, loading, current, retry]
  );

  // Reaction engine: store reminders once (deterministic ids) and keep today's productivity row current.
  const pendingReminders = useRef(new Set<string>());
  const lastStats = useRef('');
  useEffect(() => {
    if (value.loading || value.error) return;
    const { tasks, sessions, notifications, dayStats } = value;

    const known = new Set([...notifications.map((n) => n.id), ...pendingReminders.current]);
    const fresh = dueReminders(tasks, sessions, now, today).filter((r) => !known.has(r.id));
    if (fresh.length) {
      fresh.forEach((r) => pendingReminders.current.add(r.id));
      storeTaskNotifications(uid, fresh).catch(() => fresh.forEach((r) => pendingReminders.current.delete(r.id)));
      if (preferences.browserNotifications) deliverNotifications(`${uid}-tasks`, fresh.map((r) => ({ id: r.id, title: r.title, body: r.body })));
    }

    if (!tasks.length && !sessions.length) return;
    const stats = {
      date: today,
      completed: tasks.filter((t) => completedOn(t) === today).length,
      created: tasks.filter((t) => isoFromTimestamp(t.createdAt) === today).length,
      focusMinutes: sessions.filter((s) => s.date === today).reduce((sum, s) => sum + s.minutes, 0),
      xp: computeXp(tasks, sessions, today).total,
      streak: completionStreak(tasks, today).current,
      score: productivityScore(tasks, sessions, today),
    };
    const signature = JSON.stringify(stats);
    const stored = dayStats.find((d) => d.date === today);
    if (stored && JSON.stringify({ ...stored }) === signature) return;
    if (lastStats.current === signature) return;
    lastStats.current = signature;
    saveDayStats(uid, stats).catch(() => (lastStats.current = ''));
  }, [value, now, today, uid, preferences.browserNotifications]);

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}
