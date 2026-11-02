import type { GoalTerm, HabitCategory, HabitFrequency, HabitPriority } from '../../backend/models';

export const HABIT_CATEGORY_OPTIONS: { value: HabitCategory; label: string }[] = [
  { value: 'health', label: 'Health' },
  { value: 'learning', label: 'Learning' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'mindset', label: 'Mindset' },
  { value: 'social', label: 'Social' },
];

export const HABIT_PRIORITY_OPTIONS: { value: HabitPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const HABIT_FREQUENCY_OPTIONS: { value: HabitFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

export const GOAL_TERM_OPTIONS: { value: GoalTerm; label: string }[] = [
  { value: 'short', label: 'Short-term' },
  { value: 'long', label: 'Long-term' },
];
