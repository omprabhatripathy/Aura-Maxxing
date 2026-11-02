import { describe, expect, it } from 'vitest';
import { addDays, dateRange } from '../core/dates';
import {
  computeCycleStats,
  cycleDay,
  deriveCycles,
  derivePeriods,
  fertileDaySet,
  phaseFor,
  predictCycles,
  predictedDaySet,
} from './cycle';
import {
  generateInsights,
  moodDistribution,
  moodScore,
  moodSymptomCorrelation,
  moodTrendForCycle,
  phaseMoodAverages,
  symptomFrequency,
  PAIN_KEY,
} from './analytics';
import { sanitizeLog } from './store';
import type { DailyLog, Flow } from './types';

function periodDays(start: string, count: number, flow: Flow = 'medium'): DailyLog[] {
  return dateRange(start, addDays(start, count - 1)).map((date) => ({
    id: date,
    date,
    period: { isPeriodDay: true, flow, pain: 4 },
    moods: [],
    symptoms: [],
  }));
}

function merge(...groups: DailyLog[][]): DailyLog[] {
  const map = new Map<string, DailyLog>();
  groups.flat().forEach((l) => {
    const prev = map.get(l.date);
    map.set(l.date, prev ? { ...prev, ...l, moods: [...prev.moods, ...l.moods], symptoms: [...prev.symptoms, ...l.symptoms] } : l);
  });
  return [...map.values()];
}

const moodLog = (date: string, moods: DailyLog['moods'], symptoms: DailyLog['symptoms'] = []): DailyLog => ({ id: date, date, moods, symptoms });

describe('derivePeriods', () => {
  it('groups consecutive period days and splits on gaps', () => {
    const logs = merge(periodDays('2026-01-01', 5), periodDays('2026-01-30', 4));
    const periods = derivePeriods(logs);
    expect(periods).toHaveLength(2);
    expect(periods[0]).toMatchObject({ start: '2026-01-01', end: '2026-01-05' });
    expect(periods[1].days).toHaveLength(4);
  });

  it('ignores logs that are not period days', () => {
    expect(derivePeriods([moodLog('2026-01-01', ['happy'])])).toHaveLength(0);
  });
});

describe('cycle lengths and stats', () => {
  const logs = merge(periodDays('2026-01-01', 5), periodDays('2026-01-30', 4), periodDays('2026-03-01', 6), periodDays('2026-03-29', 5));
  const cycles = deriveCycles(derivePeriods(logs));

  it('measures completed cycles from actual start dates only', () => {
    expect(cycles.map((c) => c.length)).toEqual([29, 30, 28, null]);
    expect(cycles[3].completed).toBe(false);
  });

  it('computes average, shortest, longest, variation and period duration', () => {
    const stats = computeCycleStats(cycles, '2026-04-10');
    expect(stats.averageCycle).toBe(29);
    expect(stats.shortest).toBe(28);
    expect(stats.longest).toBe(30);
    expect(stats.variation).toBe(2);
    expect(stats.averagePeriod).toBe(5);
  });

  it('excludes implausible cycles (likely tracking gaps) from averages', () => {
    const gappy = deriveCycles(derivePeriods(merge(periodDays('2026-01-01', 5), periodDays('2026-01-29', 5), periodDays('2026-05-01', 5))));
    expect(gappy[1].outlier).toBe(true);
    expect(computeCycleStats(gappy, '2026-05-10').usableLengths).toEqual([28]);
  });
});

