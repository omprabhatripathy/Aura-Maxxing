import { database, paths, type WriteOp } from '../db';
import { isValidIso, isoFromTimestamp } from '../core/dates';
import { nowIso } from '../core/ids';
import { MOOD_SCORE, MOODS, type Mood } from '../models';
import { periodKey } from '../analytics/habits';
import { toGoal, toHabit } from '../repositories/mappers';
import { wordCount } from '../validators';
import { commit, setOp } from './ops';
import { SCHEMA_VERSION } from './profileService';

/**
 * Upgrades schema v1 data (completion arrays on habits, `journals`, quick check-ins stored as journal entries)
 * to the v2 model. Deterministic ids make it safe to re-run if interrupted.
 */
export async function migrateUserData(uid: string): Promise<void> {
  const ops: WriteOp[] = [];
  const now = nowIso();

  for (const stored of await database.list(paths.habits(uid))) {
    const habit = toHabit(stored);
    const dates = Array.isArray(stored.data.completedDates) ? (stored.data.completedDates as unknown[]) : [];
    dates
      .filter((d): d is string => typeof d === 'string' && isValidIso(d))
      .forEach((date) => ops.push(setOp(paths.habitLogs(uid), `${habit.id}_${periodKey(habit, date)}`, { habitId: habit.id, date, createdAt: now })));
    ops.push(
      setOp(
        paths.habits(uid),
        habit.id,
        { label: habit.label.slice(0, 60), category: habit.category, priority: habit.priority, frequency: habit.frequency, archived: false, createdAt: habit.createdAt, updatedAt: habit.updatedAt },
        true
      )
    );
  }

  // v1 goals may predate milestones; persist the normalised shape so later updates pass validation.
  for (const stored of await database.list(paths.goals(uid))) {
    const goal = toGoal(stored);
    ops.push(
      setOp(
        paths.goals(uid),
        goal.id,
        {
          title: goal.title.slice(0, 80),
          detail: goal.detail.slice(0, 280),
          term: goal.term,
          dueDate: goal.dueDate,
          milestones: goal.milestones,
          milestoneNames: goal.milestoneNames,
          milestonesComplete: goal.milestonesComplete,
          progress: goal.progress,
          status: goal.status,
          createdAt: goal.createdAt,
          updatedAt: goal.updatedAt,
          completedAt: goal.status === 'complete' ? goal.updatedAt : null,
        },
        true
      )
    );
  }

  for (const { id, data } of await database.list(paths.legacyJournals(uid))) {
    const createdAt = typeof data.createdAt === 'string' ? data.createdAt : now;
    const date = isoFromTimestamp(createdAt);
    const mood = MOODS.includes(data.mood as Mood) ? (data.mood as Mood) : null;
    const tags = Array.isArray(data.tags) ? (data.tags as string[]) : [];
    const text = typeof data.text === 'string' ? data.text : '';
    if (tags.includes('mood-check')) {
      // v1 stored dashboard check-ins as journal entries; they are mood logs, not writing.
      if (mood) ops.push(setOp(paths.moodLogs(uid), `legacy_${id}`, { mood, score: MOOD_SCORE[mood], note: '', source: 'check-in', journalEntryId: null, date, createdAt }));
      continue;
    }
    ops.push(setOp(paths.journalEntries(uid), id, { text, mood, tags, wordCount: wordCount(text), date, createdAt, updatedAt: createdAt }));
    if (mood) {
      ops.push(setOp(paths.moodLogs(uid), `journal_${id}`, { mood, score: MOOD_SCORE[mood], note: '', source: 'journal', journalEntryId: id, date, createdAt }));
    }
  }

  ops.push(setOp(paths.users(), uid, { schemaVersion: SCHEMA_VERSION, migratedAt: now }, true));
  await commit(ops);
}
