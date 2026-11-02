import { db as firestore } from '../firebase/config';
import { createFirestoreDatabase } from './firestoreDatabase';
import { createLocalDatabase } from './localDatabase';
import type { Database } from './types';

export const database: Database = firestore ? createFirestoreDatabase(firestore) : createLocalDatabase();

/** Every user-owned collection lives under users/{uid}; this is the only place paths are built. */
export const paths = {
  users: () => ['users'],
  habits: (uid: string) => ['users', uid, 'habits'],
  habitLogs: (uid: string) => ['users', uid, 'habitLogs'],
  goals: (uid: string) => ['users', uid, 'goals'],
  goalProgress: (uid: string) => ['users', uid, 'goalProgress'],
  journalEntries: (uid: string) => ['users', uid, 'journalEntries'],
  moodLogs: (uid: string) => ['users', uid, 'moodLogs'],
  activityHistory: (uid: string) => ['users', uid, 'activityHistory'],
  analyticsSnapshots: (uid: string) => ['users', uid, 'analyticsSnapshots'],
  achievements: (uid: string) => ['users', uid, 'achievements'],
  settings: (uid: string) => ['users', uid, 'settings'],
  periodLogs: (uid: string) => ['users', uid, 'periodLogs'],
  tasks: (uid: string) => ['users', uid, 'tasks'],
  taskActivity: (uid: string) => ['users', uid, 'taskActivity'],
  focusSessions: (uid: string) => ['users', uid, 'focusSessions'],
  taskNotifications: (uid: string) => ['users', uid, 'taskNotifications'],
  taskStats: (uid: string) => ['users', uid, 'taskStats'],
  pomodoro: (uid: string) => ['users', uid, 'pomodoro'],
  expenses: (uid: string) => ['users', uid, 'expenses'],
  income: (uid: string) => ['users', uid, 'income'],
  schedule: (uid: string) => ['users', uid, 'schedule'],
  // Legacy (schema v1) collections, read only during migration.
  legacyJournals: (uid: string) => ['users', uid, 'journals'],
  legacyMoods: (uid: string) => ['users', uid, 'moods'],
};

export type { Database, StoredDoc, WriteOp, QueryOptions, Unsubscribe, DocData } from './types';
