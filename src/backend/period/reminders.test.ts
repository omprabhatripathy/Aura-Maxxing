import { describe, expect, it } from 'vitest';
import { DEFAULT_REMINDERS, dueReminders } from './reminders';
import type { Prediction } from './cycle';

const prediction = { nextStart: '2026-03-03' } as Prediction;

describe('dueReminders', () => {
  it('returns nothing when everything is disabled', () => {
    expect(dueReminders({ settings: DEFAULT_REMINDERS, today: '2026-03-01', time: '21:00', prediction, loggedToday: false })).toEqual([]);
  });

  it('hides period details unless explicitly enabled', () => {
    const settings = { ...DEFAULT_REMINDERS, periodEnabled: true };
    const [generic] = dueReminders({ settings, today: '2026-03-01', time: '09:00', prediction, loggedToday: false });
    expect(generic.body).not.toMatch(/period/i);
    const [detailed] = dueReminders({ settings: { ...settings, showDetails: true }, today: '2026-03-01', time: '09:00', prediction, loggedToday: false });
    expect(detailed.body).toMatch(/estimate/);
    expect(generic.id).toBe(detailed.id);
  });

  it('respects the days-before window', () => {
    const settings = { ...DEFAULT_REMINDERS, periodEnabled: true, periodDaysBefore: 1 };
    expect(dueReminders({ settings, today: '2026-03-01', time: '09:00', prediction, loggedToday: false })).toEqual([]);
  });

  it('only reminds about check-ins after the chosen time when nothing is logged', () => {
    const settings = { ...DEFAULT_REMINDERS, checkInEnabled: true, checkInTime: '20:00' };
    expect(dueReminders({ settings, today: '2026-03-01', time: '19:59', prediction: null, loggedToday: false })).toEqual([]);
    expect(dueReminders({ settings, today: '2026-03-01', time: '20:00', prediction: null, loggedToday: true })).toEqual([]);
    expect(dueReminders({ settings, today: '2026-03-01', time: '20:01', prediction: null, loggedToday: false })[0].id).toBe('checkin-2026-03-01');
  });
});
