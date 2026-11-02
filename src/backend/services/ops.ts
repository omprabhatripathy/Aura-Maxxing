import { database, paths, type DocData, type WriteOp } from '../db';
import { withRetry } from '../core/errors';
import { newId, nowIso } from '../core/ids';
import type { ActivityType } from '../models';

export function setOp(path: string[], id: string, data: DocData, merge = false): WriteOp {
  return { type: 'set', path, id, data, merge };
}

export function deleteOp(path: string[], id: string): WriteOp {
  return { type: 'delete', path, id };
}

export function activityOp(uid: string, type: ActivityType, message: string, entityId: string | null = null, id = newId()): WriteOp {
  return setOp(paths.activityHistory(uid), id, { type, message, entityId, createdAt: nowIso() });
}

/** Commits a set of writes atomically, retrying transient failures. */
export function commit(ops: WriteOp[]): Promise<void> {
  return withRetry(() => database.commit(ops));
}
