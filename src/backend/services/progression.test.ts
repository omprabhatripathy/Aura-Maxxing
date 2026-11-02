import { describe, expect, it } from 'vitest';
import { addDays } from '../core/dates';
import type { Habit, HabitLog, JournalEntry, MoodLog } from '../models';
import type { Task } from '../todo/types';
import type { PomodoroSession } from '../pomodoro/types';
import type { Expense, Income } from '../finance/types';
import type { ScheduleItem } from '../schedule/types';
import {
  XP_RULES,
  auraScore,
  calculateLevel,
  calculateProductivityScore,
  calculateRadarScore,
  calculateStreaks,
  calculateXP,
  maturity,
  totalXp,
  xpForLevel,
  type UserDataSet,
} from './progressionService';

const TODAY = '2026-06-30';
const ts = (date: string, time = '12:00:00') => `${date}T${time}`;
const empty: UserDataSet = { habits: [], habitLogs: [], goals: [], goalProgress: [], journalEntries: [], moodLogs: [], tasks: [], pomodoro: [], schedule: [], expenses: [], income: [] };
const pomo = (i: number, minutes: number, completed = true): PomodoroSession => ({
  id: `p${i}`,
  mode: 'focus',
  category: 'work',
  customCategory: '',
  notes: '',
  focusMinutes: minutes,
  actualMinutes: minutes,
  breakMinutes: 5,
  completed,
  distractions: 0,
  taskId: null,
  taskTitle: '',
  startedAt: `${TODAY}T0${i}:00:00`,
  endedAt: `${TODAY}T0${i}:30:00`,
  date: TODAY,
  createdAt: `${TODAY}T0${i}:30:00`,
});
const block = (id: string, completedDates: string[]): ScheduleItem => ({
  id,
  title: id,
  description: '',
  date: addDays(TODAY, -5),
  start: '09:00',
  end: '10:00',
  category: 'work',
  priority: 'medium',
  recurrence: 'daily',
  reminderMinutes: null,
  completedDates,
  skippedDates: [],
  linkedTaskId: null,
  linkedGoalId: null,
  createdAt: '',
  updatedAt: '',
});
const days = (n: number, from = TODAY) => Array.from({ length: n }, (_, i) => addDays(from, -i));

const habit = (id: string, extra: Partial<Habit> = {}): Habit => ({
  id,
  label: id,
  category: 'health',
  priority: 'medium',
  frequency: 'daily',
  emoji: '',
  archived: false,
  createdAt: ts('2026-01-01'),
  updatedAt: ts('2026-01-01'),
  ...extra,
});
const log = (habitId: string, date: string): HabitLog => ({ id: `${habitId}_${date}`, habitId, date, createdAt: ts(date) });
const entry = (id: string, date: string, text = `entry ${id}`, wordCount = 20): JournalEntry => ({ id, text, mood: null, tags: [], wordCount, date, createdAt: ts(date), updatedAt: ts(date) });

