export const SCHEDULE_CATEGORIES = ['work', 'study', 'health', 'meetings', 'personal', 'family', 'finance', 'other'] as const;
export type ScheduleCategory = (typeof SCHEDULE_CATEGORIES)[number];

export const SCHEDULE_CATEGORY_META: Record<ScheduleCategory, { label: string; color: string }> = {
  work: { label: 'Work', color: '#f59e0b' },
  study: { label: 'Study', color: '#60a5fa' },
  health: { label: 'Health', color: '#4ade80' },
  meetings: { label: 'Meetings', color: '#a78bfa' },
  personal: { label: 'Personal', color: '#f472b6' },
  family: { label: 'Family', color: '#fb7185' },
  finance: { label: 'Finance', color: '#2dd4bf' },
  other: { label: 'Other', color: '#94a3b8' },
};

export type SchedulePriority = 'low' | 'medium' | 'high';
export type ScheduleRecurrence = 'none' | 'daily' | 'weekdays' | 'weekly';

export const RECURRENCE_LABEL: Record<ScheduleRecurrence, string> = { none: 'Does not repeat', daily: 'Every day', weekdays: 'Every weekday', weekly: 'Every week' };

export interface ScheduleItem {
  id: string;
  title: string;
  description: string;
  /** First (or only) occurrence. */
  date: string;
  /** HH:MM, 24h. */
  start: string;
  end: string;
  category: ScheduleCategory;
  priority: SchedulePriority;
  recurrence: ScheduleRecurrence;
  /** Minutes before start to remind; null = no reminder. */
  reminderMinutes: number | null;
  /** Dates (yyyy-mm-dd) on which this block was completed. */
  completedDates: string[];
  /** Dates removed from a recurring series. */
  skippedDates: string[];
  linkedTaskId: string | null;
  linkedGoalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleInput {
  title: string;
  description: string;
  date: string;
  start: string;
  end: string;
  category: ScheduleCategory;
  priority: SchedulePriority;
  recurrence: ScheduleRecurrence;
  reminderMinutes: number | null;
  linkedTaskId: string | null;
  linkedGoalId: string | null;
}

/** One concrete block on a specific day. */
export interface ScheduleOccurrence {
  item: ScheduleItem;
  date: string;
  start: string;
  end: string;
  minutes: number;
  done: boolean;
}

export const SCHEDULE_LIMITS = { titleMax: 80, descriptionMax: 500, snapMinutes: 15 } as const;
