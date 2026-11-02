import { diffDays, formatDate } from '../core/dates';
import type { Prediction } from './cycle';

export interface CustomReminder {
  id: string;
  label: string;
  time: string;
  enabled: boolean;
}

export interface ReminderSettings {
  periodEnabled: boolean;
  periodDaysBefore: number;
  checkInEnabled: boolean;
  checkInTime: string;
  custom: CustomReminder[];
  showDetails: boolean;
  browser: boolean;
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  periodEnabled: false,
  periodDaysBefore: 2,
  checkInEnabled: false,
  checkInTime: '20:00',
  custom: [],
  showDetails: false,
  browser: false,
};

export interface DueReminder {
  id: string;
  title: string;
  body: string;
}

const sentKey = (key: string) => `aura-period-reminders-sent:${key}`;

/** Parses the stored settings document (users/{uid}/settings/periodReminders). */
export function toReminderSettings(data: Record<string, unknown> | null | undefined): ReminderSettings {
  const d = data ?? {};
  const time = (v: unknown, fallback: string) => (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : fallback);
  return {
    periodEnabled: d.periodEnabled === true,
    periodDaysBefore: typeof d.periodDaysBefore === 'number' ? Math.min(7, Math.max(1, d.periodDaysBefore)) : DEFAULT_REMINDERS.periodDaysBefore,
    checkInEnabled: d.checkInEnabled === true,
    checkInTime: time(d.checkInTime, DEFAULT_REMINDERS.checkInTime),
    custom: Array.isArray(d.custom)
      ? (d.custom as Partial<CustomReminder>[])
          .filter((c) => typeof c?.id === 'string')
          .map((c) => ({ id: c.id!, label: String(c.label ?? '').slice(0, 80), time: time(c.time, '09:00'), enabled: c.enabled !== false }))
      : [],
    showDetails: d.showDetails === true,
    browser: d.browser === true,
  };
}

/** Delivered-notification ids are tracked per device, since each device shows its own notifications. */
export function loadSentIds(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(sentKey(key)) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function markSent(key: string, ids: string[]): void {
  const next = [...new Set([...loadSentIds(key), ...ids])].slice(-100);
  localStorage.setItem(sentKey(key), JSON.stringify(next));
}

/** Reminders due right now. Period details are only included when the user opted in. */
export function dueReminders(params: {
  settings: ReminderSettings;
  today: string;
  time: string;
  prediction: Prediction | null;
  loggedToday: boolean;
}): DueReminder[] {
  const { settings, today, time, prediction, loggedToday } = params;
  const due: DueReminder[] = [];

  if (settings.periodEnabled && prediction) {
    const daysUntil = diffDays(today, prediction.nextStart);
    if (daysUntil >= 0 && daysUntil <= settings.periodDaysBefore) {
      due.push({
        id: `period-${prediction.nextStart}`,
        title: 'Aura reminder',
        body: settings.showDetails
          ? `Your next period is estimated around ${formatDate(prediction.nextStart, { weekday: 'long', month: 'short', day: 'numeric' })}. This is an estimate.`
          : 'You have an upcoming reminder in Aura.',
      });
    }
  }

  if (settings.checkInEnabled && time >= settings.checkInTime && !loggedToday) {
    due.push({ id: `checkin-${today}`, title: 'Aura reminder', body: 'Time for your daily check-in.' });
  }

  settings.custom
    .filter((c) => c.enabled && c.label.trim() && time >= c.time)
    .forEach((c) => due.push({ id: `custom-${c.id}-${today}`, title: 'Aura reminder', body: c.label.trim() }));

  return due;
}
