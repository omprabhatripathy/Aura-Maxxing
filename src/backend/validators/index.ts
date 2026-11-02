import { ValidationError } from '../core/errors';
import { isValidIso } from '../core/dates';
import { HABIT_CATEGORIES, MILESTONE_NAME_MAX, MOODS, normalizeMilestoneNames, type GoalTerm, type HabitCategory, type HabitFrequency, type HabitPriority, type Mood } from '../models';

function requireText(value: string, field: string, label: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) throw new ValidationError(`${label} is required.`, field);
  if (trimmed.length > max) throw new ValidationError(`${label} must be ${max} characters or fewer.`, field);
  return trimmed;
}

export interface HabitInput {
  label: string;
  category: HabitCategory;
  priority: HabitPriority;
  frequency: HabitFrequency;
  emoji?: string;
}

export function validateHabit(input: HabitInput, existingLabels: string[] = []): HabitInput {
  const label = requireText(input.label, 'label', 'Habit name', 60);
  const emoji = (input.emoji ?? '').trim();
  if (emoji.length > 16) throw new ValidationError('Choose a single emoji.', 'emoji');
  if (existingLabels.some((l) => l.toLowerCase() === label.toLowerCase())) {
    throw new ValidationError('You already have a habit with this name.', 'label');
  }
  if (!HABIT_CATEGORIES.includes(input.category)) throw new ValidationError('Choose a valid category.', 'category');
  if (!['low', 'medium', 'high'].includes(input.priority)) throw new ValidationError('Choose a valid priority.', 'priority');
  if (!['daily', 'weekly'].includes(input.frequency)) throw new ValidationError('Choose a valid frequency.', 'frequency');
  return { ...input, label, emoji };
}

export interface GoalInput {
  title: string;
  detail: string;
  term: GoalTerm;
  dueDate: string | null;
  milestones: number;
  /** When provided, the milestone count is the number of names. */
  milestoneNames?: string[];
}

export function validateGoal(input: GoalInput, today: string, options: { allowPastDue?: boolean; minMilestones?: number } = {}): GoalInput {
  const title = requireText(input.title, 'title', 'Goal title', 80);
  const detail = input.detail.trim().slice(0, 280);
  if (!['short', 'long'].includes(input.term)) throw new ValidationError('Choose a valid term.', 'term');
  const dueDate = input.dueDate ? input.dueDate : null;
  if (dueDate && !isValidIso(dueDate)) throw new ValidationError('Choose a valid due date.', 'dueDate');
  if (dueDate && dueDate < today && !options.allowPastDue) throw new ValidationError('The due date cannot be in the past.', 'dueDate');
  if (input.milestoneNames?.some((n) => n.trim().length > MILESTONE_NAME_MAX)) {
    throw new ValidationError(`Milestone names must be ${MILESTONE_NAME_MAX} characters or fewer.`, 'milestoneNames');
  }
  const milestones = input.milestoneNames ? input.milestoneNames.length : Math.round(Number(input.milestones));
  if (!Number.isFinite(milestones) || milestones < 1 || milestones > 50) {
    throw new ValidationError('Milestones must be between 1 and 50.', 'milestones');
  }
  if (options.minMilestones && milestones < options.minMilestones) {
    throw new ValidationError(`You've already completed ${options.minMilestones} milestones; the total can't be lower.`, 'milestones');
  }
  return { title, detail, term: input.term, dueDate, milestones, milestoneNames: normalizeMilestoneNames(input.milestoneNames, milestones) };
}

export interface JournalInput {
  text: string;
  mood: Mood | null;
  tags: string[];
}

export function parseTags(raw: string): string[] {
  return [...new Set(raw.split(',').map((t) => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean))].slice(0, 10);
}

export function validateJournal(input: JournalInput): JournalInput {
  const text = input.text.trim();
  if (!text) throw new ValidationError('Write something before saving.', 'text');
  if (text.length > 10000) throw new ValidationError('Entries are limited to 10,000 characters.', 'text');
  if (input.mood && !MOODS.includes(input.mood)) throw new ValidationError('Choose a valid mood.', 'mood');
  const tags = input.tags.map((t) => t.slice(0, 24));
  return { text, mood: input.mood, tags };
}

export function validateMood(mood: Mood, note: string): { mood: Mood; note: string } {
  if (!MOODS.includes(mood)) throw new ValidationError('Choose a valid mood.', 'mood');
  return { mood, note: note.trim().slice(0, 280) };
}

export function validateUsername(name: string): string {
  return requireText(name, 'username', 'Name', 40);
}

export function validateEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) throw new ValidationError('Enter a valid email address.', 'email');
  return trimmed;
}

/** 10-digit mobile number (digits only). */
export function validateMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (!/^\d{10}$/.test(digits)) throw new ValidationError('Enter a 10-digit mobile number.', 'mobile');
  return digits;
}

export function validatePassword(password: string): string {
  if (password.length < 8) throw new ValidationError('Password must be at least 8 characters.', 'password');
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new ValidationError('Password must include at least one letter and one number.', 'password');
  }
  return password;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
