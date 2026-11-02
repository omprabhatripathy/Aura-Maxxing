import type { StoredDoc } from '../db';
import { ValidationError } from '../core/errors';
import { isoFromTimestamp } from '../core/dates';
import type { FocusSession } from '../todo/types';
import { FOCUS_CATEGORIES, POMODORO_LIMITS, type FocusCategory, type PomodoroInput, type PomodoroMode, type PomodoroSession } from './types';

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

export function toPomodoroSession({ id, data }: StoredDoc): PomodoroSession | null {
  const startedAt = str(data.startedAt);
  if (!startedAt) return null;
  const category = (FOCUS_CATEGORIES as readonly string[]).includes(str(data.category)) ? (data.category as FocusCategory) : 'personal';
  const mode = (['focus', 'deep', 'custom', 'task'] as const).includes(data.mode as PomodoroMode) ? (data.mode as PomodoroMode) : 'custom';
  return {
    id,
    mode,
    category,
    customCategory: str(data.customCategory),
    notes: str(data.notes),
    focusMinutes: num(data.focusMinutes),
    actualMinutes: num(data.actualMinutes),
    breakMinutes: num(data.breakMinutes),
    completed: data.completed === true,
    distractions: num(data.distractions),
    taskId: typeof data.taskId === 'string' ? data.taskId : null,
    taskTitle: str(data.taskTitle),
    startedAt,
    endedAt: str(data.endedAt, startedAt),
    date: str(data.date, isoFromTimestamp(startedAt)),
    createdAt: str(data.createdAt, startedAt),
  };
}

/** Focus sessions recorded by the old in-Todo timer, shown alongside Pomodoro history. */
export function fromLegacyFocus(s: FocusSession): PomodoroSession {
  return {
    id: `legacy_${s.id}`,
    mode: s.mode === 'pomodoro' ? 'focus' : 'custom',
    category: 'work',
    customCategory: '',
    notes: '',
    focusMinutes: s.minutes,
    actualMinutes: s.minutes,
    breakMinutes: 0,
    completed: true,
    distractions: s.distractions,
    taskId: s.taskId,
    taskTitle: s.taskTitle,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    date: s.date,
    createdAt: s.startedAt,
  };
}

export function validatePomodoro(input: PomodoroInput): PomodoroInput {
  const { minFocus, maxFocus, minBreak, maxBreak, notesMax, customLabelMax } = POMODORO_LIMITS;
  if (!Number.isFinite(input.focusMinutes) || input.focusMinutes < minFocus || input.focusMinutes > maxFocus) {
    throw new ValidationError(`Focus must be between ${minFocus} and ${maxFocus} minutes.`, 'focusMinutes');
  }
  if (!Number.isFinite(input.breakMinutes) || input.breakMinutes < minBreak || input.breakMinutes > maxBreak) {
    throw new ValidationError(`Break must be between ${minBreak} and ${maxBreak} minutes.`, 'breakMinutes');
  }
  if (!FOCUS_CATEGORIES.includes(input.category)) throw new ValidationError('Choose a category.', 'category');
  const notes = (input.notes ?? '').trim();
  if (notes.length > notesMax) throw new ValidationError(`Notes can be up to ${notesMax} characters.`, 'notes');
  const customCategory = (input.customCategory ?? '').trim().slice(0, customLabelMax);
  return {
    ...input,
    notes,
    customCategory,
    actualMinutes: Math.max(0, Math.min(input.focusMinutes, Math.round(input.actualMinutes * 10) / 10)),
    distractions: Math.max(0, Math.round(input.distractions ?? 0)),
  };
}
