import { describe, expect, it } from 'vitest';
import { buildPeriodChanges, buildPeriodDeletion, validatePeriodRange } from './periodForm';
import { derivePeriods } from './cycle';
import { isLogEmpty, type DailyLog } from './types';

const log = (date: string, extra: Partial<DailyLog> = {}): DailyLog => ({ id: date, date, moods: [], symptoms: [], ...extra });
const periodLog = (date: string) => log(date, { period: { isPeriodDay: true, flow: 'medium', pain: 2 } });

describe('validatePeriodRange', () => {
  const periods = derivePeriods([periodLog('2026-01-10'), periodLog('2026-01-11'), periodLog('2026-01-12')]);

  it('rejects future, reversed, too-long and invalid ranges', () => {
    expect(validatePeriodRange('2026-03-01', '2026-03-02', '2026-02-01', [], null)).toMatch(/future/);
    expect(validatePeriodRange('2026-01-05', '2026-01-03', '2026-02-01', [], null)).toMatch(/on or after/);
    expect(validatePeriodRange('2026-01-01', '2026-01-25', '2026-02-01', [], null)).toMatch(/at most/);
    expect(validatePeriodRange('2026-13-01', '2026-01-03', '2026-02-01', [], null)).toMatch(/valid start/);
  });

  it('rejects overlapping or adjacent periods but allows editing the same one', () => {
    expect(validatePeriodRange('2026-01-12', '2026-01-14', '2026-02-01', periods, null)).toMatch(/overlap/);
    expect(validatePeriodRange('2026-01-13', '2026-01-14', '2026-02-01', periods, null)).toMatch(/overlap/);
    expect(validatePeriodRange('2026-01-09', '2026-01-13', '2026-02-01', periods, periods[0])).toBeNull();
    expect(validatePeriodRange('2026-01-20', '2026-01-22', '2026-02-01', periods, null)).toBeNull();
  });
});

describe('buildPeriodChanges', () => {
  it('creates one record per day with its own flow and keeps existing moods', () => {
    const logsByDate = new Map([['2026-01-02', log('2026-01-02', { moods: ['sad'] })]]);
    const changes = buildPeriodChanges({
      start: '2026-01-01',
      end: '2026-01-03',
      days: { '2026-01-01': { flow: 'heavy', pain: 6 }, '2026-01-02': { flow: 'light', pain: 2 } },
      editing: null,
      logsByDate,
      symptoms: [{ name: 'Cramps', severity: 4 }],
      notes: 'note',
    });
    expect(changes.upserts).toHaveLength(3);
    expect(changes.upserts[0].period).toEqual({ isPeriodDay: true, flow: 'heavy', pain: 6 });
    expect(changes.upserts[1].moods).toEqual(['sad']);
    expect(changes.upserts[2].period?.flow).toBe('medium');
    expect(changes.upserts.every((u) => u.symptoms.some((s) => s.name === 'Cramps'))).toBe(true);
  });

  it('removes the period marker from days dropped during an edit', () => {
    const logs = [periodLog('2026-01-01'), periodLog('2026-01-02'), periodLog('2026-01-03')];
    const editing = derivePeriods(logs)[0];
    const changes = buildPeriodChanges({
      start: '2026-01-01',
      end: '2026-01-02',
      days: {},
      editing,
      logsByDate: new Map(logs.map((l) => [l.date, l])),
      symptoms: [],
      notes: '',
    });
    const dropped = changes.upserts.find((u) => u.date === '2026-01-03');
    expect(dropped?.period).toBeUndefined();
    expect(dropped && isLogEmpty(dropped)).toBe(true);
  });
});

describe('buildPeriodDeletion', () => {
  it('clears period days but keeps other entries', () => {
    const logs = [periodLog('2026-01-01'), { ...periodLog('2026-01-02'), moods: ['calm' as const] }];
    const changes = buildPeriodDeletion(derivePeriods(logs)[0], new Map(logs.map((l) => [l.date, l])));
    expect(changes.upserts.every((u) => !u.period)).toBe(true);
    expect(changes.upserts[1].moods).toEqual(['calm']);
  });
});
