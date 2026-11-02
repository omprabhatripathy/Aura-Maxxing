import { addDays, dateRange, diffDays, fromIso, isoFromTimestamp, toIso, weekStart } from '../core/dates';
import { PRIORITY_RANK, TASK_XP, type FocusSession, type Recurrence, type Task, type TaskNotificationKind, type TaskPriority } from './types';

/* ---------------- Basics ---------------- */

export const isOpen = (t: Task) => t.status !== 'done' && t.status !== 'archived';
export const isCompleted = (t: Task) => t.completedAt !== null && (t.status === 'done' || t.status === 'archived');

/** Due moment: the due time if set, otherwise the end of the due day. */
export function dueAt(task: Pick<Task, 'dueDate' | 'dueTime'>): Date | null {
  if (!task.dueDate) return null;
  const d = fromIso(task.dueDate);
  if (task.dueTime) {
    const [h, m] = task.dueTime.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  } else d.setHours(23, 59, 59, 999);
  return d;
}

export function isOverdue(task: Task, now: Date): boolean {
  const due = dueAt(task);
  return isOpen(task) && due !== null && due.getTime() < now.getTime();
}

/** Subtasks drive progress; otherwise focus time against the estimate (capped until the task is done). */
export function taskProgress(task: Task): number {
  if (task.status === 'done' || (task.status === 'archived' && task.completedAt)) return 100;
  if (task.subtasks.length) return Math.round((task.subtasks.filter((s) => s.done).length / task.subtasks.length) * 100);
  if (task.estimateMinutes && task.focusMinutes > 0) return Math.min(95, Math.round((task.focusMinutes / task.estimateMinutes) * 100));
  return task.status === 'in-progress' ? 10 : 0;
}

export function unmetDependencies(task: Task, byId: Map<string, Task>): Task[] {
  return task.dependsOn.map((id) => byId.get(id)).filter((t): t is Task => !!t && !isCompleted(t));
}

export function completedOn(task: Task): string | null {
  return task.completedAt ? isoFromTimestamp(task.completedAt) : null;
}

export function nextOccurrence(dueDate: string, recurrence: Recurrence): string {
  if (recurrence === 'daily') return addDays(dueDate, 1);
  if (recurrence === 'weekly') return addDays(dueDate, 7);
  const d = fromIso(dueDate);
  const day = d.getDate();
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return toIso(next);
}

/* ---------------- Sorting & filtering ---------------- */

export type TaskSort = 'priority' | 'due' | 'created' | 'progress';
export type TaskFilter = 'all' | 'today' | 'week' | 'overdue' | 'high' | 'completed';

