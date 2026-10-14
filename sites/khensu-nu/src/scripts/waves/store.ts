// Everything nu.waves keeps lives on the device, in IndexedDB: the files you add, the tracks you keep offline,
// playlists, likes, history, follows and settings. Audio kept on the device is sealed in 64 KiB chunks, each with
// AES-256-GCM under a key that never leaves the browser's key store (it is created non-extractable), and each
// chunk is bound to its file and position so chunks can't be swapped or reordered. Nothing here is sent anywhere.

import type { Tags } from './tags';

export type Ref = { kind: 'cat' | 'file'; id: string };
export const refKey = (r: Ref) => `${r.kind}:${r.id}`;
export const parseRef = (k: string): Ref => {
  const i = k.indexOf(':');
  return { kind: k.slice(0, i) as Ref['kind'], id: k.slice(i + 1) };
};

export type LocalFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  tags: Omit<Tags, 'picture'>;
  art?: Blob;
  added: number;
  /** `copy`: sealed chunks in this database. `handle`: a folder the browser can reopen (Chromium). */
  source: 'copy' | 'handle';
  handle?: FileSystemFileHandle;
  folder?: string;
};

export type Download = {
  trackId: string;
  bytes: number;
  added: number;
  /** Each part (main, original, a stem) is a chunk set under `dl:<trackId>:<part>`. */
  parts: { part: string; type: string; chunks: number }[];
};

export type Playlist = { id: string; name: string; tracks: string[]; created: number; updated: number };
export type HistoryItem = { key: string; at: number; dur: number };
export type Follow = { id: string; kind: 'artist' | 'channel'; added: number };
export type Folder = { id: string; name: string; handle: FileSystemDirectoryHandle; added: number };

const CHUNK = 64 * 1024;
const DB = 'nu-waves';
const VERSION = 1;

let dbp: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      d.createObjectStore('keys', { keyPath: 'id' });
      d.createObjectStore('files', { keyPath: 'id' });
      d.createObjectStore('folders', { keyPath: 'id' });
      const chunks = d.createObjectStore('chunks', { keyPath: 'key' });
      chunks.createIndex('set', 'set');
      d.createObjectStore('downloads', { keyPath: 'trackId' });
      d.createObjectStore('playlists', { keyPath: 'id' });
      d.createObjectStore('likes', { keyPath: 'key' });
      d.createObjectStore('history', { keyPath: 'at' });
      d.createObjectStore('follows', { keyPath: 'id' });
      d.createObjectStore('settings', { keyPath: 'k' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('database blocked'));
  });
  return dbp;
}

const done = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
const finished = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

async function all<T>(store: string): Promise<T[]> {
  const d = await db();
  return done(d.transaction(store).objectStore(store).getAll() as IDBRequest<T[]>);
}
async function get<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  const d = await db();
  return done(d.transaction(store).objectStore(store).get(key) as IDBRequest<T | undefined>);
}
async function put(store: string, value: unknown) {
  const d = await db();
  const tx = d.transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  await finished(tx);
}
async function del(store: string, key: IDBValidKey) {
  const d = await db();
  const tx = d.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  await finished(tx);
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

// MARK: Sealing

let keyp: Promise<CryptoKey> | null = null;
function deviceKey(): Promise<CryptoKey> {
  if (keyp) return keyp;
  keyp = (async () => {
    const have = await get<{ id: string; key: CryptoKey }>('keys', 'device');
    if (have) return have.key;
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await put('keys', { id: 'device', key });
    return key;
  })();
  return keyp;
}

const enc = new TextEncoder();

/** Seals a blob into 64 KiB chunks under `set`, replacing any chunks already there. Returns the chunk count. */
export async function seal(set: string, blob: Blob, onProgress?: (done: number, total: number) => void): Promise<number> {
  const key = await deviceKey();
  await dropSet(set);
  const total = Math.ceil(blob.size / CHUNK) || 1;
  const d = await db();
  // Seal in batches so a 100 MB file doesn't hold one transaction or one buffer.
  const BATCH = 32;
  for (let i = 0; i < total; i += BATCH) {
    const records: { key: string; set: string; i: number; iv: Uint8Array; data: ArrayBuffer }[] = [];
    for (let k = i; k < Math.min(total, i + BATCH); k++) {
      const plain = await blob.slice(k * CHUNK, (k + 1) * CHUNK).arrayBuffer();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(`${set}:${k}`) }, key, plain);
      records.push({ key: `${set}:${String(k).padStart(7, '0')}`, set, i: k, iv, data });
    }
    const tx = d.transaction('chunks', 'readwrite');
    const s = tx.objectStore('chunks');
    for (const r of records) s.put(r);
    await finished(tx);
    onProgress?.(Math.min(total, i + BATCH), total);
  }
  return total;
}

