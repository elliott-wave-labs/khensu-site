// Reads title, artist, album, year, track number and cover art out of the files people already have: ID3v2 on MP3,
// iTunes-style atoms in M4A and MP4, Vorbis comments in FLAC, Ogg Vorbis and Opus. Everything is parsed on the
// device from the first and last few hundred kilobytes of the file; nothing is uploaded or looked up.

export type Tags = {
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  track?: number;
  year?: number;
  genre?: string;
  picture?: Blob;
  duration?: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;
};

const latin1 = new TextDecoder('latin1');
const utf8 = new TextDecoder('utf-8');
const utf16 = new TextDecoder('utf-16le');
const utf16be = new TextDecoder('utf-16be');

const fourcc = (b: Uint8Array, i: number) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
const u32 = (b: Uint8Array, i: number) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
const u32le = (b: Uint8Array, i: number) => (b[i] + (b[i + 1] << 8) + (b[i + 2] << 16) + (b[i + 3] << 24)) >>> 0;
const u16 = (b: Uint8Array, i: number) => (b[i] << 8) + b[i + 1];
const syncsafe = (b: Uint8Array, i: number) => (b[i] << 21) | (b[i + 1] << 14) | (b[i + 2] << 7) | b[i + 3];
const trimNul = (s: string) => s.replace(/\0+$/g, '').replace(/^\0+/, '').trim();

const bytesOf = async (blob: Blob, start: number, end: number) => new Uint8Array(await blob.slice(start, Math.min(end, blob.size)).arrayBuffer());

/** Decodes an ID3 text payload by its encoding byte. */
function id3Text(b: Uint8Array, enc: number): string {
  if (enc === 1) {
    if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) return trimNul(utf16be.decode(b.subarray(2)));
    if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) return trimNul(utf16.decode(b.subarray(2)));
    return trimNul(utf16.decode(b));
  }
  if (enc === 2) return trimNul(utf16be.decode(b));
  if (enc === 3) return trimNul(utf8.decode(b));
  return trimNul(latin1.decode(b));
}

/** Index just past a terminator in the given encoding, starting at i. */
function pastNul(b: Uint8Array, i: number, enc: number): number {
  if (enc === 1 || enc === 2) {
    for (let k = i; k + 1 < b.length; k += 2) if (b[k] === 0 && b[k + 1] === 0) return k + 2;
    return b.length;
  }
  for (let k = i; k < b.length; k++) if (b[k] === 0) return k + 1;
  return b.length;
}

function deUnsync(b: Uint8Array): Uint8Array {
  const out = new Uint8Array(b.length);
  let n = 0;
  for (let i = 0; i < b.length; i++) {
    out[n++] = b[i];
    if (b[i] === 0xff && b[i + 1] === 0x00) i++;
  }
  return out.subarray(0, n);
}

function parseYear(s: string | undefined): number | undefined {
  const m = s?.match(/\d{4}/);
  return m ? Number(m[0]) : undefined;
}