export function sortTasks(tasks: Task[], key: TaskSort): Task[] {
  const due = (t: Task) => dueAt(t)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return [...tasks].sort((a, b) => {
    if (key === 'priority') return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || due(a) - due(b);
    if (key === 'due') return due(a) - due(b) || PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (key === 'progress') return taskProgress(b) - taskProgress(a) || due(a) - due(b);
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function matchesFilter(task: Task, filter: TaskFilter, today: string, now: Date): boolean {
  switch (filter) {
    case 'today':
      return isOpen(task) && task.dueDate !== null && task.dueDate <= today;
    case 'week':
      return isOpen(task) && task.dueDate !== null && task.dueDate <= addDays(weekStart(today), 6);
    case 'overdue':
      return isOverdue(task, now);
    case 'high':
      return isOpen(task) && PRIORITY_RANK[task.priority] >= PRIORITY_RANK.high;
    case 'completed':
      return task.status === 'done';
    default:
      return task.status !== 'archived';
  }
}

export function matchesSearch(task: Task, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [task.title, task.description, task.priority, task.status, ...task.tags].some((v) => v.toLowerCase().includes(q));
}

/* ---------------- Dashboard stats ---------------- */

/** Consecutive days (ending today, or yesterday if nothing is done yet today) with at least one completion. */
export function completionStreak(tasks: Task[], today: string): { current: number; longest: number } {
  const days = new Set(tasks.map(completedOn).filter((d): d is string => d !== null));
  let current = 0;
  let cursor = days.has(today) ? today : addDays(today, -1);
  while (days.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of [...days].sort()) {
    run = prev && diffDays(prev, d) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest };
}

export interface TaskSummary {
  dueToday: number;
  completedToday: number;
  todayTotal: number;
  overdue: number;
  open: number;
  inProgress: number;
  blocked: number;
}

export function taskSummary(tasks: Task[], today: string, now: Date): TaskSummary {
  const completedToday = tasks.filter((t) => completedOn(t) === today).length;
  const dueToday = tasks.filter((t) => isOpen(t) && t.dueDate === today).length;
  const doneDueToday = tasks.filter((t) => t.dueDate === today && completedOn(t) === today).length;
  return {
    dueToday,
    completedToday,
    todayTotal: dueToday + doneDueToday,
    overdue: tasks.filter((t) => isOverdue(t, now)).length,
    open: tasks.filter(isOpen).length,
    inProgress: tasks.filter((t) => t.status === 'in-progress').length,
    blocked: tasks.filter((t) => t.status === 'blocked').length,
  };
}

/** Share of the last 7 days' workload (completions + open tasks that fell due) that got done. */
export function weeklyCompletion(tasks: Task[], today: string): number | null {
  const from = addDays(today, -6);
  const done = tasks.filter((t) => {
    const d = completedOn(t);
    return d !== null && d >= from && d <= today;
  }).length;
  const missed = tasks.filter((t) => isOpen(t) && t.dueDate !== null && t.dueDate <= today && t.dueDate >= addDays(today, -29)).length;
  const total = done + missed;
  return total ? Math.round((done / total) * 100) : null;
}

/** Of tasks completed in the last 30 days that had a deadline, the share finished on time. */
export function onTimeRate(tasks: Task[], today: string): number | null {
  const from = addDays(today, -29);
  const relevant = tasks.filter((t) => {
    const d = completedOn(t);
    return d !== null && d >= from && t.dueDate !== null;
  });
  if (!relevant.length) return null;
  const onTime = relevant.filter((t) => new Date(t.completedAt!).getTime() <= dueAt(t)!.getTime()).length;
  return Math.round((onTime / relevant.length) * 100);
}

export function focusMinutesBetween(sessions: FocusSession[], from: string, to: string): number {
  return sessions.filter((s) => s.date >= from && s.date <= to).reduce((sum, s) => sum + s.minutes, 0);
}

/** 0–100 blend of weekly completion, punctuality, focus time and streak; missing signals are left out. */
export function productivityScore(tasks: Task[], sessions: FocusSession[], today: string): number {
  const parts: [number | null, number][] = [
    [weeklyCompletion(tasks, today), 0.4],
    [onTimeRate(tasks, today), 0.25],
    [sessions.length ? Math.min(100, (focusMinutesBetween(sessions, addDays(today, -6), today) / 300) * 100) : null, 0.2],
    [tasks.some(isCompleted) ? Math.min(100, (completionStreak(tasks, today).current / 7) * 100) : null, 0.15],
  ];
  const used = parts.filter((p): p is [number, number] => p[0] !== null);
  const weight = used.reduce((s, [, w]) => s + w, 0);
  return weight ? Math.round(used.reduce((s, [v, w]) => s + v * w, 0) / weight) : 0;
}

export function dailyCompletions(tasks: Task[], from: string, to: string): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  tasks.forEach((t) => {
    const d = completedOn(t);
    if (d) counts.set(d, (counts.get(d) ?? 0) + 1);
  });
  return dateRange(from, to).map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

export function tagBreakdown(tasks: Task[]): { tag: string; open: number; done: number }[] {
  const map = new Map<string, { open: number; done: number }>();
  tasks.forEach((t) => {
    (t.tags.length ? t.tags : ['untagged']).forEach((tag) => {
      const row = map.get(tag) ?? { open: 0, done: 0 };
      if (isCompleted(t)) row.done++;
      else if (isOpen(t)) row.open++;
      map.set(tag, row);
    });
  });
  return [...map.entries()].map(([tag, v]) => ({ tag, ...v })).sort((a, b) => b.open + b.done - (a.open + a.done));
}

/* ---------------- Gamification ---------------- */

export interface XpBreakdown {
  tasks: number;
  early: number;
  focus: number;
  streak: number;
  total: number;
}

export function computeXp(tasks: Task[], sessions: FocusSession[], today: string): XpBreakdown {
  const completed = tasks.filter(isCompleted);
  const taskXp = completed.reduce((s, t) => s + TASK_XP[t.priority], 0);
  const early = completed.reduce((s, t) => {
    const due = dueAt(t);
    if (!due) return s;
    const finished = new Date(t.completedAt!).getTime();
    if (completedOn(t)! < t.dueDate!) return s + 15;
    return finished <= due.getTime() ? s + 5 : s;
  }, 0);
  const focus = Math.floor(sessions.reduce((s, x) => s + x.minutes, 0) / 5);
  const streak = completionStreak(tasks, today).longest * 10;
  return { tasks: taskXp, early, focus, streak, total: taskXp + early + focus + streak };
}

const RANKS: [number, string][] = [
  [15, 'Legend'],
  [10, 'Elite'],
  [7, 'Pro'],
  [5, 'Achiever'],
  [3, 'Apprentice'],
  [1, 'Novice'],
];

/** Level n starts at 50·n·(n−1) XP: 0, 100, 300, 600, 1000… */
export function levelFor(xp: number): { level: number; rank: string; levelStart: number; nextLevel: number; progress: number } {
  let level = 1;
  while (50 * (level + 1) * level <= xp) level++;
  const levelStart = 50 * level * (level - 1);
  const nextLevel = 50 * (level + 1) * level;
  return {
    level,
    rank: RANKS.find(([min]) => level >= min)![1],
    levelStart,
    nextLevel,
    progress: Math.round(((xp - levelStart) / (nextLevel - levelStart)) * 100),
  };
}

export interface TaskBadge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  earned: boolean;
}

export function taskBadges(tasks: Task[], sessions: FocusSession[], today: string, now: Date): TaskBadge[] {
  const completed = tasks.filter(isCompleted);
  const early = completed.filter((t) => t.dueDate && completedOn(t)! < t.dueDate).length;
  const streak = completionStreak(tasks, today).longest;
  const focusTotal = sessions.reduce((s, x) => s + x.minutes, 0);
  const last7 = completed.filter((t) => completedOn(t)! >= addDays(today, -6)).length;
  const rows: [Omit<TaskBadge, 'earned'>, boolean][] = [
    [{ id: 'first-task', title: 'Task Captured', description: 'Create your first task.', emoji: '📝', color: '#a78bfa' }, tasks.length > 0],
    [{ id: 'first-done', title: 'First Win', description: 'Complete a task.', emoji: '✅', color: '#22c55e' }, completed.length > 0],
    [{ id: 'ten-done', title: 'Getting Things Done', description: 'Complete 10 tasks.', emoji: '🏅', color: '#3b82f6' }, completed.length >= 10],
    [{ id: 'fifty-done', title: 'Task Master', description: 'Complete 50 tasks.', emoji: '🏆', color: '#eab308' }, completed.length >= 50],
    [{ id: 'critical-hit', title: 'Critical Hit', description: 'Complete a critical task.', emoji: '🎯', color: '#ef4444' }, completed.some((t) => t.priority === 'critical')],
    [{ id: 'early-bird', title: 'Early Bird', description: 'Finish 5 tasks before their due date.', emoji: '🐦', color: '#14b8a6' }, early >= 5],
    [{ id: 'streak-3', title: 'On a Roll', description: 'Complete tasks 3 days in a row.', emoji: '🔥', color: '#f97316' }, streak >= 3],
    [{ id: 'streak-7', title: 'Unstoppable', description: 'Complete tasks 7 days in a row.', emoji: '🌋', color: '#f97316' }, streak >= 7],
    [{ id: 'focus-60', title: 'In the Zone', description: 'Log 60 minutes of focus.', emoji: '🧘', color: '#8b5cf6' }, focusTotal >= 60],
    [{ id: 'focus-600', title: 'Deep Thinker', description: 'Log 10 hours of focus.', emoji: '🧠', color: '#8b5cf6' }, focusTotal >= 600],
    [
      { id: 'deep-work', title: 'Deep Work', description: 'A 50+ minute focus session with no distractions.', emoji: '💎', color: '#06b6d4' },
      sessions.some((s) => s.minutes >= 50 && s.distractions === 0),
    ],
    [
      { id: 'breakdown', title: 'Puzzle Solver', description: 'Complete a task with 5+ subtasks.', emoji: '🧩', color: '#ec4899' },
      completed.some((t) => t.subtasks.length >= 5),
    ],
    [
      { id: 'inbox-zero', title: 'Clear Skies', description: 'No overdue tasks and 5+ completed this week.', emoji: '✨', color: '#eab308' },
      last7 >= 5 && !tasks.some((t) => isOverdue(t, now)),
    ],
  ];
  return rows.map(([b, earned]) => ({ ...b, earned }));
}

/* ---------------- Smart features ---------------- */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Data-driven observations; each only appears once there is enough history to support it. */
export function taskInsights(tasks: Task[], sessions: FocusSession[], today: string, now: Date): string[] {
  const insights: string[] = [];
  const completed = tasks.filter(isCompleted);

  if (completed.length >= 5) {
    const buckets = { morning: 0, afternoon: 0, evening: 0 };
    completed.forEach((t) => {
      const h = new Date(t.completedAt!).getHours();
      if (h >= 5 && h < 12) buckets.morning++;
      else if (h >= 12 && h < 17) buckets.afternoon++;
      else buckets.evening++;
    });
    const ranked = (Object.entries(buckets) as [keyof typeof buckets, number][]).sort((a, b) => b[1] - a[1]);
    const [best, worst] = [ranked[0], ranked[2]];
    if (worst[1] > 0 && best[1] > worst[1]) {
      insights.push(`You complete ${Math.round(((best[1] - worst[1]) / worst[1]) * 100)}% more tasks in the ${best[0]} than in the ${worst[0]}.`);
    } else if (best[1] > 0 && worst[1] === 0) {
      insights.push(`Most of your tasks get done in the ${best[0]} (${best[1]} of ${completed.length}).`);
    }
  }

  const byTag = new Map<string, { late: number; total: number }>();
  tasks.forEach((t) => {
    const due = dueAt(t);
    if (!due || t.status === 'archived') return;
    const late = isCompleted(t) ? new Date(t.completedAt!).getTime() > due.getTime() : isOverdue(t, now);
    if (!isCompleted(t) && !late) return;
    t.tags.forEach((tag) => {
      const row = byTag.get(tag) ?? { late: 0, total: 0 };
      row.total++;
      if (late) row.late++;
      byTag.set(tag, row);
    });
  });
  const delayed = [...byTag.entries()].filter(([, r]) => r.late >= 2 && r.late / r.total >= 0.5).sort((a, b) => b[1].late - a[1].late)[0];
  if (delayed) insights.push(`You are delaying ${capital(delayed[0])} related tasks — ${delayed[1].late} of ${delayed[1].total} slipped past their due date.`);

  const recent = completed.filter((t) => completedOn(t)! >= addDays(today, -59));
  if (recent.length >= 5) {
    const counts = new Array(7).fill(0);
    recent.forEach((t) => counts[new Date(t.completedAt!).getDay()]++);
    const best = counts.indexOf(Math.max(...counts));
    insights.push(`Your highest productivity day is ${WEEKDAYS[best]} (${counts[best]} tasks completed in the last 60 days).`);
  }

  const estimated = completed.filter((t) => t.estimateMinutes && t.focusMinutes > 0);
  if (estimated.length >= 3) {
    const ratio = estimated.reduce((s, t) => s + t.focusMinutes / t.estimateMinutes!, 0) / estimated.length;
    const pct = Math.round(Math.abs(ratio - 1) * 100);
    if (pct >= 10) insights.push(`Tasks take you about ${pct}% ${ratio > 1 ? 'longer' : 'less time'} than you estimate.`);
    else insights.push('Your time estimates are spot on — within 10% of the actual focus time.');
  }

  const week = sessions.filter((s) => s.date >= addDays(today, -6));
  if (week.length >= 2) {
    const avg = week.reduce((s, x) => s + x.distractions, 0) / week.length;
    insights.push(
      avg < 0.5
        ? `Great focus: ${week.length} sessions this week with almost no distractions.`
        : `You left the focus screen about ${avg.toFixed(1)} times per session this week — try silencing notifications first.`
    );
  }

  const punctual = onTimeRate(tasks, today);
  if (punctual !== null && completed.length >= 3) insights.push(`${punctual}% of your deadline tasks in the last 30 days were finished on time.`);

  return insights;
}

export interface Suggestion {
  task: Task;
  reason: string;
}

/** Highest-value actionable task: priority, urgency and momentum, skipping blocked or waiting tasks. */
export function suggestNextTask(tasks: Task[], now: Date, today: string): Suggestion | null {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  let best: { task: Task; score: number; reason: string } | null = null;
  for (const t of tasks) {
    if (t.status !== 'todo' && t.status !== 'in-progress') continue;
    if (unmetDependencies(t, byId).length) continue;
    let score = PRIORITY_RANK[t.priority] * 10;
    let reason = `${capital(t.priority)} priority`;
    if (isOverdue(t, now)) {
      score += 40;
      reason = 'Overdue';
    } else if (t.dueDate === today) {
      score += 25;
      reason = 'Due today';
    } else if (t.dueDate && diffDays(today, t.dueDate) <= 3) {
      score += 10;
      reason = `Due ${t.dueDate === addDays(today, 1) ? 'tomorrow' : 'soon'}`;
    }
    if (t.status === 'in-progress') {
      score += 8;
      if (reason.endsWith('priority')) reason = 'Already in progress';
    }
    if (taskProgress(t) > 0) score += 5;
    if (!best || score > best.score) best = { task: t, score, reason };
  }
  return best ? { task: best.task, reason: best.reason } : null;
}

/** Suggests a priority from wording and deadline; null when there's no strong signal. */
export function recommendPriority(title: string, dueDate: string | null, today: string): TaskPriority | null {
  const text = title.toLowerCase();
  if (/\b(urgent|asap|critical|emergency|immediately)\b|!!/.test(text)) return 'critical';
  if (dueDate && dueDate <= today) return 'high';
  if (/\b(important|deadline|must|priority)\b/.test(text)) return 'high';
  if (dueDate && diffDays(today, dueDate) <= 2) return 'high';
  if (dueDate && diffDays(today, dueDate) <= 7) return 'medium';
  if (/\b(someday|maybe|later|eventually)\b/.test(text)) return 'low';
  return null;
}

const BREAKDOWNS: [RegExp, string[]][] = [
  [/\b(launch|release|ship|feature|app|website|deploy|build)\b/, ['Define scope & success criteria', 'Design', 'Build', 'Test', 'Launch & announce']],
  [/\b(study|learn|exam|course|revise|practice)\b/, ['Gather materials', 'Study session 1', 'Study session 2', 'Practice / quiz yourself', 'Review weak spots']],
  [/\b(write|blog|essay|report|article|post|thesis|paper)\b/, ['Outline', 'First draft', 'Edit', 'Final polish', 'Publish / submit']],
  [/\b(clean|organi[sz]e|declutter|move|tidy)\b/, ['List the areas', 'Sort & declutter', 'Clean', 'Put everything away']],
  [/\b(plan|trip|event|party|travel|wedding|holiday)\b/, ['Set date & budget', 'Book the essentials', 'Make a checklist', 'Confirm the details']],
  [/\b(workout|run|fitness|gym|train|exercise)\b/, ['Warm up', 'Main session', 'Cool down & stretch', 'Log the results']],
  [/\b(present|presentation|pitch|meeting|talk|slides)\b/, ['Define the key message', 'Draft slides', 'Rehearse', 'Final review']],
];

/** Rule-based breakdown into starter subtasks, picked from the task's wording. */
export function breakdownTask(title: string, description = ''): string[] {
  const text = `${title} ${description}`.toLowerCase();
  return BREAKDOWNS.find(([re]) => re.test(text))?.[1] ?? ['Clarify the outcome', 'Take the first small step', 'Do the main work', 'Review & wrap up'];
}

/* ---------------- Reminders ---------------- */

export interface TaskReminder {
  id: string;
  taskId: string | null;
  kind: TaskNotificationKind;
  title: string;
  body: string;
}

const HOUR = 3_600_000;

/** Reminders that are due now. Ids are deterministic so each reminder is stored and shown once. */
export function dueReminders(tasks: Task[], sessions: FocusSession[], now: Date, today: string): TaskReminder[] {
  const out: TaskReminder[] = [];
  for (const t of tasks) {
    if (!isOpen(t) || !t.dueDate) continue;
    const due = dueAt(t)!.getTime();
    const left = due - now.getTime();
    if (left <= 0) {
      out.push({ id: `${t.id}_overdue_${t.dueDate}`, taskId: t.id, kind: 'overdue', title: 'Task overdue', body: `“${t.title}” is past its due date.` });
    } else if (t.dueTime && left <= HOUR) {
      out.push({ id: `${t.id}_due-1h_${t.dueDate}`, taskId: t.id, kind: 'due-1h', title: 'Due within the hour', body: `“${t.title}” is due at ${t.dueTime}.` });
    } else if (t.dueTime ? left <= 24 * HOUR : t.dueDate === addDays(today, 1)) {
      out.push({ id: `${t.id}_due-1d_${t.dueDate}`, taskId: t.id, kind: 'due-1d', title: 'Due tomorrow', body: `“${t.title}” is due ${t.dueTime ? `at ${t.dueTime} ` : ''}tomorrow.` });
    }
  }
  const focusedToday = sessions.some((s) => s.date === today);
  const next = suggestNextTask(tasks, now, today);
  if (!focusedToday && next && now.getHours() >= 10) {
    out.push({ id: `focus_${today}`, taskId: next.task.id, kind: 'focus', title: 'Time to focus', body: `No focus session yet today. Start one on “${next.task.title}”.` });
  }
  return out;
}