describe('predictCycles', () => {
  it('returns null without a completed cycle (no hardcoded 28 days)', () => {
    const cycles = deriveCycles(derivePeriods(periodDays('2026-01-01', 5)));
    expect(predictCycles(cycles, '2026-01-10')).toBeNull();
  });

  it('uses the user average cycle length', () => {
    const cycles = deriveCycles(derivePeriods(merge(periodDays('2026-01-01', 5), periodDays('2026-02-02', 5))));
    const p = predictCycles(cycles, '2026-02-10');
    expect(p?.averageCycle).toBe(32);
    expect(p?.nextStart).toBe('2026-03-06');
    expect(p?.periods[0]).toEqual({ start: '2026-03-06', end: '2026-03-10' });
    expect(p?.fertileWindows[0]).toEqual({ start: '2026-02-15', end: '2026-02-21', ovulation: '2026-02-20' });
  });

  it('updates when a new period is logged', () => {
    const before = predictCycles(deriveCycles(derivePeriods(merge(periodDays('2026-01-01', 5), periodDays('2026-02-02', 5)))), '2026-02-10');
    const after = predictCycles(
      deriveCycles(derivePeriods(merge(periodDays('2026-01-01', 5), periodDays('2026-02-02', 5), periodDays('2026-02-28', 5)))),
      '2026-03-05'
    );
    expect(before?.nextStart).toBe('2026-03-06');
    expect(after?.averageCycle).toBe(29);
    expect(after?.nextStart).toBe('2026-03-29');
  });

  it('flags an estimate that has passed without marking it as a missed period', () => {
    const p = predictCycles(deriveCycles(derivePeriods(merge(periodDays('2026-01-01', 5), periodDays('2026-01-29', 5)))), '2026-03-01');
    expect(p?.overdueSince).toBe('2026-02-26');
    expect(p?.periods.every((x) => x.end >= '2026-03-01')).toBe(true);
  });

  it('builds day sets for calendar rendering', () => {
    const p = predictCycles(deriveCycles(derivePeriods(merge(periodDays('2026-01-01', 5), periodDays('2026-01-29', 5)))), '2026-02-05');
    expect(predictedDaySet(p).has('2026-02-26')).toBe(true);
    expect(fertileDaySet(p).ovulation.has('2026-02-12')).toBe(true);
  });
});

describe('cycle day and phases', () => {
  const logs = merge(periodDays('2026-01-01', 5), periodDays('2026-01-29', 5));
  const cycles = deriveCycles(derivePeriods(logs));
  const prediction = predictCycles(cycles, '2026-02-05');

  it('counts the first bleeding day as cycle day 1', () => {
    expect(cycleDay('2026-01-01', cycles)).toBe(1);
    expect(cycleDay('2026-01-28', cycles)).toBe(28);
    expect(cycleDay('2026-01-29', cycles)).toBe(1);
    expect(cycleDay('2025-12-31', cycles)).toBeNull();
  });

  it('estimates phases from the actual next start', () => {
    expect(phaseFor('2026-01-03', cycles, prediction)).toBe('menstrual');
    expect(phaseFor('2026-01-08', cycles, prediction)).toBe('follicular');
    expect(phaseFor('2026-01-15', cycles, prediction)).toBe('ovulation');
    expect(phaseFor('2026-01-20', cycles, prediction)).toBe('luteal');
  });

  it('returns null for the current cycle when no estimate exists', () => {
    const single = deriveCycles(derivePeriods(periodDays('2026-01-01', 5)));
    expect(phaseFor('2026-01-10', single, null)).toBeNull();
  });
});

