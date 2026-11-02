export type PomodoroMode = 'focus' | 'deep' | 'custom' | 'task';

export const POMODORO_PRESETS: Record<'focus' | 'deep', { label: string; focus: number; rest: number; description: string }> = {
  focus: { label: 'Focus Session', focus: 25, rest: 5, description: '25 min focus · 5 min break' },
  deep: { label: 'Deep Work', focus: 50, rest: 10, description: '50 min focus · 10 min break' },
};

export const FOCUS_CATEGORIES = ['study', 'coding', 'reading', 'work', 'exercise', 'personal', 'custom'] as const;
export type FocusCategory = (typeof FOCUS_CATEGORIES)[number];

export const FOCUS_CATEGORY_META: Record<FocusCategory, { label: string; emoji: string; color: string }> = {
  study: { label: 'Study', emoji: '📚', color: '#60a5fa' },
  coding: { label: 'Coding', emoji: '💻', color: '#a78bfa' },
  reading: { label: 'Reading', emoji: '📖', color: '#22d3ee' },
  work: { label: 'Work', emoji: '💼', color: '#f59e0b' },
  exercise: { label: 'Exercise', emoji: '🏃', color: '#4ade80' },
  personal: { label: 'Personal', emoji: '🌱', color: '#f472b6' },
  custom: { label: 'Custom', emoji: '✨', color: '#94a3b8' },
};

export const POMODORO_LIMITS = { minFocus: 5, maxFocus: 180, minBreak: 1, maxBreak: 60, notesMax: 500, customLabelMax: 40 } as const;

/** A focus session. Incomplete (stopped early) sessions are kept for history but earn no XP. */
export interface PomodoroSession {
  id: string;
  mode: PomodoroMode;
  category: FocusCategory;
  /** Label when category is "custom". */
  customCategory: string;
  notes: string;
  /** Planned focus length. */
  focusMinutes: number;
  /** Minutes actually focused. */
  actualMinutes: number;
  breakMinutes: number;
  completed: boolean;
  distractions: number;
  taskId: string | null;
  taskTitle: string;
  startedAt: string;
  endedAt: string;
  date: string;
  createdAt: string;
}

export interface PomodoroInput {
  mode: PomodoroMode;
  category: FocusCategory;
  customCategory?: string;
  notes?: string;
  focusMinutes: number;
  actualMinutes: number;
  breakMinutes: number;
  completed: boolean;
  distractions?: number;
  taskId?: string | null;
  taskTitle?: string;
  startedAt: string;
}
