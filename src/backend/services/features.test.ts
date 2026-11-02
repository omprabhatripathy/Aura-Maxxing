import { describe, expect, it } from 'vitest';
import { addDays } from '../core/dates';
import { distractionFreeStreak, focusQuality, pomodoroStats } from '../pomodoro/analytics';
import { validatePomodoro } from '../pomodoro/model';
import type { PomodoroSession } from '../pomodoro/types';
import { financeAlerts, financialWellness, monthSummary, monthlyTrend, shiftMonth } from '../finance/analytics';
import { validateExpense, validateIncome } from '../finance/model';
import { DEFAULT_FINANCE, type Expense, type Income } from '../finance/types';
import { layoutDay, occurrencesOn, occursOn, planningScore, planningStats } from '../schedule/analytics';
import { validateSchedule } from '../schedule/model';
import type { ScheduleItem } from '../schedule/types';

const TODAY = '2026-06-30'; // Tuesday

const session = (date: string, minutes: number, extra: Partial<PomodoroSession> = {}): PomodoroSession => ({
  id: `${date}-${minutes}-${Math.random()}`,
  mode: 'focus',
  category: 'work',
  customCategory: '',
  notes: '',
  focusMinutes: minutes,
  actualMinutes: minutes,
  breakMinutes: 5,
  completed: true,
  distractions: 0,
  taskId: null,
  taskTitle: '',
  startedAt: `${date}T09:00:00`,
  endedAt: `${date}T10:00:00`,
  date,
  createdAt: `${date}T10:00:00`,
  ...extra,
});

describe('pomodoro', () => {
  it('validates durations and trims notes', () => {
    expect(() => validatePomodoro({ mode: 'custom', category: 'work', focusMinutes: 2, actualMinutes: 2, breakMinutes: 5, completed: true, startedAt: '' })).toThrow();
    expect(validatePomodoro({ mode: 'focus', category: 'study', focusMinutes: 25, actualMinutes: 30, breakMinutes: 5, completed: true, notes: '  hi ', startedAt: '' })).toMatchObject({ notes: 'hi', actualMinutes: 25 });
  });

  it('summarises daily/weekly totals and streaks, ignoring unfinished or short sessions', () => {
    const sessions = [session(TODAY, 25), session(TODAY, 50), session(addDays(TODAY, -1), 25), session(addDays(TODAY, -2), 10), session(TODAY, 40, { completed: false })];
    const s = pomodoroStats(sessions, TODAY);
    expect(s.sessionsCompleted).toBe(3);
    expect(s.todayMinutes).toBe(75);
    expect(s.currentStreak).toBe(2);
    expect(s.byCategory[0]).toMatchObject({ category: 'work', sessions: 3 });
  });

  it('focus quality is weighted and grows slowly', () => {
    expect(focusQuality([], TODAY)).toBeNull();
    const oneDay = focusQuality([session(TODAY, 25)], TODAY)!;
    expect(oneDay).toBeLessThan(0.2);
    const month = focusQuality(Array.from({ length: 30 }, (_, i) => [session(addDays(TODAY, -i), 50), session(addDays(TODAY, -i), 50)]).flat(), TODAY)!;
    expect(month).toBeGreaterThan(0.95);
  });

  it('counts distraction-free sessions from the most recent backwards', () => {
    const list = [session(addDays(TODAY, -2), 25, { distractions: 2 }), session(addDays(TODAY, -1), 25), session(TODAY, 25)];
    expect(distractionFreeStreak(list)).toBe(2);
  });
});

const expense = (date: string, amount: number, category: Expense['category'] = 'food'): Expense => ({ id: `${date}-${amount}-${category}`, amount, category, description: '', date, paymentMethod: 'card', createdAt: date, updatedAt: date });
const pay = (date: string, amount: number): Income => ({ id: `i-${date}`, amount, source: 'Salary', date, createdAt: date, updatedAt: date });