describe('mood analytics', () => {
  it('scores moods from selections and never fabricates missing days', () => {
    expect(moodScore(moodLog('2026-01-01', ['happy', 'sad']))).toBe(3);
    expect(moodScore(moodLog('2026-01-01', []))).toBeNull();
    expect(moodScore(undefined)).toBeNull();
  });

  it('computes distribution percentages excluding days without moods', () => {
    const logs = [moodLog('2026-01-01', ['happy', 'calm']), moodLog('2026-01-02', ['happy']), moodLog('2026-01-03', []), moodLog('2026-01-04', ['sad'])];
    const d = moodDistribution(logs, '2026-01-01', '2026-01-31');
    expect(d.daysLogged).toBe(3);
    expect(d.totalSelections).toBe(4);
    expect(d.slices[0]).toMatchObject({ mood: 'happy', count: 2, percent: 50, dates: ['2026-01-01', '2026-01-02'] });
  });

  it('builds a cycle trend with nulls for unlogged days', () => {
    const logs = merge(periodDays('2026-01-01', 3), periodDays('2026-01-29', 3), [moodLog('2026-01-02', ['sad']), moodLog('2026-01-10', ['happy'])]);
    const cycles = deriveCycles(derivePeriods(logs));
    const trend = moodTrendForCycle(cycles[0], new Map(logs.map((l) => [l.date, l])), null, '2026-02-10');
    expect(trend).toHaveLength(28);
    expect(trend[1]).toMatchObject({ day: 2, score: 1, flow: 'medium' });
    expect(trend[4].score).toBeNull();
    expect(trend[9].score).toBe(5);
  });

  it('averages mood per estimated phase with counts', () => {
    const logs = merge(periodDays('2026-01-01', 5), periodDays('2026-01-29', 5), [
      moodLog('2026-01-02', ['sad']),
      moodLog('2026-01-08', ['happy']),
      moodLog('2026-01-20', ['calm']),
    ]);
    const cycles = deriveCycles(derivePeriods(logs));
    const result = phaseMoodAverages(logs, cycles, predictCycles(cycles, '2026-02-05'));
    expect(result.menstrual).toEqual({ average: 1, count: 1 });
    expect(result.follicular).toEqual({ average: 5, count: 1 });
    expect(result.luteal).toEqual({ average: 4, count: 1 });
    expect(result.ovulation).toEqual({ average: null, count: 0 });
  });
});

describe('symptoms and correlation', () => {
  const logs = [
    moodLog('2026-01-01', ['sad'], [{ name: 'Cramps', severity: 4 }]),
    moodLog('2026-01-02', ['happy'], [{ name: 'Cramps', severity: 1 }, { name: 'Fatigue', severity: 3 }]),
    moodLog('2026-01-03', ['happy']),
  ];

  it('counts the days each symptom was logged with dates', () => {
    const freq = symptomFrequency(logs, '2026-01-01', '2026-01-31');
    expect(freq[0]).toEqual({ name: 'Cramps', days: [{ date: '2026-01-01', severity: 4 }, { date: '2026-01-02', severity: 1 }] });
    expect(freq[1].name).toBe('Fatigue');
  });

  it('compares mood on days with and without a symptom', () => {
    const c = moodSymptomCorrelation(logs, 'Cramps', '2026-01-01', '2026-01-31');
    expect(c.points).toHaveLength(3);
    expect(c.avgMoodWith).toBe(3);
    expect(c.avgMoodWithout).toBe(5);
  });

  it('supports period pain as a series', () => {
    const withPain = merge(periodDays('2026-01-01', 2), [moodLog('2026-01-01', ['sad'])]);
    const c = moodSymptomCorrelation(withPain, PAIN_KEY, '2026-01-01', '2026-01-31');
    expect(c.points[0]).toEqual({ date: '2026-01-01', mood: 1, severity: 4 });
  });
});

describe('insights', () => {
  it('produces nothing when there is no data', () => {
    expect(generateInsights([], [], [], computeCycleStats([], '2026-01-01'), '2026-01-01')).toEqual([]);
  });

  it('reports symptom counts from the last period using cautious wording', () => {
    const logs = merge(periodDays('2026-01-01', 3), [
      moodLog('2026-01-01', [], [{ name: 'Cramps', severity: 3 }]),
      moodLog('2026-01-02', [], [{ name: 'Cramps', severity: 2 }]),
    ]);
    const periods = derivePeriods(logs);
    const cycles = deriveCycles(periods);
    const insights = generateInsights(logs, periods, cycles, computeCycleStats(cycles, '2026-01-10'), '2026-01-10');
    expect(insights[0]).toMatch(/^You logged cramps on 2 days/);
  });
});

describe('sanitizeLog', () => {
  it('drops invalid values and clamps ranges', () => {
    const log = sanitizeLog({ date: '2026-02-30', moods: [] });
    expect(log).toBeNull();
    const ok = sanitizeLog({ date: '2026-02-01', moods: ['happy', 'bogus'], energyLevel: 9, period: { isPeriodDay: true, flow: 'heavy', pain: 20 } });
    expect(ok?.moods).toEqual(['happy']);
    expect(ok?.energyLevel).toBe(5);
    expect(ok?.period?.pain).toBe(10);
  });
});