describe('XP', () => {
  it('rewards habits, perfect days and consistency bonuses', () => {
    // Jun 21–30 2026: the ISO week of Mon Jun 22 is fully active, the partial weeks either side are not.
    const data = { ...empty, habits: [habit('a'), habit('b')], habitLogs: days(10).flatMap((d) => [log('a', d), log('b', d)]) };
    const ledger = calculateXP(data);
    expect(ledger.filter((e) => e.source === 'habit')).toHaveLength(20);
    expect(ledger.filter((e) => e.source === 'perfect-day')).toHaveLength(10);
    expect(ledger.filter((e) => e.source === 'weekly')).toHaveLength(1);
    expect(totalXp(ledger)).toBe(20 * XP_RULES.habit + 10 * XP_RULES.perfectDay + XP_RULES.weeklyConsistency);
  });

  it('does not give a perfect-day bonus for a single trivial habit', () => {
    const ledger = calculateXP({ ...empty, habits: [habit('a')], habitLogs: [log('a', TODAY)] });
    expect(ledger.some((e) => e.source === 'perfect-day')).toBe(false);
  });

  it('caps journal and mood rewards per day and ignores duplicates', () => {
    const journals = [entry('1', TODAY, 'same'), entry('2', TODAY, 'same'), entry('3', TODAY, 'other'), entry('4', TODAY, 'more')];
    const moods: MoodLog[] = [1, 2, 3].map((i) => ({ id: `m${i}`, mood: 'happy', score: 9, note: '', source: 'check-in', journalEntryId: null, date: TODAY, createdAt: ts(TODAY, `0${i}:00:00`) }));
    const ledger = calculateXP({ ...empty, journalEntries: journals, moodLogs: moods });
    expect(ledger.filter((e) => e.source === 'journal').map((e) => e.xp).sort()).toEqual([0, 0, 2, 3]);
    expect(totalXp(ledger.filter((e) => e.source === 'mood'))).toBe(XP_RULES.mood + 1);
  });

  it('gives no XP for instantly completed tasks and tapers busy days', () => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const at = (minutes: number) => ts(TODAY, `${pad(8 + Math.floor(minutes / 60))}:${pad(Math.floor(minutes % 60))}:${pad(Math.round((minutes % 1) * 60))}`);
    const task = (i: number, minutes: number): Task => ({ id: `t${i}`, title: `T${i}`, status: 'done', createdAt: at(0), completedAt: at(minutes), dueDate: null }) as Task;
    const tasks = [task(0, 0.5), ...Array.from({ length: 12 }, (_, i) => task(i + 1, 30 + i))];
    const xp = calculateXP({ ...empty, tasks }).filter((e) => e.source === 'todo');
    expect(xp.find((e) => e.id === 't_t0')!.xp).toBe(0);
    expect(totalXp(xp)).toBe(5 * 2 + 5 * 1);
  });

  it('only counts completed Pomodoro sessions of 15+ minutes, capped per day', () => {
    const xp = calculateXP({ ...empty, pomodoro: [pomo(1, 5), pomo(7, 40, false), ...[2, 3, 4, 5, 6].map((i) => pomo(i, 25))] });
    expect(totalXp(xp)).toBe(4 * XP_RULES.focus);
  });

  it('rewards completed schedule blocks', () => {
    const xp = calculateXP({ ...empty, schedule: [block('s1', [TODAY, addDays(TODAY, -1)])] });
    expect(totalXp(xp)).toBe(2 * XP_RULES.scheduleBlock);
  });
});

describe('focus & finance radar', () => {
  it('Focus comes only from Pomodoro, never from checking off tasks', () => {
    const tasks = days(30).map((d, i) => ({ id: `t${i}`, title: 't', status: 'done', createdAt: ts(d, '08:00:00'), completedAt: ts(d, '10:00:00'), dueDate: d }) as Task);
    expect(calculateRadarScore({ ...empty, tasks }, TODAY).coverage.focus).toBe(false);
    const focused = calculateRadarScore({ ...empty, pomodoro: days(30).map((d, i) => ({ ...pomo(i, 50), id: `p${i}`, date: d, startedAt: ts(d) })) }, TODAY);
    expect(focused.coverage.focus).toBe(true);
    expect(focused.scores.focus).toBeGreaterThan(40);
    expect(focused.scores.focus).toBeLessThan(80);
  });

  it('Financial Wellness rewards saving and tracking', () => {
    const expenses: Expense[] = days(20).map((d, i) => ({ id: `e${i}`, amount: 10, category: 'food', description: '', date: d, paymentMethod: 'card', createdAt: ts(d), updatedAt: ts(d) }));
    const income: Income[] = [{ id: 'i', amount: 1000, source: 'Salary', date: addDays(TODAY, -20), createdAt: '', updatedAt: '' }];
    const r = calculateRadarScore({ ...empty, expenses, income }, TODAY);
    expect(r.coverage.finance).toBe(true);
    expect(r.quality.finance).toBeGreaterThan(0.9);
    expect(r.scores.finance).toBeLessThan(r.quality.finance * 100);
  });
});