async function readId3(blob: Blob, out: Tags): Promise<boolean> {
  const head = await bytesOf(blob, 0, 10);
  if (head.length < 10 || fourcc(head, 0).slice(0, 3) !== 'ID3') return false;
  const ver = head[3];
  const flags = head[5];
  const size = syncsafe(head, 6);
  let body = await bytesOf(blob, 10, 10 + Math.min(size, 8 << 20));
  if (ver === 3 && flags & 0x80) body = deUnsync(body);
  let i = 0;
  if (flags & 0x40) {
    // Extended header: v2.3 size is plain and excludes itself; v2.4 is syncsafe and includes itself.
    i += ver === 4 ? syncsafe(body, 0) : u32(body, 0) + 4;
  }
  const idLen = ver === 2 ? 3 : 4;
  while (i + idLen + (ver === 2 ? 3 : 6) <= body.length) {
    const id = ver === 2 ? String.fromCharCode(body[i], body[i + 1], body[i + 2]) : fourcc(body, i);
    if (!/^[A-Z0-9]+$/.test(id)) break;
    let fsize: number;
    let fflags = 0;
    if (ver === 2) {
      fsize = (body[i + 3] << 16) + (body[i + 4] << 8) + body[i + 5];
      i += 6;
    } else {
      fsize = ver === 4 ? syncsafe(body, i + 4) : u32(body, i + 4);
      fflags = body[i + 9];
      i += 10;
    }
    if (fsize <= 0 || i + fsize > body.length) break;
    let data = body.subarray(i, i + fsize);
    i += fsize;
    if (ver === 4 && fflags & 0x01) data = data.subarray(4);
    if (ver === 4 && fflags & 0x02) data = deUnsync(data);
    const text = () => id3Text(data.subarray(1), data[0]).split('\0')[0];
    switch (id) {
      case 'TIT2':
      case 'TT2':
        out.title ??= text();
        break;
      case 'TPE1':
      case 'TP1':
        out.artist ??= text();
        break;
      case 'TPE2':
      case 'TP2':
        out.albumArtist ??= text();
        break;
      case 'TALB':
      case 'TAL':
        out.album ??= text();
        break;
      case 'TRCK':
      case 'TRK':
        out.track ??= parseInt(text(), 10) || undefined;
        break;
      case 'TYER':
      case 'TDRC':
      case 'TYE':
      case 'TDRL':
        out.year ??= parseYear(text());
        break;
      case 'TCON':
      case 'TCO':
        out.genre ??= text().replace(/^\(\d+\)/, '');
        break;
      case 'APIC':
      case 'PIC': {
        if (out.picture) break;
        const enc = data[0];
        let p = 1;
        let mime: string;
        if (id === 'PIC') {
          const fmt = latin1.decode(data.subarray(1, 4)).toUpperCase();
          mime = fmt === 'PNG' ? 'image/png' : 'image/jpeg';
          p = 4;
        } else {
          const end = pastNul(data, 1, 0);
          mime = trimNul(latin1.decode(data.subarray(1, end))) || 'image/jpeg';
          if (!mime.includes('/')) mime = `image/${mime.toLowerCase()}`;
          p = end;
        }
        p += 1; // picture type
        p = pastNul(data, p, enc);
        if (p < data.length) out.picture = new Blob([data.slice(p)], { type: mime });
        break;
      }
    }
  }
  return true;
}

type Atom = { type: string; start: number; size: number; body: number };

function atoms(b: Uint8Array, from: number, to: number): Atom[] {
  const list: Atom[] = [];
  let i = from;
  while (i + 8 <= to) {
    let size = u32(b, i);
    const type = fourcc(b, i + 4);
    let body = i + 8;
    if (size === 1) {
      size = u32(b, i + 12) + u32(b, i + 8) * 2 ** 32;
      body = i + 16;
    } else if (size === 0) size = to - i;
    if (size < 8) break;
    list.push({ type, start: i, size, body });
    i += size;
  }
  return list;
}

