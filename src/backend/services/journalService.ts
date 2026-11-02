import { paths, type WriteOp } from '../db';
import { newId, nowIso } from '../core/ids';
import { validateJournal, validateMood, wordCount, type JournalInput } from '../validators';
import { MOOD_SCORE, type JournalEntry, type Mood, type MoodLog } from '../models';
import { activityOp, commit, deleteOp, setOp } from './ops';

const linkedMoodId = (entryId: string) => `journal_${entryId}`;

function linkedMoodOp(uid: string, entryId: string, mood: Mood | null, date: string, createdAt: string): WriteOp {
  if (!mood) return deleteOp(paths.moodLogs(uid), linkedMoodId(entryId));
  return setOp(paths.moodLogs(uid), linkedMoodId(entryId), {
    mood,
    score: MOOD_SCORE[mood],
    note: '',
    source: 'journal',
    journalEntryId: entryId,
    date,
    createdAt,
  });
}

/** Saves an entry; a chosen mood is also recorded as a mood log so it feeds mood trends and wellbeing. */
export async function createJournalEntry(uid: string, input: JournalInput, today: string): Promise<string> {
  const valid = validateJournal(input);
  const id = newId();
  const now = nowIso();
  const ops: WriteOp[] = [
    setOp(paths.journalEntries(uid), id, { ...valid, wordCount: wordCount(valid.text), date: today, createdAt: now, updatedAt: now }),
    activityOp(uid, 'journal-created', `Journal entry added (${wordCount(valid.text)} words)`, id),
  ];
  if (valid.mood) {
    ops.push(linkedMoodOp(uid, id, valid.mood, today, now));
    ops.push(activityOp(uid, 'mood-logged', `Logged mood: ${valid.mood}`, id));
  }
  await commit(ops);
  return id;
}

export async function updateJournalEntry(uid: string, entry: JournalEntry, input: JournalInput): Promise<void> {
  const valid = validateJournal(input);
  await commit([
    setOp(paths.journalEntries(uid), entry.id, { ...valid, wordCount: wordCount(valid.text), updatedAt: nowIso() }, true),
    linkedMoodOp(uid, entry.id, valid.mood, entry.date, entry.createdAt),
    activityOp(uid, 'journal-updated', 'Journal entry edited', entry.id),
  ]);
}

export async function deleteJournalEntry(uid: string, entry: JournalEntry): Promise<void> {
  await commit([
    deleteOp(paths.journalEntries(uid), entry.id),
    deleteOp(paths.moodLogs(uid), linkedMoodId(entry.id)),
    activityOp(uid, 'journal-deleted', 'Journal entry deleted', entry.id),
  ]);
}

export async function logMood(uid: string, mood: Mood, note: string, today: string): Promise<string> {
  const valid = validateMood(mood, note);
  const id = newId();
  await commit([
    setOp(paths.moodLogs(uid), id, {
      mood: valid.mood,
      score: MOOD_SCORE[valid.mood],
      note: valid.note,
      source: 'check-in',
      journalEntryId: null,
      date: today,
      createdAt: nowIso(),
    }),
    activityOp(uid, 'mood-logged', `Logged mood: ${valid.mood}`, id),
  ]);
  return id;
}

export async function deleteMoodLog(uid: string, log: MoodLog): Promise<void> {
  const ops: WriteOp[] = [deleteOp(paths.moodLogs(uid), log.id)];
  // A journal-linked mood is cleared on the entry too, so the two never disagree.
  if (log.journalEntryId) ops.push(setOp(paths.journalEntries(uid), log.journalEntryId, { mood: null, updatedAt: nowIso() }, true));
  await commit(ops);
}
