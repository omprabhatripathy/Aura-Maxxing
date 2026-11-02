import { database, paths, type WriteOp } from '../db';
import { nowIso } from '../core/ids';
import type { AchievementDefinition } from '../achievements/engine';
import type { AnalyticsReport } from '../analytics/radar';
import { activityOp, commit, deleteOp, setOp } from './ops';

/** Reaction: records newly earned achievements and announces them in the activity feed. */
export async function unlockAchievements(uid: string, earned: AchievementDefinition[]): Promise<void> {
  if (!earned.length) return;
  const now = nowIso();
  await commit(
    earned.flatMap((a) => [
      setOp(paths.achievements(uid), a.id, { unlockedAt: now }),
      activityOp(uid, 'achievement-unlocked', `Unlocked achievement: ${a.title}`, a.id, `ach_${a.id}`),
    ])
  );
}

/** Reaction: stores one analytics snapshot per day so historical comparisons use real past values. */
export async function saveAnalyticsSnapshot(uid: string, today: string, report: AnalyticsReport): Promise<void> {
  await commit([
    setOp(paths.analyticsSnapshots(uid), today, { date: today, scores: report.current.scores, overall: report.overall, createdAt: nowIso() }),
  ]);
}

const USER_COLLECTIONS = [
  paths.habits,
  paths.habitLogs,
  paths.goals,
  paths.goalProgress,
  paths.journalEntries,
  paths.moodLogs,
  paths.activityHistory,
  paths.analyticsSnapshots,
  paths.achievements,
  paths.settings,
  paths.periodLogs,
  paths.tasks,
  paths.taskActivity,
  paths.focusSessions,
  paths.taskNotifications,
  paths.taskStats,
  paths.pomodoro,
  paths.expenses,
  paths.income,
  paths.schedule,
] as const;

/** Builds a JSON export of everything stored for the user. */
export async function exportUserData(uid: string): Promise<Blob> {
  const profile = await database.getDoc(paths.users(), uid);
  const collections: Record<string, unknown[]> = {};
  for (const pathFor of USER_COLLECTIONS) {
    const path = pathFor(uid);
    collections[path[path.length - 1]] = (await database.list(path)).map((d) => ({ id: d.id, ...d.data }));
  }
  await commit([activityOp(uid, 'data-exported', 'Exported personal data')]);
  return new Blob([JSON.stringify({ exportedAt: nowIso(), profile: profile?.data ?? null, collections }, null, 2)], { type: 'application/json' });
}

/** Permanently deletes all user-owned records (the account and profile document remain). */
export async function deleteAllUserData(uid: string): Promise<void> {
  const ops: WriteOp[] = [];
  for (const pathFor of USER_COLLECTIONS) {
    const path = pathFor(uid);
    (await database.list(path)).forEach((d) => ops.push(deleteOp(path, d.id)));
  }
  await commit(ops);
}