async function readMp4(blob: Blob, out: Tags): Promise<boolean> {
  const head = await bytesOf(blob, 0, 12);
  if (head.length < 12 || fourcc(head, 4) !== 'ftyp') return false;
  // Walk the top-level atoms by header only, then read moov in full.
  let pos = 0;
  let moov: { start: number; size: number } | null = null;
  for (let n = 0; n < 64 && pos + 16 <= blob.size; n++) {
    const h = await bytesOf(blob, pos, pos + 16);
    let size = u32(h, 0);
    const type = fourcc(h, 4);
    if (size === 1) size = u32(h, 12) + u32(h, 8) * 2 ** 32;
    else if (size === 0) size = blob.size - pos;
    if (size < 8) break;
    if (type === 'moov') {
      moov = { start: pos, size };
      break;
    }
    pos += size;
  }
  if (!moov || moov.size > 32 << 20) return true;
  const b = await bytesOf(blob, moov.start, moov.start + moov.size);
  const root = atoms(b, 0, b.length)[0];
  if (!root || root.type !== 'moov') return true;
  for (const a of atoms(b, root.body, root.start + root.size)) {
    if (a.type === 'mvhd') {
      const v = b[a.body];
      const ts = v === 1 ? u32(b, a.body + 20) : u32(b, a.body + 12);
      const d = v === 1 ? u32(b, a.body + 28) + u32(b, a.body + 24) * 2 ** 32 : u32(b, a.body + 16);
      if (ts > 0) out.duration = d / ts;
    }
    if (a.type === 'trak') {
      for (const m of atoms(b, a.body, a.start + a.size)) {
        if (m.type !== 'mdia') continue;
        for (const x of atoms(b, m.body, m.start + m.size)) {
          if (x.type !== 'minf') continue;
          for (const y of atoms(b, x.body, x.start + x.size)) {
            if (y.type !== 'stbl') continue;
            for (const z of atoms(b, y.body, y.start + y.size)) {
              if (z.type !== 'stsd') continue;
              const entry = atoms(b, z.body + 8, z.start + z.size)[0];
              if (!entry) continue;
              out.codec = entry.type === 'mp4a' ? 'AAC' : entry.type === 'alac' ? 'ALAC' : entry.type === 'Opus' ? 'Opus' : entry.type === 'fLaC' ? 'FLAC' : entry.type;
              out.channels = u16(b, entry.body + 16);
              out.sampleRate = u16(b, entry.body + 24);
            }
          }
        }
      }
    }
    if (a.type !== 'udta') continue;
    for (const meta of atoms(b, a.body, a.start + a.size)) {
      if (meta.type !== 'meta') continue;
      for (const ilst of atoms(b, meta.body + 4, meta.start + meta.size)) {
        if (ilst.type !== 'ilst') continue;
        for (const item of atoms(b, ilst.body, ilst.start + ilst.size)) {
          const data = atoms(b, item.body, item.start + item.size).find((d) => d.type === 'data');
          if (!data) continue;
          const kind = u32(b, data.body) & 0xffffff;
          const payload = b.subarray(data.body + 8, data.start + data.size);
          const text = () => trimNul(utf8.decode(payload));
          switch (item.type) {
            case '\u00a9nam':
              out.title ??= text();
              break;
            case '\u00a9ART':
              out.artist ??= text();
              break;
            case 'aART':
              out.albumArtist ??= text();
              break;
            case '\u00a9alb':
              out.album ??= text();
              break;
            case '\u00a9day':
              out.year ??= parseYear(text());
              break;
            case '\u00a9gen':
            case 'gnre':
              out.genre ??= kind === 1 ? text() : undefined;
              break;
            case 'trkn':
              if (payload.length >= 4) out.track ??= u16(payload, 2) || undefined;
              break;
            case 'covr':
              if (!out.picture && payload.length) out.picture = new Blob([payload.slice()], { type: kind === 14 ? 'image/png' : 'image/jpeg' });
              break;
          }
        }
      }
    }
  }
  return true;
}

function vorbisComments(b: Uint8Array, i: number, out: Tags): number {
  const vendorLen = u32le(b, i);
  i += 4 + vendorLen;
  if (i > b.length) return i;
  const n = u32le(b, i);
  i += 4;
  for (let k = 0; k < n && i + 4 <= b.length; k++) {
    const len = u32le(b, i);
    i += 4;
    if (i + len > b.length) break;
    const s = utf8.decode(b.subarray(i, i + len));
    i += len;
    const eq = s.indexOf('=');
    if (eq < 0) continue;
    const key = s.slice(0, eq).toUpperCase();
    const val = s.slice(eq + 1).trim();
    switch (key) {
      case 'TITLE':
        out.title ??= val;
        break;
      case 'ARTIST':
        out.artist ??= val;
        break;
      case 'ALBUMARTIST':
      case 'ALBUM ARTIST':
        out.albumArtist ??= val;
        break;
      case 'ALBUM':
        out.album ??= val;
        break;
      case 'DATE':
      case 'YEAR':
        out.year ??= parseYear(val);
        break;
      case 'GENRE':
        out.genre ??= val;
        break;
      case 'TRACKNUMBER':
        out.track ??= parseInt(val, 10) || undefined;
        break;
      case 'METADATA_BLOCK_PICTURE':
        if (!out.picture) {
          try {
            const bin = Uint8Array.from(atob(val), (c) => c.charCodeAt(0));
            flacPicture(bin, out);
          } catch {
            /* not a picture */
          }
        }
        break;
    }
  }
  return i;
}

function flacPicture(b: Uint8Array, out: Tags) {
  let i = 4; // picture type
  const mimeLen = u32(b, i);
  i += 4;
  const mime = latin1.decode(b.subarray(i, i + mimeLen)) || 'image/jpeg';
  i += mimeLen;
  const descLen = u32(b, i);
  i += 4 + descLen + 16; // description, width, height, depth, colours
  const dataLen = u32(b, i);
  i += 4;
  if (dataLen > 0 && i + dataLen <= b.length) out.picture = new Blob([b.slice(i, i + dataLen)], { type: mime });
}

