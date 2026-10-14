// Your library: the files you add from this device, a folder the browser can reopen, the music on your phone (through
// the nu.waves app), and the catalogue tracks you keep offline. Each becomes a PlayTrack the engine plays like any
// other, with left and right as two sounds you can move. Files are read and sealed here; nothing is uploaded.

import { ALBUMS, ARTISTS, TRACKS, albumOf, artistOf, type Track } from '../../data/waves';
import type { PlayTrack } from './engine';
import { readTags, type Tags } from './tags';
import { downloads, files, folders, open, seal, uid, type Download, type LocalFile } from './store';
import { nativeBridge } from './head';

export type NativeItem = { id: string; title: string; artist?: string; album?: string; dur: number; url: string; art?: string };

const AUDIO_EXT = /\.(mp3|m4a|aac|mp4|wav|flac|ogg|oga|opus|aif|aiff|caf|webm)$/i;
const audioType = (name: string, type: string) => {
  if (type) return type;
  const ext = name.toLowerCase().split('.').pop();
  return { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', mp4: 'audio/mp4', wav: 'audio/wav', flac: 'audio/flac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', aif: 'audio/aiff', aiff: 'audio/aiff', caf: 'audio/x-caf', webm: 'audio/webm' }[ext ?? ''] ?? 'audio/*';
};

export const durationOf = (blob: Blob): Promise<number> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const a = new Audio();
    a.preload = 'metadata';
    const done = (d: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) ? d : 0);
    };
    a.onloadedmetadata = () => done(a.duration);
    a.onerror = () => done(0);
    a.src = url;
  });

let native: NativeItem[] = [];
const nativeListeners = new Set<() => void>();
export const nativeItems = () => native;
export function onNativeLibrary(cb: () => void) {
  nativeListeners.add(cb);
  return () => nativeListeners.delete(cb);
}
if (typeof window !== 'undefined') {
  window.__wavesNative = window.__wavesNative ?? {};
  window.__wavesNative.library = (items: NativeItem[]) => {
    native = items;
    for (const l of nativeListeners) l();
  };
}
/** Asks the nu.waves app for the music on this device; it answers through `__wavesNative.library`. */
export function requestNativeLibrary() {
  nativeBridge()?.postMessage({ type: 'library' });
}

// MARK: Adding files

export type AddProgress = { done: number; total: number; name: string };

/** Copies files into the sealed library. Big files are sealed in 64 KiB chunks as they stream in. */
export async function addFiles(list: FileList | File[], onProgress?: (p: AddProgress) => void): Promise<LocalFile[]> {
  const added: LocalFile[] = [];
  const arr = [...list].filter((f) => f.type.startsWith('audio/') || AUDIO_EXT.test(f.name));
  let i = 0;
  for (const f of arr) {
    onProgress?.({ done: i, total: arr.length, name: f.name });
    const rec = await describe(f, f.name, 'copy');
    await seal(`file:${rec.id}`, f);
    await files.put(rec);
    added.push(rec);
    i++;
  }
  onProgress?.({ done: arr.length, total: arr.length, name: '' });
  return added;
}

async function describe(blob: Blob, name: string, source: LocalFile['source']): Promise<LocalFile> {
  let tags: Tags = {};
  try {
    tags = await readTags(blob, name);
  } catch {
    tags = {};
  }
  const { picture, ...rest } = tags;
  if (!rest.duration) rest.duration = await durationOf(blob);
  return { id: uid(), name, size: blob.size, type: audioType(name, blob.type), tags: rest, art: picture, added: Date.now(), source };
}

/** Chromium: picks a folder and lists its audio without copying; the browser remembers the handle. */
export const canPickFolder = () => 'showDirectoryPicker' in window;
export async function addFolder(onProgress?: (p: AddProgress) => void): Promise<LocalFile[]> {
  const picker = (window as unknown as { showDirectoryPicker?: (o?: { mode?: string }) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
  if (!picker) return [];
  const dir = await picker({ mode: 'read' });
  const folderId = uid();
  await folders.put({ id: folderId, name: dir.name, handle: dir, added: Date.now() });
  const found: { handle: FileSystemFileHandle; path: string }[] = [];
  const walk = async (d: FileSystemDirectoryHandle, path: string, depth: number) => {
    if (depth > 6) return;
    for await (const [name, h] of d as unknown as AsyncIterable<[string, FileSystemHandle]>) {
      if (h.kind === 'file' && AUDIO_EXT.test(name)) found.push({ handle: h as FileSystemFileHandle, path: `${path}${name}` });
      else if (h.kind === 'directory') await walk(h as FileSystemDirectoryHandle, `${path}${name}/`, depth + 1);
    }
  };
  await walk(dir, '', 0);
  const added: LocalFile[] = [];
  let i = 0;
  for (const f of found) {
    onProgress?.({ done: i++, total: found.length, name: f.path });
    const file = await f.handle.getFile();
    const rec = await describe(file, file.name, 'handle');
    rec.handle = f.handle;
    rec.folder = folderId;
    await files.put(rec);
    added.push(rec);
  }
  onProgress?.({ done: found.length, total: found.length, name: '' });
  return added;
}

// MARK: Playing your files

const LOCAL_ARTIST = 'your-files';

export function trackOfFile(f: LocalFile): PlayTrack {
  const t = f.tags;
  return {
    id: `file:${f.id}`,
    title: t.title || f.name.replace(/\.[^.]+$/, ''),
    artistId: LOCAL_ARTIST,
    artistName: t.artist || t.albumArtist || 'Unknown artist',
    albumTitle: t.album,
    dur: t.duration ?? 0,
    bytes: f.size,
    year: t.year,
    kind: 'song',
    spatial: 'stereo',
    spec: [t.codec, t.sampleRate ? `${(t.sampleRate / 1000).toFixed(1)} kHz` : '', t.channels === 1 ? 'mono' : t.channels ? 'stereo' : ''].filter(Boolean).join(' · ') || f.type,
    licence: 'Your file. It stays on this device.',
    tags: t.genre ? [t.genre.toLowerCase()] : [],
    local: true,
  };
}

/** Opens the file behind a library track right before it plays: an object URL for the sealed copy or the handle. */
export async function loadFile(f: LocalFile): Promise<PlayTrack> {
  const t = trackOfFile(f);
  let blob: Blob;
  if (f.source === 'handle' && f.handle) {
    const h = f.handle as FileSystemFileHandle & { queryPermission?: (o: { mode: string }) => Promise<string>; requestPermission?: (o: { mode: string }) => Promise<string> };
    if (h.queryPermission && (await h.queryPermission({ mode: 'read' })) !== 'granted') {
      if (!h.requestPermission || (await h.requestPermission({ mode: 'read' })) !== 'granted') throw new Error('The folder needs permission again.');
    }
    blob = await h.getFile();
  } else blob = await open(`file:${f.id}`, f.type);
  const url = URL.createObjectURL(blob);
  t.src = [{ url, type: f.type }];
  t.revoke = [url];
  if (f.art) {
    const a = URL.createObjectURL(f.art);
    t.artUrl = a;
    t.revoke.push(a);
  }
  return t;
}

export function trackOfNative(n: NativeItem): PlayTrack {
  return {
    id: `native:${n.id}`,
    title: n.title,
    artistId: LOCAL_ARTIST,
    artistName: n.artist || 'Unknown artist',
    albumTitle: n.album,
    artUrl: n.art,
    dur: n.dur,
    kind: 'song',
    spatial: 'stereo',
    src: [{ url: n.url, type: '' }],
    licence: 'On this device.',
    tags: [],
    local: true,
  };
}

// MARK: Keeping catalogue tracks offline

export type KeepProgress = { trackId: string; done: number; total: number; part: string };

const partsOf = (t: Track): { part: string; url: string; type: string }[] => {
  const parts: { part: string; url: string; type: string }[] = [];
  if (t.spatial === 'stems' && t.stems) {
    const o = t.original?.[0] ?? t.src?.[0];
    if (o) parts.push({ part: 'original', url: o.url, type: o.type });
    for (const s of t.stems) parts.push({ part: `stem:${s.id}`, url: s.url, type: 'audio/mp4' });
  } else if (t.src?.[0]) parts.push({ part: 'main', url: t.src[0].url, type: t.src[0].type });
  else if (t.gen?.type === 'clip') parts.push({ part: 'clip', url: t.gen.url, type: 'audio/mp4' });
  return parts;
};

/** Fetches a track's files and seals them on the device. Generated sounds need nothing. */
export async function keep(t: Track, onProgress?: (p: KeepProgress) => void): Promise<Download | null> {
  const parts = partsOf(t);
  if (!parts.length) return null;
  let bytes = 0;
  const kept: Download['parts'] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    onProgress?.({ trackId: t.id, done: i, total: parts.length, part: p.part });
    const res = await fetch(p.url);
    if (!res.ok) throw new Error(`${p.url}: ${res.status}`);
    const blob = await res.blob();
    bytes += blob.size;
    const chunks = await seal(`dl:${t.id}:${p.part}`, blob);
    kept.push({ part: p.part, type: p.type || blob.type, chunks });
  }
  const d: Download = { trackId: t.id, bytes, added: Date.now(), parts: kept };
  await downloads.put(d);
  onProgress?.({ trackId: t.id, done: parts.length, total: parts.length, part: '' });
  return d;
}

export const unkeep = (trackId: string) => downloads.remove(trackId);

/** The catalogue track with its sources swapped for the sealed copies, when it has been kept. */
export async function fromKept(t: Track, d: Download): Promise<PlayTrack> {
  const revoke: string[] = [];
  const urlOf = async (part: string, type: string) => {
    const blob = await open(`dl:${t.id}:${part}`, type);
    const u = URL.createObjectURL(blob);
    revoke.push(u);
    return u;
  };
  const out: PlayTrack = { ...decorate(t), revoke };
  for (const p of d.parts) {
    if (p.part === 'original') out.original = [{ url: await urlOf(p.part, p.type), type: p.type }];
    else if (p.part === 'main') out.src = [{ url: await urlOf(p.part, p.type), type: p.type }];
    else if (p.part.startsWith('stem:') && out.stems) {
      const id = p.part.slice(5);
      out.stems = out.stems.map((s) => (s.id === id ? { ...s, url: '' } : s));
      const u = await urlOf(p.part, p.type);
      out.stems = out.stems.map((s) => (s.id === id ? { ...s, url: u } : s));
    } else if (p.part === 'clip' && out.gen?.type === 'clip') out.gen = { ...out.gen, url: await urlOf(p.part, p.type) };
  }
  out.bed = undefined;
  return out;
}

/** Fills in the names the player shows. */
export function decorate(t: Track): PlayTrack {
  const a = artistOf(t.artistId);
  const al = t.albumId ? albumOf(t.albumId) : undefined;
  return { ...t, artistName: a?.name, albumTitle: al?.title, artUrl: al?.art || a?.art || undefined };
}

/** Resolves any track id (catalogue, kept, file or native) to something the engine can play. */
export async function resolve(id: string): Promise<PlayTrack | undefined> {
  if (id.startsWith('file:')) {
    const f = await files.get(id.slice(5));
    return f ? loadFile(f) : undefined;
  }
  if (id.startsWith('native:')) {
    const n = native.find((x) => `native:${x.id}` === id);
    return n ? trackOfNative(n) : undefined;
  }
  const t = TRACKS.find((x) => x.id === id);
  if (!t) return undefined;
  const d = await downloads.get(id).catch(() => undefined);
  if (d) {
    try {
      return await fromKept(t, d);
    } catch {
      /* a chunk failed to open: stream instead */
    }
  }
  return decorate(t);
}

export const catalogueArtists = () => ARTISTS;
export const catalogueAlbums = () => ALBUMS;