describe('finance', () => {
  it('validates entries', () => {
    expect(() => validateExpense({ amount: 0, category: 'food', description: '', date: TODAY, paymentMethod: 'card' })).toThrow();
    expect(validateExpense({ amount: 12.345, category: 'food', description: ' lunch  out ', date: TODAY, paymentMethod: 'cash' })).toMatchObject({ amount: 12.35, description: 'lunch out' });
    expect(() => validateIncome({ amount: 100, source: ' ', date: TODAY })).toThrow();
  });

  it('summarises a month', () => {
    const s = monthSummary([expense('2026-06-01', 300), expense('2026-06-10', 100, 'bills')], [pay('2026-06-01', 1000)], '2026-06', TODAY);
    expect(s).toMatchObject({ spent: 400, income: 1000, savings: 600, savingsRate: 0.6 });
    expect(s.byCategory[0]).toMatchObject({ category: 'food', amount: 300 });
    expect(s.dailyAverage).toBeCloseTo(400 / 30, 1);
    expect(monthlyTrend([], [], TODAY, 3).map((m) => m.month)).toEqual(['2026-04', '2026-05', '2026-06']);
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('raises budget, category and savings alerts', () => {
    const settings = { ...DEFAULT_FINANCE, monthlyBudget: 500, categoryLimits: { food: 200 } };
    const alerts = financeAlerts([expense('2026-06-02', 450), expense('2026-06-03', 100, 'bills')], [pay('2026-06-01', 560)], settings, TODAY);
    const ids = alerts.map((a) => a.id.split('-').slice(0, 2).join('-'));
    expect(ids).toEqual(expect.arrayContaining(['budget-over', 'limit-food', 'savings-2026']));
  });

  it('financial wellness needs data and rewards saving', () => {
    expect(financialWellness([], [], DEFAULT_FINANCE, TODAY)).toBeNull();
    const spender = financialWellness([expense(TODAY, 900)], [pay(TODAY, 1000)], DEFAULT_FINANCE, TODAY)!;
    const saver = financialWellness([expense(TODAY, 500)], [pay(TODAY, 1000)], DEFAULT_FINANCE, TODAY)!;
    expect(saver).toBeGreaterThan(spender);
  });
});

const item = (extra: Partial<ScheduleItem> = {}): ScheduleItem => ({
  id: 'a',
  title: 'Deep work',
  description: '',
  date: addDays(TODAY, -7),
  start: '09:00',
  end: '10:30',
  category: 'work',
  priority: 'high',
  recurrence: 'none',
  reminderMinutes: null,
  completedDates: [],
  skippedDates: [],
  linkedTaskId: null,
  linkedGoalId: null,
  createdAt: '',
  updatedAt: '',
  ...extra,
});

describe('schedule', () => {
  it('validates times', () => {
    const base = { title: 'x', description: '', date: TODAY, start: '10:00', end: '09:00', category: 'work' as const, priority: 'low' as const, recurrence: 'none' as const, reminderMinutes: null, linkedTaskId: null, linkedGoalId: null };
    expect(() => validateSchedule(base)).toThrow();
    expect(validateSchedule({ ...base, end: '11:00' }).title).toBe('x');
  });

  it('expands recurrence and skips', () => {
    const weekdays = item({ recurrence: 'weekdays', skippedDates: [TODAY] });
    expect(occursOn(weekdays, TODAY)).toBe(false);
    expect(occursOn(weekdays, addDays(TODAY, -1))).toBe(true); // Monday
    expect(occursOn(weekdays, addDays(TODAY, -2))).toBe(false); // Sunday
    expect(occursOn(item({ recurrence: 'weekly' }), TODAY)).toBe(true);
    expect(occursOn(item({ recurrence: 'weekly' }), addDays(TODAY, -1))).toBe(false);
  });

  it('measures planned vs completed time and the planning score', () => {
    const daily = item({ recurrence: 'daily', completedDates: [TODAY, addDays(TODAY, -1)] });
    const s = planningStats([daily], addDays(TODAY, -6), TODAY);
    expect(s.plannedMinutes).toBe(7 * 90);
    expect(s.completedMinutes).toBe(2 * 90);
    expect(planningScore([daily], TODAY)).toBe(Math.round((0.7 * (2 / 7) + 0.3) * 100));
    expect(planningScore([], TODAY)).toBeNull();
  });

  it('lays overlapping blocks side by side', () => {
    const occ = occurrencesOn([item(), item({ id: 'b', start: '10:00', end: '11:00' }), item({ id: 'c', start: '12:00', end: '13:00' })], addDays(TODAY, -7));
    const laid = layoutDay(occ);
    expect(laid.find((o) => o.item.id === 'a')).toMatchObject({ lane: 0, lanes: 2 });
    expect(laid.find((o) => o.item.id === 'b')).toMatchObject({ lane: 1, lanes: 2 });
    expect(laid.find((o) => o.item.id === 'c')).toMatchObject({ lane: 0, lanes: 1 });
  });
});