async function readFlac(blob: Blob, out: Tags): Promise<boolean> {
  const head = await bytesOf(blob, 0, 4);
  if (fourcc(head, 0) !== 'fLaC') return false;
  out.codec = 'FLAC';
  let pos = 4;
  for (let n = 0; n < 64; n++) {
    const h = await bytesOf(blob, pos, pos + 4);
    if (h.length < 4) break;
    const last = (h[0] & 0x80) !== 0;
    const type = h[0] & 0x7f;
    const len = (h[1] << 16) + (h[2] << 8) + h[3];
    if (type === 0) {
      const si = await bytesOf(blob, pos + 4, pos + 4 + 34);
      const sr = (si[10] << 12) | (si[11] << 4) | (si[12] >> 4);
      const ch = ((si[12] >> 1) & 7) + 1;
      const total = ((si[13] & 0x0f) * 2 ** 32) + u32(si, 14);
      out.sampleRate = sr;
      out.channels = ch;
      if (sr > 0 && total > 0) out.duration = total / sr;
    } else if (type === 4 && len < (4 << 20)) {
      vorbisComments(await bytesOf(blob, pos + 4, pos + 4 + len), 0, out);
    } else if (type === 6 && len < (16 << 20) && !out.picture) {
      flacPicture(await bytesOf(blob, pos + 4, pos + 4 + len), out);
    }
    pos += 4 + len;
    if (last) break;
  }
  return true;
}

async function readOgg(blob: Blob, out: Tags): Promise<boolean> {
  const head = await bytesOf(blob, 0, 4);
  if (fourcc(head, 0) !== 'OggS') return false;
  const b = await bytesOf(blob, 0, 512 << 10);
  const text = latin1.decode(b);
  let i = text.indexOf('OpusTags');
  let rate = 48000;
  if (i >= 0) {
    out.codec = 'Opus';
    vorbisComments(b, i + 8, out);
  } else {
    i = text.indexOf('\u0003vorbis');
    if (i >= 0) {
      out.codec = 'Vorbis';
      vorbisComments(b, i + 7, out);
      const id = text.indexOf('\u0001vorbis');
      if (id >= 0) {
        out.channels = b[id + 11];
        rate = u32le(b, id + 12);
        out.sampleRate = rate;
      }
    }
  }
  // Duration from the last page's granule position.
  const tail = await bytesOf(blob, Math.max(0, blob.size - (64 << 10)), blob.size);
  const tt = latin1.decode(tail);
  const last = tt.lastIndexOf('OggS');
  if (last >= 0 && last + 14 <= tail.length) {
    const granule = u32le(tail, last + 6) + u32le(tail, last + 10) * 2 ** 32;
    if (granule > 0) out.duration = granule / rate;
  }
  return true;
}

/** Title and artist from a file name like "Artist - Title.mp3" or "03 Title.m4a". */
export function tagsFromName(name: string): Pick<Tags, 'title' | 'artist' | 'track'> {
  const base = name.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim();
  const m = base.match(/^(\d{1,3})[\s.\-–]+(.+)$/);
  const track = m ? Number(m[1]) : undefined;
  const rest = m ? m[2] : base;
  const parts = rest.split(/\s[-–]\s/);
  if (parts.length >= 2) return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim(), track };
  return { title: rest.trim(), track };
}

export async function readTags(blob: Blob, name = ''): Promise<Tags> {
  const out: Tags = {};
  try {
    (await readId3(blob, out)) || (await readMp4(blob, out)) || (await readFlac(blob, out)) || (await readOgg(blob, out));
  } catch {
    /* an odd file still plays; it just keeps its file name */
  }
  if (!out.codec) {
    const ext = name.split('.').pop()?.toLowerCase();
    out.codec = ext === 'mp3' ? 'MP3' : ext === 'm4a' || ext === 'mp4' ? 'AAC' : ext === 'wav' ? 'PCM' : ext === 'aiff' || ext === 'aif' ? 'PCM' : ext?.toUpperCase();
  }
  const fromName = tagsFromName(name);
  out.title ||= fromName.title;
  out.artist ||= fromName.artist;
  out.track ??= fromName.track;
  return out;
}
