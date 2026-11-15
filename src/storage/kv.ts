/**
 * Minimal async key-value store. IndexedDB first (no 5 MB cap, survives better),
 * localStorage as a fallback for contexts where IDB is unavailable.
 */
const DB = 'shadow-ttt', STORE = 'kv';
let dbp: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbp;
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await open();
  if (db) { try { return await tx<T>(db, 'readonly', (s) => s.get(key)); } catch { /* fall through */ } }
  try { const raw = localStorage.getItem('kv:' + key); return raw ? (JSON.parse(raw) as T) : undefined; } catch { return undefined; }
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  const db = await open();
  if (db) { try { await tx(db, 'readwrite', (s) => s.put(value, key)); return; } catch { /* fall through */ } }
  try { localStorage.setItem('kv:' + key, JSON.stringify(value)); } catch { /* full or blocked */ }
}

export async function kvDel(key: string): Promise<void> {
  const db = await open();
  if (db) { try { await tx(db, 'readwrite', (s) => s.delete(key)); } catch { /* ignore */ } }
  try { localStorage.removeItem('kv:' + key); } catch { /* ignore */ }
}
