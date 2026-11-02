import { createContext, useContext } from 'react';
import type { StoredDoc } from '../../backend/db';
import type { AnalyticsReport, UserDataSet } from '../../backend/analytics/radar';
import type { LogsByHabit } from '../../backend/analytics/habits';
import type { Achievement, Activity, AnalyticsSnapshot, Preferences } from '../../backend/models';
import type { Progression } from '../../backend/services/progressionService';
import type { Task } from '../../backend/todo/types';
import type { PomodoroSession } from '../../backend/pomodoro/types';
import type { Expense, FinanceSettings, Income } from '../../backend/finance/types';
import type { ScheduleItem } from '../../backend/schedule/types';

export interface UserData extends UserDataSet {
  uid: string;
  today: string;
  loading: boolean;
  error: string | null;
  retry: () => void;
  activity: Activity[];
  achievements: Achievement[];
  snapshots: AnalyticsSnapshot[];
  logsByHabit: LogsByHabit;
  report: AnalyticsReport;
  preferences: Preferences;
  settingsDoc: (id: string) => StoredDoc | null;
  /** XP, level, streaks, productivity score — all from services/progressionService. */
  progression: Progression;
  tasks: Task[];
  /** Pomodoro sessions, newest first (legacy Todo focus sessions included). */
  pomodoro: PomodoroSession[];
  expenses: Expense[];
  income: Income[];
  financeSettings: FinanceSettings;
  schedule: ScheduleItem[];
}

export const DataContext = createContext<UserData | null>(null);

export function useUserData(): UserData {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useUserData must be used inside a signed-in DataProvider');
  return ctx;
}