describe('levels', () => {
  it('grows requirements steeply so high levels take months', () => {
    expect(calculateLevel(0).level).toBe(1);
    expect(calculateLevel(xpForLevel(1)).level).toBe(2);
    expect(xpForLevel(5)).toBeGreaterThan(500);
    expect(xpForLevel(50)).toBeGreaterThan(25_000);
    expect(xpForLevel(100)).toBeGreaterThan(100_000);
    const l = calculateLevel(xpForLevel(9) + 10);
    expect(l).toMatchObject({ level: 10, rank: 'Adept' });
    expect(l.progress).toBeGreaterThanOrEqual(0);
    expect(l.progress).toBeLessThan(100);
  });
});

describe('streaks', () => {
  it('forgives one missed day per week for the activity streak', () => {
    const logs = days(10).filter((d) => d !== addDays(TODAY, -4)).map((d) => log('a', d));
    const s = calculateStreaks({ ...empty, habits: [habit('a')], habitLogs: logs }, TODAY);
    expect(s.activity.current).toBe(9);
    expect(s.habit.current).toBe(4);
  });

  it('tracks journal streaks separately', () => {
    const s = calculateStreaks({ ...empty, journalEntries: days(3).map((d, i) => entry(`${i}`, d)) }, TODAY);
    expect(s.journal.current).toBe(3);
    expect(s.activity.current).toBe(3);
  });
});

describe('radar', () => {
  it('cannot spike from a single day of activity', () => {
    const r = calculateRadarScore({ ...empty, habits: [habit('a', { createdAt: ts(TODAY) })], habitLogs: [log('a', TODAY)] }, TODAY);
    expect(r.coverage.wellness).toBe(true);
    expect(r.scores.discipline).toBeLessThan(10);
    expect(r.scores.wellness).toBeLessThan(10);
  });

  it('has diminishing returns: ~1/3 after 10 days, ~70% after 30, full after 90', () => {
    expect(maturity(10)).toBeCloseTo(0.34, 1);
    expect(maturity(30)).toBeCloseTo(0.71, 1);
    expect(maturity(90)).toBe(1);
  });

  it('rewards months of consistency far more than weeks', () => {
    const build = (n: number) => ({ ...empty, habits: [habit('a')], habitLogs: days(n).map((d) => log('a', d)) });
    const twoWeeks = calculateRadarScore(build(14), TODAY).scores.discipline;
    const threeMonths = calculateRadarScore(build(90), TODAY).scores.discipline;
    expect(twoWeeks).toBeLessThan(50);
    expect(threeMonths).toBeGreaterThan(85);
  });

  it('missed habits pull quality down', () => {
    const everyOther = { ...empty, habits: [habit('a')], habitLogs: days(90).filter((_, i) => i % 2 === 0).map((d) => log('a', d)) };
    const r = calculateRadarScore(everyOther, TODAY);
    expect(r.quality.discipline).toBeLessThan(0.75);
  });

  it('needs a balanced radar for a high Aura score', () => {
    const r = calculateRadarScore({ ...empty, habits: [habit('a')], habitLogs: days(90).map((d) => log('a', d)) }, TODAY);
    expect(auraScore(r)).toBeLessThan(Math.max(r.scores.discipline, r.scores.wellness));
  });
});

describe('productivity score', () => {
  it('ignores today and uses moving averages', () => {
    const data = { ...empty, habits: [habit('a')], habitLogs: [log('a', TODAY)] };
    expect(calculateProductivityScore(data, TODAY).score).toBe(0);
    const steady = { ...empty, habits: [habit('a')], habitLogs: days(30, addDays(TODAY, -1)).map((d) => log('a', d)) };
    expect(calculateProductivityScore(steady, TODAY).score).toBe(100);
  });
});