/** Opens a sealed set back into one blob. Fails on any tampered or missing chunk. */
export async function open(set: string, type: string): Promise<Blob> {
  const key = await deviceKey();
  const d = await db();
  const rows = await done(d.transaction('chunks').objectStore('chunks').index('set').getAll(set) as IDBRequest<{ i: number; iv: Uint8Array; data: ArrayBuffer }[]>);
  rows.sort((a, b) => a.i - b.i);
  const parts: ArrayBuffer[] = [];
  for (let k = 0; k < rows.length; k++) {
    if (rows[k].i !== k) throw new Error('missing chunk');
    parts.push(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: rows[k].iv, additionalData: enc.encode(`${set}:${k}`) }, key, rows[k].data));
  }
  return new Blob(parts, { type });
}

export async function dropSet(set: string) {
  const d = await db();
  const tx = d.transaction('chunks', 'readwrite');
  const idx = tx.objectStore('chunks').index('set');
  const keys = await done(idx.getAllKeys(set));
  for (const k of keys) tx.objectStore('chunks').delete(k);
  await finished(tx);
}

// MARK: Files you add

export const files = {
  all: () => all<LocalFile>('files'),
  get: (id: string) => get<LocalFile>('files', id),
  put: (f: LocalFile) => put('files', f),
  async remove(id: string) {
    await dropSet(`file:${id}`);
    await del('files', id);
  },
};

export const folders = {
  all: () => all<Folder>('folders'),
  put: (f: Folder) => put('folders', f),
  remove: (id: string) => del('folders', id),
};

// MARK: Kept offline

export const downloads = {
  all: () => all<Download>('downloads'),
  get: (trackId: string) => get<Download>('downloads', trackId),
  put: (d: Download) => put('downloads', d),
  async remove(trackId: string) {
    const d = await get<Download>('downloads', trackId);
    for (const p of d?.parts ?? []) await dropSet(`dl:${trackId}:${p.part}`);
    await del('downloads', trackId);
  },
};

// MARK: Playlists, likes, history, follows, settings

export const playlists = {
  all: async () => (await all<Playlist>('playlists')).sort((a, b) => b.updated - a.updated),
  get: (id: string) => get<Playlist>('playlists', id),
  put: (p: Playlist) => put('playlists', p),
  remove: (id: string) => del('playlists', id),
};

export const likes = {
  all: async () => (await all<{ key: string; added: number }>('likes')).sort((a, b) => b.added - a.added),
  has: async (key: string) => !!(await get('likes', key)),
  set: (key: string, on: boolean) => (on ? put('likes', { key, added: Date.now() }) : del('likes', key)),
};

export const history = {
  recent: async (n = 60) => {
    const rows = await all<HistoryItem>('history');
    rows.sort((a, b) => b.at - a.at);
    return rows.slice(0, n);
  },
  async add(key: string, dur: number) {
    await put('history', { key, at: Date.now(), dur });
    const rows = await all<HistoryItem>('history');
    if (rows.length > 500) {
      rows.sort((a, b) => a.at - b.at);
      const d = await db();
      const tx = d.transaction('history', 'readwrite');
      for (const r of rows.slice(0, rows.length - 500)) tx.objectStore('history').delete(r.at);
      await finished(tx);
    }
  },
  clear: async () => {
    const d = await db();
    const tx = d.transaction('history', 'readwrite');
    tx.objectStore('history').clear();
    await finished(tx);
  },
};

export const follows = {
  all: () => all<Follow>('follows'),
  has: async (id: string) => !!(await get('follows', id)),
  set: (id: string, kind: Follow['kind'], on: boolean) => (on ? put('follows', { id, kind, added: Date.now() }) : del('follows', id)),
};

export const settings = {
  async get<T>(k: string, fallback: T): Promise<T> {
    const row = await get<{ k: string; v: T }>('settings', k);
    return row ? row.v : fallback;
  },
  set: (k: string, v: unknown) => put('settings', { k, v }),
};

/** Bytes used by sealed audio, for the Library's storage line. */
export async function usage(): Promise<{ bytes: number; quota: number }> {
  try {
    const est = await navigator.storage?.estimate?.();
    return { bytes: est?.usage ?? 0, quota: est?.quota ?? 0 };
  } catch {
    return { bytes: 0, quota: 0 };
  }
}

export async function persist() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* the browser decides */
  }
}
