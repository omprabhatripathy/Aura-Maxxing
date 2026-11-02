import type { StoredDoc } from '../db';
import { ValidationError } from '../core/errors';
import { isValidIso } from '../core/dates';
import { SCHEDULE_CATEGORIES, SCHEDULE_LIMITS, type ScheduleCategory, type ScheduleInput, type ScheduleItem, type SchedulePriority, type ScheduleRecurrence } from './types';

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const isTime = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const fromMinutes = (m: number) => {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(m)));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
};

export function toScheduleItem({ id, data }: StoredDoc): ScheduleItem | null {
  const date = str(data.date);
  if (!isValidIso(date) || !isTime(str(data.start)) || !isTime(str(data.end))) return null;
  const dates = (v: unknown) => (Array.isArray(v) ? v.filter((d): d is string => typeof d === 'string' && isValidIso(d)) : []);
  return {
    id,
    title: str(data.title, 'Untitled'),
    description: str(data.description),
    date,
    start: str(data.start),
    end: str(data.end),
    category: (SCHEDULE_CATEGORIES as readonly string[]).includes(str(data.category)) ? (data.category as ScheduleCategory) : 'other',
    priority: (['low', 'medium', 'high'] as const).includes(data.priority as SchedulePriority) ? (data.priority as SchedulePriority) : 'medium',
    recurrence: (['none', 'daily', 'weekdays', 'weekly'] as const).includes(data.recurrence as ScheduleRecurrence) ? (data.recurrence as ScheduleRecurrence) : 'none',
    reminderMinutes: typeof data.reminderMinutes === 'number' && data.reminderMinutes >= 0 ? data.reminderMinutes : null,
    completedDates: dates(data.completedDates),
    skippedDates: dates(data.skippedDates),
    linkedTaskId: typeof data.linkedTaskId === 'string' ? data.linkedTaskId : null,
    linkedGoalId: typeof data.linkedGoalId === 'string' ? data.linkedGoalId : null,
    createdAt: str(data.createdAt),
    updatedAt: str(data.updatedAt, str(data.createdAt)),
  };
}

export function validateSchedule(input: ScheduleInput): ScheduleInput {
  const title = input.title.trim().replace(/\s+/g, ' ');
  if (!title) throw new ValidationError('Give this block a name.', 'title');
  if (title.length > SCHEDULE_LIMITS.titleMax) throw new ValidationError(`Names can be up to ${SCHEDULE_LIMITS.titleMax} characters.`, 'title');
  const description = input.description.trim();
  if (description.length > SCHEDULE_LIMITS.descriptionMax) throw new ValidationError(`Descriptions can be up to ${SCHEDULE_LIMITS.descriptionMax} characters.`, 'description');
  if (!isValidIso(input.date)) throw new ValidationError('Choose a valid date.', 'date');
  if (!isTime(input.start) || !isTime(input.end)) throw new ValidationError('Choose a start and end time.', 'start');
  if (toMinutes(input.end) <= toMinutes(input.start)) throw new ValidationError('End time must be after the start time.', 'end');
  if (!SCHEDULE_CATEGORIES.includes(input.category)) throw new ValidationError('Choose a category.', 'category');
  if (input.reminderMinutes !== null && (input.reminderMinutes < 0 || input.reminderMinutes > 24 * 60)) throw new ValidationError('Reminder must be within a day.', 'reminderMinutes');
  return { ...input, title, description };
}
