export type DocData = Record<string, unknown>;

export interface StoredDoc {
  id: string;
  data: DocData;
}

export interface QueryOptions {
  orderBy?: string;
  direction?: 'asc' | 'desc';
  limit?: number;
}

export type WriteOp =
  | { type: 'set'; path: string[]; id: string; data: DocData; merge?: boolean }
  | { type: 'delete'; path: string[]; id: string };

export type Unsubscribe = () => void;

/**
 * Storage-agnostic document database. Paths are collection paths, e.g. ['users', uid, 'habits'].
 * Firestore is the production implementation; the local adapter mirrors it for development without credentials.
 */
export interface Database {
  readonly kind: 'firestore' | 'local';
  subscribe(path: string[], options: QueryOptions, onData: (docs: StoredDoc[]) => void, onError: (error: unknown) => void): Unsubscribe;
  subscribeDoc(path: string[], id: string, onData: (doc: StoredDoc | null) => void, onError: (error: unknown) => void): Unsubscribe;
  getDoc(path: string[], id: string): Promise<StoredDoc | null>;
  list(path: string[], options?: QueryOptions): Promise<StoredDoc[]>;
  commit(ops: WriteOp[]): Promise<void>;
}

/** Drops `undefined` values, which Firestore rejects and which carry no meaning. */
export function clean(data: DocData): DocData {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
}
