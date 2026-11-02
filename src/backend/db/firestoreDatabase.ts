import {
  collection,
  doc,
  getDoc as fsGetDoc,
  getDocs,
  limit as fsLimit,
  onSnapshot,
  orderBy as fsOrderBy,
  query,
  Timestamp,
  writeBatch,
  type Firestore,
  type QueryConstraint,
} from 'firebase/firestore';
import { clean, type Database, type DocData, type QueryOptions, type StoredDoc, type WriteOp } from './types';

const BATCH_LIMIT = 450;
const SERVER_ACK_TIMEOUT_MS = 4000;

// Legacy documents used server Timestamps; the app works with ISO strings everywhere.
function normalize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as DocData).map(([k, v]) => [k, normalize(v)]));
  }
  return value;
}

export function createFirestoreDatabase(firestore: Firestore): Database {
  const col = (path: string[]) => collection(firestore, path.join('/'));

  function buildQuery(path: string[], options: QueryOptions) {
    const constraints: QueryConstraint[] = [];
    if (options.orderBy) constraints.push(fsOrderBy(options.orderBy, options.direction ?? 'asc'));
    if (options.limit) constraints.push(fsLimit(options.limit));
    return query(col(path), ...constraints);
  }

  return {
    kind: 'firestore',

    subscribe(path, options, onData, onError) {
      return onSnapshot(
        buildQuery(path, options),
        (snap) => onData(snap.docs.map((d) => ({ id: d.id, data: normalize(d.data()) as DocData }))),
        onError
      );
    },

    subscribeDoc(path, id, onData, onError) {
      return onSnapshot(
        doc(col(path), id),
        (snap) => onData(snap.exists() ? { id: snap.id, data: normalize(snap.data()) as DocData } : null),
        onError
      );
    },

    async getDoc(path, id): Promise<StoredDoc | null> {
      const snap = await fsGetDoc(doc(col(path), id));
      return snap.exists() ? { id: snap.id, data: normalize(snap.data()) as DocData } : null;
    },

    async list(path, options = {}) {
      const snap = await getDocs(buildQuery(path, options));
      return snap.docs.map((d) => ({ id: d.id, data: normalize(d.data()) as DocData }));
    },

    async commit(ops: WriteOp[]) {
      for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
        const batch = writeBatch(firestore);
        ops.slice(i, i + BATCH_LIMIT).forEach((op) => {
          const ref = doc(col(op.path), op.id);
          if (op.type === 'delete') batch.delete(ref);
          else batch.set(ref, clean(op.data), { merge: Boolean(op.merge) });
        });
        const pending = batch.commit();
        // Writes hit the local cache immediately; only wait briefly for the server ack so a slow/blocked
        // connection can't leave buttons stuck on "Saving…". Fast failures (e.g. permission-denied) still reject.
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          pending.catch((error) => console.error('Queued write failed to sync', error));
        } else {
          let timer: ReturnType<typeof setTimeout> | undefined;
          const acked = await Promise.race([
            pending.then(() => true),
            new Promise<false>((resolve) => {
              timer = setTimeout(() => resolve(false), SERVER_ACK_TIMEOUT_MS);
            }),
          ]).finally(() => clearTimeout(timer));
          if (!acked) {
            console.warn('Firestore has not confirmed the write yet; it is saved locally and will sync when the connection recovers.');
            pending.catch((error) => console.error('Queued write failed to sync', error));
          }
        }
      }
    },
  };
}
