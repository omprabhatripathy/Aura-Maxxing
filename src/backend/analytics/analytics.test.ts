import { describe, expect, it } from 'vitest';
import { addDays } from '../core/dates';
import type { Habit, HabitLog, JournalEntry } from '../models';
import { completionRate, dailyCompletionSeries, dayStreaks, expectedOccurrences, groupLogs, habitStreak, isDone } from './habits';
import { buildReport, type UserDataSet } from './radar';
import { goalStats, journalStats, moodSeries } from './metrics';
import { newlyEarned } from '../achievements/engine';
import { toGoal } from '../repositories/mappers';
import { validateGoal, validateHabit, validateMobile, validatePassword, parseTags } from '../validators';

const TODAY = '2026-03-31';
const ts = (date: string) => `${date}T12:00:00`;

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
const daysBack = (n: number) => Array.from({ length: n }, (_, i) => addDays(TODAY, -i));
const empty: UserDataSet = { habits: [], habitLogs: [], goals: [], goalProgress: [], journalEntries: [], moodLogs: [] };

describe('habit analytics', () => {
  it('only expects occurrences after the habit was created', () => {
    expect(expectedOccurrences(habit('a', { createdAt: ts('2026-03-25') }), '2026-03-01', TODAY)).toBe(7);
    expect(expectedOccurrences(habit('a', { createdAt: ts('2026-04-05') }), '2026-03-01', TODAY)).toBe(0);
  });

  it('treats weekly habits per ISO week', () => {
    const weekly = habit('w', { frequency: 'weekly' });
    const logs = groupLogs([log('w', '2026-03-30')]);
    expect(isDone(weekly, logs, '2026-04-02')).toBe(true);
    expect(isDone(weekly, logs, '2026-04-06')).toBe(false);
    expect(expectedOccurrences(weekly, '2026-03-02', '2026-03-29')).toBe(4);
  });

  it('weights completion by priority and returns null when nothing is scheduled', () => {
    const habits = [habit('hi', { priority: 'high' }), habit('lo', { priority: 'low' })];
    const logs = groupLogs([log('hi', TODAY)]);
    expect(completionRate(habits, logs, TODAY, TODAY)).toBe(75);
    expect(completionRate([], logs, TODAY, TODAY)).toBeNull();
  });

  it('keeps a streak alive until the day is over', () => {
    const h = habit('a');
    const logs = groupLogs(daysBack(4).slice(1).map((d) => log('a', d)));
    expect(habitStreak(h, logs, TODAY)).toBe(3);
    expect(dayStreaks(daysBack(4).slice(1).map((d) => log('a', d)), TODAY)).toEqual({ current: 3, longest: 3 });
  });

  it('reports daily completion with gaps before habits existed', () => {
    const series = dailyCompletionSeries([habit('a', { createdAt: ts(TODAY) })], groupLogs([log('a', TODAY)]), TODAY, 3);
    expect(series.map((s) => s.percent)).toEqual([null, null, 100]);
  });
});

describe('metrics', () => {
  it('leaves days without moods empty', () => {
    const series = moodSeries([{ id: 'a', mood: 'low', score: 3, note: '', source: 'check-in', journalEntryId: null, date: TODAY, createdAt: ts(TODAY) }], TODAY, 3);
    expect(series.map((s) => s.average)).toEqual([null, null, 3]);
  });

  it('summarises journaling', () => {
    const entries: JournalEntry[] = [TODAY, addDays(TODAY, -1)].map((d, i) => ({ id: `${i}`, text: 'a b', mood: null, tags: ['work'], wordCount: 2, date: d, createdAt: ts(d), updatedAt: ts(d) }));
    const s = journalStats(entries, TODAY);
    expect(s).toMatchObject({ total: 2, writingStreak: 2, totalWords: 4, avgWords: 2, topTags: [{ tag: 'work', count: 2 }] });
  });

  it('summarises goals including overdue and success rate', () => {
    const goals = [
      toGoal({ id: 'a', data: { title: 'A', milestones: 1, milestonesComplete: 1, createdAt: ts('2026-03-01'), completedAt: ts('2026-03-11') } }),
      toGoal({ id: 'b', data: { title: 'B', milestones: 2, milestonesComplete: 0, dueDate: '2026-03-01', createdAt: ts('2026-02-01') } }),
    ];
    expect(goalStats(goals, [], TODAY)).toMatchObject({ completed: 1, overdue: 1, successRate: 50, avgDaysToComplete: 10 });
  });
});

describe('achievements', () => {
  it('unlocks only what the data supports and skips already-unlocked ones', () => {
    const data = { ...empty, habits: [habit('a')], habitLogs: daysBack(7).map((d) => log('a', d)) };
    const report = buildReport(data, TODAY);
    const ids = newlyEarned(data, report, new Set(['first-habit'])).map((a) => a.id);
    expect(ids).toEqual(['first-completion', 'streak-7']);
  });
});

describe('validators', () => {
  it('rejects duplicates, bad goals and weak passwords', () => {
    expect(() => validateHabit({ label: ' Run ', category: 'health', priority: 'low', frequency: 'daily' }, ['run'])).toThrow(/already/);
    expect(() => validateGoal({ title: 'x', detail: '', term: 'short', dueDate: '2026-01-01', milestones: 2 }, TODAY)).toThrow(/past/);
    expect(() => validateGoal({ title: 'x', detail: '', term: 'short', dueDate: null, milestones: 1 }, TODAY, { minMilestones: 3 })).toThrow(/completed 3/);
    expect(() => validatePassword('abcdefgh')).toThrow(/number/);
    expect(parseTags('Work, #work, health')).toEqual(['work', 'health']);
  });

  it('derives milestones from names, fills blanks, and validates mobile numbers', () => {
    const goal = validateGoal({ title: 'Run', detail: '', term: 'short', dueDate: null, milestones: 1, milestoneNames: [' 5k ', '', '10k'] }, TODAY);
    expect(goal.milestones).toBe(3);
    expect(goal.milestoneNames).toEqual(['5k', 'Milestone 2', '10k']);
    expect(() => validateGoal({ title: 'x', detail: '', term: 'short', dueDate: null, milestones: 0, milestoneNames: [] }, TODAY)).toThrow(/between 1 and 50/);
    expect(validateHabit({ label: 'Read', category: 'learning', priority: 'low', frequency: 'daily', emoji: ' 📚 ' }).emoji).toBe('📚');
    expect(validateMobile('98765 43210')).toBe('9876543210');
    expect(() => validateMobile('12345')).toThrow(/10-digit/);
    expect(() => validateMobile('123456789012')).toThrow(/10-digit/);
  });
});
