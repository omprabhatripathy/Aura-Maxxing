import { clean, type Database, type DocData, type QueryOptions, type StoredDoc, type WriteOp } from './types';

const PREFIX = 'aura-db:';

type Collection = Record<string, DocData>;

function keyFor(path: string[]): string {
  return PREFIX + path.join('/');
}

function read(path: string[]): Collection {
  try {
    return JSON.parse(localStorage.getItem(keyFor(path)) ?? '{}') as Collection;
  } catch {
    return {};
  }
}

function applyQuery(collection: Collection, options: QueryOptions): StoredDoc[] {
  let docs = Object.entries(collection).map(([id, data]) => ({ id, data }));
  if (options.orderBy) {
    const field = options.orderBy;
    const dir = options.direction === 'desc' ? -1 : 1;
    docs = docs.sort((a, b) => String(a.data[field] ?? '').localeCompare(String(b.data[field] ?? '')) * dir);
  }
  return options.limit ? docs.slice(0, options.limit) : docs;
}

/** localStorage-backed implementation of the Database contract, used only when Firebase is not configured. */
export function createLocalDatabase(): Database {
  const listeners = new Map<string, Set<() => void>>();

  function notify(key: string) {
    listeners.get(key)?.forEach((fn) => fn());
  }

  function listen(key: string, fn: () => void): () => void {
    const set = listeners.get(key) ?? new Set();
    set.add(fn);
    listeners.set(key, set);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) fn();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      set.delete(fn);
      window.removeEventListener('storage', onStorage);
    };
  }

  return {
    kind: 'local',

    subscribe(path, options, onData, onError) {
      const emit = () => {
        try {
          onData(applyQuery(read(path), options));
        } catch (error) {
          onError(error);
        }
      };
      queueMicrotask(emit);
      return listen(keyFor(path), emit);
    },

    subscribeDoc(path, id, onData, onError) {
      const emit = () => {
        try {
          const data = read(path)[id];
          onData(data ? { id, data } : null);
        } catch (error) {
          onError(error);
        }
      };
      queueMicrotask(emit);
      return listen(keyFor(path), emit);
    },

    async getDoc(path, id) {
      const data = read(path)[id];
      return data ? { id, data } : null;
    },

    async list(path, options = {}) {
      return applyQuery(read(path), options);
    },

    async commit(ops: WriteOp[]) {
      const touched = new Map<string, Collection>();
      for (const op of ops) {
        const key = keyFor(op.path);
        const collection = touched.get(key) ?? read(op.path);
        if (op.type === 'delete') delete collection[op.id];
        else collection[op.id] = clean(op.merge ? { ...collection[op.id], ...op.data } : op.data);
        touched.set(key, collection);
      }
      try {
        touched.forEach((collection, key) => localStorage.setItem(key, JSON.stringify(collection)));
      } catch {
        throw Object.assign(new Error('Device storage is full.'), { code: 'resource-exhausted' });
      }
      touched.forEach((_, key) => notify(key));
    },
  };
}
