import { describe, expect, it } from 'vitest';
import { addDays } from '../core/dates';
import type { PomodoroSession } from '../pomodoro/types';
import { buildReport, type UserDataSet } from './radar';
import { auraTrend, bestMonth, buildAuraInsights, compareLastPeriods, explainArea } from './auraInsights';

const TODAY = '2026-06-30';

const session = (date: string, minutes = 50): PomodoroSession => ({
  id: `${date}-${minutes}`,
  mode: 'focus',
  category: 'work',
  customCategory: '',
  notes: '',
  focusMinutes: minutes,
  actualMinutes: minutes,
  breakMinutes: 10,
  completed: true,
  distractions: 0,
  taskId: null,
  taskTitle: '',
  startedAt: `${date}T09:00:00`,
  endedAt: `${date}T10:00:00`,
  date,
  createdAt: `${date}T10:00:00`,
});

const empty: UserDataSet = { habits: [], habitLogs: [], goals: [], goalProgress: [], journalEntries: [], moodLogs: [] };
/** Focus sessions on every other day for the last `days` days. */
const focusData = (days: number): UserDataSet => ({ ...empty, pomodoro: Array.from({ length: Math.ceil(days / 2) }, (_, i) => session(addDays(TODAY, -2 * i))) });

describe('aura insights', () => {
  it('exposes the weighted factors behind each area', () => {
    const report = buildReport(focusData(40), TODAY);
    const focus = report.current.factors.focus;
    expect(focus.map((f) => f.key)).toEqual(['sessions', 'length', 'consistency', 'deepWork', 'calm']);
    expect(focus.reduce((s, f) => s + f.weight, 0)).toBeCloseTo(1);
    expect(report.current.evidenceDays.focus).toBeGreaterThan(0);
    expect(report.current.factors.finance).toEqual([]);
  });

  it('explains scores and handles untracked areas', () => {
    const report = buildReport(focusData(40), TODAY);
    expect(explainArea('focus', report.current)).toMatch(/average session length/i);
    expect(explainArea('finance', report.current)).toMatch(/^No data yet/);
  });

  it('builds a breakdown, ranked recommendations and a readable summary', () => {
    const data = focusData(60);
    const insights = buildAuraInsights(data, TODAY, buildReport(data, TODAY));
    const focus = insights.breakdown.find((b) => b.area === 'focus')!;
    expect(focus.covered).toBe(true);
    expect(focus.current).toBeGreaterThan(0);
    const focusRec = insights.recommendations.find((r) => r.area === 'focus')!;
    expect(focusRec.text).toMatch(/Pomodoro session/);
    expect(focusRec.gain).toBeGreaterThan(0);
    // Quantified recommendations come before "start tracking" ones.
    const gains = insights.recommendations.map((r) => r.gain);
    expect(gains.indexOf(0) === -1 || gains.slice(gains.indexOf(0)).every((g) => g === 0)).toBe(true);
    expect(insights.summary[0]).toMatch(/overall Aura/);
    expect(insights.summary.join(' ')).toMatch(/strongest area is Focus/);
  });

  it('samples trends from the first active period and compares the last two points', () => {
    const data = focusData(60);
    const weekly = auraTrend(data, TODAY, 'week');
    expect(weekly.at(-1)!.date).toBe(TODAY);
    expect(weekly.length).toBeLessThanOrEqual(12);
    expect(weekly.length).toBeGreaterThan(5);
    const change = compareLastPeriods(weekly)!;
    expect(change.overall).toBe(weekly.at(-1)!.overall - weekly.at(-2)!.overall);
    const monthly = auraTrend(data, TODAY, 'month');
    expect(monthly.map((p) => p.date)).toEqual(['2026-05-31', TODAY]);
    expect(auraTrend(empty, TODAY, 'year')).toHaveLength(1);
  });

  it('best month ignores the current month', () => {
    const data = focusData(90);
    const monthly = auraTrend(data, TODAY, 'month');
    const best = bestMonth(monthly);
    expect(best).not.toBeNull();
    expect(best!.date).not.toBe(TODAY);
    expect(bestMonth(monthly.slice(-1))).toBeNull();
  });
});
