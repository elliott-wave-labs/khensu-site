// Instagram Story / Reel Share Studio + îňðřæ.ōġ (nu.indra.og) Preview Renderer + Apple Speech Word-Pop Lyrics.
// Powers:
// 1. Spotify-style scrolling lyrics panel on the stage player with Instagram Story word-pop animation and
//    role badges (lead, chorus, backing, spoken).
// 2. Live word-pop lyric ticker inside the floating mini-player bar.
// 3. 9:16 Instagram Story / Reel, 16:9 îňðřæ.ōġ Messages Card, and 1:1 webË Square studio that renders the
//    complete uncut 3D spacetime bubble™ (Fibonacci point sphere + 3D ear-level threads + Indra's Net),
//    animated word-pop lyrics, embedded mini-player card, and waves.khensu.nu / Apple SharePlay sticker.

import { lyricLine, mmss, type LyricLine, type LyricRole, type LyricWord } from '../../data/waves';
import type { Engine, PlayTrack } from './engine';
import { storyUrl } from './scene';

const STORAGE_PREFIX = 'nu.waves.lyrics.';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// Precompute 420 Fibonacci sphere points for the 2D/video canvas twin of the 3D spacetime bubble™
const FIB_N = 420;
const FIB_PTS: { x: number; y: number; z: number }[] = [];
for (let i = 0; i < FIB_N; i++) {
  const y = 1 - (i / (FIB_N - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = i * Math.PI * (3 - Math.sqrt(5));
  FIB_PTS.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
}

// Precompute Indra's Net background nodes
const NET_PTS = Array.from({ length: 28 }, (_, i) => ({
  u: ((i * 37 + 13) % 100) / 100,
  v: ((i * 61 + 29) % 100) / 100,
  phase: i * 0.7,
}));

export function lyricsForTrack(track: PlayTrack | null | undefined): LyricLine[] {
  if (!track) return [];
  try {
    const custom = localStorage.getItem(`${STORAGE_PREFIX}${track.id}`);
    if (custom) {
      const parsed = JSON.parse(custom) as LyricLine[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  if (track.lyrics?.length) return track.lyrics;
  const dur = Math.max(24, track.dur || 60);
  const by = track.artistName || 'khėnsu.ñü';
  const spec = (track.spec || '3D spatial audio').replace(/ · generated.*$/, '');
  if (track.kind === 'generator') {
    return [
      lyricLine(0, dur * 0.25, `${track.title} · ${spec}`, 'lead', 'frequency'),
      lyricLine(dur * 0.25, dur * 0.5, '(on-device synthesis · zero bytes streamed)', 'backing', 'backing field'),
      lyricLine(dur * 0.5, dur * 0.75, 'Drag this sound anywhere inside the spacetime bubble', 'chorus', '3D spatial'),
      lyricLine(dur * 0.75, dur, `(breathe in · ${by} · waves.khensu.nu)`, 'backing', 'harmonic loop'),
    ];
  }
  return [
    lyricLine(0, Math.min(10, dur * 0.15), `${track.title} · ${by}`, 'spoken', 'intro'),
    lyricLine(Math.min(10, dur * 0.15), Math.min(24, dur * 0.35), `Opening theme in 3D space · ${spec}`, 'lead', 'lead motif'),
    lyricLine(Math.min(24, dur * 0.35), Math.min(40, dur * 0.55), '(room resonance & stereo harmonic field)', 'backing', 'backing harmony'),
    lyricLine(Math.min(40, dur * 0.55), Math.min(60, dur * 0.8), 'Move every sound around you in the spacetime bubble', 'chorus', 'chorus theme'),
    lyricLine(Math.min(60, dur * 0.8), dur, `(${track.albumTitle || 'nu.waves'} · streaming on waves.khensu.nu)`, 'backing', 'coda'),
  ];
}

export function saveCustomLyrics(trackId: string, lines: LyricLine[] | null) {
  try {
    if (!lines || !lines.length) localStorage.removeItem(`${STORAGE_PREFIX}${trackId}`);
    else localStorage.setItem(`${STORAGE_PREFIX}${trackId}`, JSON.stringify(lines));
  } catch {
    /* ignore */
  }
}

/** Parses either Apple Speech JSON output (`waves-lyrics-speech.swift`) or LRC / timestamped lines with `[chorus]` / `[backing]` tags. */
export function parseCustomLyrics(raw: string, fallbackDur = 180): LyricLine[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(trimmed);
      if (Array.isArray(json) && json.length && typeof json[0].t === 'number' && Array.isArray(json[0].words)) {
        return json as LyricLine[];
      }
    } catch {
      /* fall through to LRC parser */
    }
  }
  const rows = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const parsed: { t: number; role: LyricRole; tag?: string; phrase: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    let line = rows[i];
    let t = (i / Math.max(1, rows.length)) * fallbackDur;
    const m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
    if (m) {
      t = Number(m[1]) * 60 + Number(m[2]);
      line = m[3];
    }
    let role: LyricRole = 'lead';
    let tag: string | undefined;
    const roleMatch = line.match(/^\[(chorus|backing|background|spoken|lead)(?::([^\]]+))?\]\s*(.*)$/i);
    if (roleMatch) {
      const r = roleMatch[1].toLowerCase();
      role = r === 'background' ? 'backing' : (r as LyricRole);
      tag = roleMatch[2]?.trim() || (role === 'chorus' ? 'chorus' : role === 'backing' ? 'backing vocals' : role === 'spoken' ? 'spoken' : undefined);
      line = roleMatch[3];
    } else if (line.startsWith('(') && line.endsWith(')')) {
      role = 'backing';
      tag = 'backing vocals';
    }
    if (line.trim()) parsed.push({ t, role, tag, phrase: line.trim() });
  }
  return parsed.map((item, idx) => {
    const nextT = parsed[idx + 1]?.t ?? Math.max(item.t + 6, fallbackDur);
    return lyricLine(item.t, Math.max(item.t + 1.2, nextT), item.phrase, item.role, item.tag);
  });
}

export type ActiveLyricState = {
  lineIndex: number;
  line: LyricLine | null;
  wordIndex: number;
  word: LyricWord | null;
  wordProgress: number;
};

export function activeLyricAt(lines: LyricLine[], pos: number, dur = 0): ActiveLyricState {
  if (!lines.length) return { lineIndex: -1, line: null, wordIndex: -1, word: null, wordProgress: 0 };
  const lastEnd = lines[lines.length - 1].end || dur || 60;
  const t = pos > lastEnd && lastEnd > 0 ? pos % lastEnd : pos;
  let lineIndex = lines.findIndex((l) => t >= l.t && t < l.end);
  if (lineIndex === -1) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (t >= lines[i].t) {
        lineIndex = i;
        break;
      }
    }
    if (lineIndex === -1) lineIndex = 0;
  }
  const line = lines[lineIndex] ?? null;
  if (!line || !line.words.length) return { lineIndex, line, wordIndex: -1, word: null, wordProgress: 0 };
  let wordIndex = line.words.findIndex((w) => t >= w.t && t <= w.t + w.d);
  if (wordIndex === -1) {
    for (let i = line.words.length - 1; i >= 0; i--) {
      if (t >= line.words[i].t) {
        wordIndex = i;
        break;
      }
    }
    if (wordIndex === -1) wordIndex = 0;
  }
  const word = line.words[wordIndex] ?? null;
  const wordProgress = word ? Math.max(0, Math.min(1, (t - word.t) / Math.max(0.08, word.d))) : 0;
  return { lineIndex, line, wordIndex, word, wordProgress };
}

export function renderLyricsPanel(box: HTMLElement, track: PlayTrack | null) {
  const lines = lyricsForTrack(track);
  const list = box.querySelector<HTMLElement>('[data-lyrics-list]');
  if (!list) return;
  box.dataset.trackId = track?.id ?? '';
  list.innerHTML = lines
    .map((line, li) => {
      const badge = line.tag || (line.role !== 'lead' ? line.role : '');
      const wordsHtml = line.words
        .map(
          (w, wi) =>
            `<span class="wv-lyric-word${w.role ? ` is-role-${esc(w.role)}` : ''}" data-l="${li}" data-w="${wi}" data-t="${w.t}">${esc(w.w)}</span>`,
        )
        .join(' ');
      return `<button type="button" class="wv-lyric-line is-role-${esc(line.role)}" data-act="lyric-seek" data-t="${line.t}" data-line="${li}" data-line-idx="${li}">
        ${badge ? `<span class="wv-lyric-badge wv-lyric-badge-${esc(line.role)} is-${esc(line.role)}">${esc(badge)}</span>` : ''}
        <span class="wv-lyric-words">${wordsHtml}</span>
      </button>`;
    })
    .join('');
}

export function updateLyricsLive(
  stageBox: HTMLElement | null,
  barLyricEl: HTMLElement | null,
  track: PlayTrack | null,
  pos: number,
  dur: number,
) {
  const lines = lyricsForTrack(track);
  const state = activeLyricAt(lines, pos, dur);

  if (stageBox) {
    if (stageBox.dataset.trackId !== (track?.id ?? '')) {
      renderLyricsPanel(stageBox, track);
    }
    const prevLine = stageBox.dataset.activeLine;
    const nextLine = String(state.lineIndex);
    const lineEls = stageBox.querySelectorAll<HTMLElement>('.wv-lyric-line');
    lineEls.forEach((el, idx) => {
      const isCur = idx === state.lineIndex;
      const isPast = idx < state.lineIndex;
      el.classList.toggle('is-active', isCur);
      el.classList.toggle('is-past', isPast);
      if (isCur) {
        const wordEls = el.querySelectorAll<HTMLElement>('.wv-lyric-word');
        wordEls.forEach((wEl, wi) => {
          const isWordCur = wi === state.wordIndex;
          const isWordPast = wi < state.wordIndex;
          wEl.classList.toggle('is-pop', isWordCur);
          wEl.classList.toggle('is-sung', isWordPast);
          if (isWordCur) wEl.style.setProperty('--w-prog', state.wordProgress.toFixed(2));
        });
      }
    });
    if (prevLine !== nextLine && state.lineIndex >= 0) {
      stageBox.dataset.activeLine = nextLine;
      const activeEl = lineEls[state.lineIndex];
      const scroller = stageBox.querySelector<HTMLElement>('[data-lyrics-list]');
      if (activeEl && scroller) {
        const targetTop = activeEl.offsetTop - scroller.clientHeight * 0.34 + activeEl.clientHeight * 0.5;
        scroller.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      }
    }
  }

  if (barLyricEl) {
    if (!state.line) {
      barLyricEl.hidden = true;
      return;
    }
    barLyricEl.hidden = false;
    barLyricEl.dataset.role = state.line.role;
    const badge = state.line.tag || (state.line.role !== 'lead' ? state.line.role : '');
    const wordsHtml = state.line.words
      .map((w, wi) => {
        const cls = wi === state.wordIndex ? 'wv-bar-word is-pop' : wi < state.wordIndex ? 'wv-bar-word is-sung' : 'wv-bar-word';
        return `<span class="${cls}">${esc(w.w)}</span>`;
      })
      .join(' ');
    const sig = `${track?.id}:${state.lineIndex}:${state.wordIndex}`;
    if (barLyricEl.dataset.sig !== sig) {
      barLyricEl.dataset.sig = sig;
      barLyricEl.innerHTML = `${badge ? `<em class="wv-bar-role is-${esc(state.line.role)}">${esc(badge)}</em>` : ''}<span class="wv-bar-lyric-words">${wordsHtml}</span>`;
    }
  }
}

export type PreviewFormat = 'story' | 'indra' | 'square';

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad);
  g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad);
  g.arcTo(x, y, x + w, y, rad);
  g.closePath();
}

/** Draws the uncut 3D Fibonacci point-cloud spacetime bubble™ with wave ripples, height threads to ear level,
 *  compass directions (above/below/ahead/behind) and glowing audio-reactive sound nodes. */
export function drawUncutSpacetimeBubble(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  now: number,
  yaw: number,
  objs: { label: string; mark: string; pos: { x: number; y: number; z: number }; level?: number }[],
  scaleFont = 1,
) {
  g.save();

  // Outer aura halo (inside safe bounds)
  const halo = g.createRadialGradient(cx, cy, R * 0.15, cx, cy, R * 1.18);
  halo.addColorStop(0, 'rgba(59, 157, 255, 0.14)');
  halo.addColorStop(0.65, 'rgba(34, 245, 154, 0.09)');
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = halo;
  g.beginPath();
  g.arc(cx, cy, R * 1.18, 0, Math.PI * 2);
  g.fill();

  // Subtle glass shell rim
  const sph = g.createRadialGradient(cx - R * 0.28, cy - R * 0.28, R * 0.05, cx, cy, R);
  sph.addColorStop(0, 'rgba(126, 200, 255, 0.12)');
  sph.addColorStop(0.7, 'rgba(12, 26, 48, 0.22)');
  sph.addColorStop(1, 'rgba(34, 245, 154, 0.18)');
  g.fillStyle = sph;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(125, 211, 252, 0.34)';
  g.lineWidth = 2 * scaleFont;
  g.stroke();

  // 3D Fibonacci point-cloud shell (mirrors src/scripts/orb.ts)
  const pitch = 0.38;
  const cyaw = Math.cos(yaw);
  const syaw = Math.sin(yaw);
  const cpitch = Math.cos(pitch);
  const spitch = Math.sin(pitch);
  const swell = 0.025 * Math.sin(now * 0.004);

  const project3D = (wx: number, wy: number, wz: number) => {
    const x1 = wx * cyaw - wz * syaw;
    const z1 = wx * syaw + wz * cyaw;
    const y2 = wy * cpitch - z1 * spitch;
    const z2 = wy * spitch + z1 * cpitch;
    const persp = 2.8 / (2.8 - z2 * 0.55);
    return {
      sx: cx + x1 * R * 0.86 * persp,
      sy: cy - y2 * R * 0.86 * persp,
      depth: z2,
      persp,
    };
  };

  for (let i = 0; i < FIB_PTS.length; i++) {
    const p = FIB_PTS[i];
    const wave = 1 + swell + 0.028 * Math.sin(p.y * 7 - now * 0.005 + p.x * 4);
    const pr = project3D(p.x * wave, p.y * wave, p.z * wave);
    const alpha = 0.16 + Math.max(0, (pr.depth + 1) * 0.26);
    if (p.y > 0.25) {
      g.fillStyle = `rgba(169, 139, 255, ${alpha.toFixed(3)})`;
    } else if (p.y < -0.25) {
      g.fillStyle = `rgba(34, 245, 154, ${alpha.toFixed(3)})`;
    } else {
      g.fillStyle = `rgba(59, 157, 255, ${alpha.toFixed(3)})`;
    }
    const ptR = Math.max(1.2, (1.6 + (pr.depth + 1) * 0.9) * scaleFont);
    g.beginPath();
    g.arc(pr.sx, pr.sy, ptR, 0, Math.PI * 2);
    g.fill();
  }

  // Equator & meridian rings
  g.strokeStyle = 'rgba(159, 208, 255, 0.16)';
  g.lineWidth = 1.4 * scaleFont;
  g.beginPath();
  g.ellipse(cx, cy, R * 0.88, R * 0.88 * Math.sin(pitch), 0, 0, Math.PI * 2);
  g.stroke();

  // Compass labels INSIDE safe margin so they are never cut off
  g.fillStyle = 'rgba(226, 232, 240, 0.55)';
  g.font = `600 ${Math.round(16 * scaleFont)}px "JetBrains Mono", monospace`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('ABOVE', cx, cy - R + 22 * scaleFont);
  g.fillText('BELOW', cx, cy + R - 22 * scaleFont);
  g.fillText('AHEAD', cx, cy - R * 0.34);
  g.fillText('BEHIND', cx, cy + R * 0.36);

  // Listener head glow at centre
  const headGlow = g.createRadialGradient(cx, cy, 1, cx, cy, 18 * scaleFont);
  headGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  headGlow.addColorStop(1, 'rgba(125, 211, 252, 0)');
  g.fillStyle = headGlow;
  g.beginPath();
  g.arc(cx, cy, 18 * scaleFont, 0, Math.PI * 2);
  g.fill();

  // Sound / instrument objects inside the bubble with 3D threads to ear level
  for (let i = 0; i < objs.length; i++) {
    const o = objs[i];
    const nx = Math.max(-0.78, Math.min(0.78, (o.pos.x || 0) / 3.6));
    const ny = Math.max(-0.68, Math.min(0.68, (o.pos.z || 0) / 3.4));
    const nz = Math.max(-0.78, Math.min(0.78, -(o.pos.y || 0) / 3.6));

    const node3d = project3D(nx, ny, nz);
    const ear3d = project3D(nx, 0, nz);

    // Clamp node inside sphere so label is never cut off
    const dx = node3d.sx - cx;
    const dy = node3d.sy - cy;
    const d = Math.hypot(dx, dy);
    const maxR = R * 0.74;
    const ox = d > maxR ? cx + (dx / d) * maxR : node3d.sx;
    const oy = d > maxR ? cy + (dy / d) * maxR : node3d.sy;

    // Thread from centre → ear plane → sound node
    g.strokeStyle = 'rgba(159, 208, 255, 0.36)';
    g.lineWidth = 1.6 * scaleFont;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(ear3d.sx, ear3d.sy);
    g.lineTo(ox, oy);
    g.stroke();

    const lvl = Math.max(0.22, o.level || 0.38 + 0.25 * Math.sin(now * 0.0055 + i * 1.3));
    const nr = (12 + lvl * 14) * scaleFont;

    const nHalo = g.createRadialGradient(ox, oy, 2, ox, oy, nr * 2.1);
    nHalo.addColorStop(0, o.mark || '#22f59a');
    nHalo.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = nHalo;
    g.beginPath();
    g.arc(ox, oy, nr * 2.1, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = o.mark || '#22f59a';
    g.beginPath();
    g.arc(ox, oy, nr * 0.58, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255, 255, 255, 0.78)';
    g.lineWidth = 1.5 * scaleFont;
    g.stroke();

    g.fillStyle = '#ffffff';
    g.font = `600 ${Math.round(18 * scaleFont)}px Inter, -apple-system, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.fillText(o.label, ox, oy + nr * 0.62 + 4 * scaleFont);
  }

  g.restore();
}

export class StoryShareStudio {
  private dlg: HTMLDialogElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx2d: CanvasRenderingContext2D | null = null;
  private raf = 0;
  private coverImg: HTMLImageElement | null = null;
  private coverSrc = '';
  private recording = false;
  private format: PreviewFormat = 'story';

  constructor(
    private root: HTMLElement,
    private engine: Engine,
    private getOrigin: () => string,
    private toast: (msg: string) => void,
  ) {
    this.dlg = root.querySelector<HTMLDialogElement>('[data-story-dialog]');
    this.canvas = this.dlg?.querySelector<HTMLCanvasElement>('[data-story-canvas]') ?? null;
    this.ctx2d = this.canvas?.getContext('2d') ?? null;
  }

  get isOpen() {
    return !!this.dlg?.open;
  }

  setFormat(fmt: PreviewFormat) {
    this.format = fmt;
    if (this.canvas) {
      if (fmt === 'indra') {
        this.canvas.width = 1200;
        this.canvas.height = 630;
        this.canvas.dataset.fmt = 'indra';
      } else if (fmt === 'square') {
        this.canvas.width = 1080;
        this.canvas.height = 1080;
        this.canvas.dataset.fmt = 'square';
      } else {
        this.canvas.width = 1080;
        this.canvas.height = 1920;
        this.canvas.dataset.fmt = 'story';
      }
    }
    if (this.dlg) {
      for (const b of this.dlg.querySelectorAll<HTMLElement>('[data-act="story-fmt"]')) {
        b.setAttribute('aria-pressed', String(b.dataset.fmt === fmt));
      }
    }
    this.drawFrame(performance.now());
  }

  open(track?: PlayTrack | null, fmt?: PreviewFormat) {
    if (!this.dlg || !this.canvas) return;
    const t = track ?? this.engine.track;
    if (!t) {
      this.toast('Select a song first.');
      return;
    }
    if (fmt) this.setFormat(fmt);
    this.ensureCover(t.artUrl || '/khensu/sounds/first-attempt.webp');
    const linkOut = this.dlg.querySelector<HTMLElement>('[data-story-url]');
    if (linkOut) linkOut.textContent = storyUrl(this.getOrigin(), t.id, this.engine.position());
    if (!this.engine.playing) void this.engine.play();
    if (!this.dlg.open) this.dlg.showModal();
    this.startLoop();
  }

  close() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.dlg?.open) this.dlg.close();
  }

  private ensureCover(url: string) {
    if (!url || url === this.coverSrc) return;
    this.coverSrc = url;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    this.coverImg = img;
  }

  private startLoop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    const tick = (now: number) => {
      if (!this.dlg?.open) {
        this.raf = 0;
        return;
      }
      this.drawFrame(now);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** Draws a single frame in 9:16 Story (1080×1920), 16:9 îňðřæ.ōġ Messages (1200×630), or 1:1 webË Square (1080×1080)
   *  with the uncut 3D spacetime bubble™, Apple Speech word-pop lyrics, floating mini-player, and link/SharePlay sticker. */
  drawFrame(now = performance.now()) {
    const c = this.canvas;
    const g = this.ctx2d;
    const eng = this.engine;
    const t = eng.track;
    if (!c || !g || !t) return;
    const W = c.width;
    const H = c.height;
    const pos = eng.position();
    const dur = Math.max(1, eng.duration());
    const lines = lyricsForTrack(t);
    const lyr = activeLyricAt(lines, pos, dur);
    const objs = eng.objs();
    const yaw = now * 0.00042 + eng.pose.yaw;

    // 1. Deep radial aura + Indra's Net lattice backdrop
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#040812');
    bg.addColorStop(0.5, '#071122');
    bg.addColorStop(1, '#04060c');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);

    // Indra's Net subtle jewel lattice in the background
    g.save();
    g.strokeStyle = 'rgba(125, 211, 252, 0.07)';
    g.lineWidth = 1.2;
    for (let i = 0; i < NET_PTS.length; i++) {
      const a = NET_PTS[i];
      const ax = (a.u + 0.02 * Math.sin(now * 0.0006 + a.phase)) * W;
      const ay = (a.v + 0.02 * Math.cos(now * 0.0005 + a.phase)) * H;
      for (let j = i + 1; j < NET_PTS.length; j++) {
        const b = NET_PTS[j];
        const bx = (b.u + 0.02 * Math.sin(now * 0.0006 + b.phase)) * W;
        const by = (b.v + 0.02 * Math.cos(now * 0.0005 + b.phase)) * H;
        const d = Math.hypot(ax - bx, ay - by);
        if (d < Math.min(W, H) * 0.24) {
          g.beginPath();
          g.moveTo(ax, ay);
          g.lineTo(bx, by);
          g.stroke();
        }
      }
      g.fillStyle = 'rgba(186, 230, 253, 0.22)';
      g.beginPath();
      g.arc(ax, ay, 2.2, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    // Landscape 16:9 îňðřæ.ōġ Messages Card layout (1200×630)
    if (this.format === 'indra') {
      this.drawIndraLandscapeFrame(g, W, H, now, yaw, t, pos, dur, lyr, lines, objs);
      return;
    }

    // Square 1:1 webË layout (1080×1080)
    if (this.format === 'square') {
      this.drawSquareFrame(g, W, H, now, yaw, t, pos, dur, lyr, lines, objs);
      return;
    }

    // 9:16 Vertical Instagram Story / Reel layout (1080×1920) — Spacetime Bubble 100% uncut in upper-center
    // 2. Top header pill
    g.save();
    g.fillStyle = 'rgba(255, 255, 255, 0.07)';
    g.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    g.lineWidth = 2;
    roundRect(g, W * 0.07, H * 0.036, W * 0.86, H * 0.044, 999);
    g.fill();
    g.stroke();

    g.fillStyle = '#22f59a';
    g.beginPath();
    g.arc(W * 0.12, H * 0.058, 9, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = '#f5f7fa';
    g.font = '700 26px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText('ñü.ŵævẽš · spacetime bubble™', W * 0.15, H * 0.058);

    g.fillStyle = 'rgba(126, 200, 255, 0.92)';
    g.font = '600 21px "JetBrains Mono", monospace';
    g.textAlign = 'right';
    g.fillText(`${eng.venue.label.toLowerCase()} · SharePlay`, W * 0.89, H * 0.058);
    g.restore();

    // 3. Uncut 3D Spacetime Bubble™ (cy = H * 0.275, R = W * 0.245 = 264px -> fits inside y=[264, 792])
    drawUncutSpacetimeBubble(g, W * 0.5, H * 0.275, W * 0.245, now, yaw, objs, 1);

    // 4. Synchronized Lyrics Stage (Spotify scroll + Instagram Story word-pop animation)
    const lyrTop = H * 0.525;
    g.save();
    if (lyr.line) {
      const prev = lyr.lineIndex > 0 ? lines[lyr.lineIndex - 1] : null;
      const next = lyr.lineIndex + 1 < lines.length ? lines[lyr.lineIndex + 1] : null;

      if (prev) {
        g.fillStyle = 'rgba(245, 247, 250, 0.34)';
        g.font = '600 27px Inter, -apple-system, sans-serif';
        g.textAlign = 'center';
        g.fillText(prev.words.map((w) => w.w).join(' '), W * 0.5, lyrTop - 38, W * 0.84);
      }

      const roleLabel = (lyr.line.tag || lyr.line.role).toUpperCase();
      const roleColor =
        lyr.line.role === 'chorus'
          ? '#22f59a'
          : lyr.line.role === 'backing'
            ? '#c8a2ff'
            : lyr.line.role === 'spoken'
              ? '#ffd23c'
              : '#7ec8ff';
      g.font = '700 19px "JetBrains Mono", monospace';
      const tagW = g.measureText(roleLabel).width + 36;
      g.fillStyle = 'rgba(10, 18, 34, 0.86)';
      g.strokeStyle = roleColor;
      g.lineWidth = 2;
      roundRect(g, W * 0.5 - tagW * 0.5, lyrTop - 10, tagW, 34, 999);
      g.fill();
      g.stroke();
      g.fillStyle = roleColor;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(roleLabel, W * 0.5, lyrTop + 7);

      this.drawPopLyricWords(g, lyr.line.words, lyr.wordIndex, lyr.wordProgress, W * 0.5, lyrTop + 66, W * 0.84, 42, 58);

      if (next) {
        g.fillStyle = 'rgba(245, 247, 250, 0.36)';
        g.font = '600 26px Inter, -apple-system, sans-serif';
        g.textAlign = 'center';
        g.fillText(next.words.map((w) => w.w).join(' '), W * 0.5, lyrTop + 198, W * 0.84);
      }
    }
    g.restore();

    // 5. Embedded Floating Mini-Player Card at bottom of Story
    this.drawMiniPlayerCard(g, W * 0.07, H * 0.735, W * 0.86, H * 0.132, t, pos, dur, objs.length, eng.mode, 1);

    // 6. Instagram Story Link Sticker + Apple SharePlay CTA pill at bottom
    const pillW = W * 0.82;
    const pillH = 72;
    const pillX = (W - pillW) * 0.5;
    const pillY = H * 0.898;
    g.save();
    const stickerGrad = g.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
    stickerGrad.addColorStop(0, '#22f59a');
    stickerGrad.addColorStop(1, '#38a8ff');
    g.fillStyle = stickerGrad;
    roundRect(g, pillX, pillY, pillW, pillH, 999);
    g.fill();

    g.fillStyle = '#041019';
    g.font = '800 25px Inter, -apple-system, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(`🔗 PLAY IN 3D & SHAREPLAY · waves.khensu.nu`, W * 0.5, pillY + pillH * 0.5);
    g.restore();
  }

  /** 16:9 îňðřæ.ōġ (1200×630) Messages Card in the exact same style:
   *  Left column: header pill, Apple Speech word-pop lyrics, floating glass mini-player & SharePlay badge.
   *  Right column: full uncut 3D spacetime bubble™ (cx = 925, cy = 315, R = 210 — 100% inside 630px height). */
  private drawIndraLandscapeFrame(
    g: CanvasRenderingContext2D,
    W: number,
    H: number,
    now: number,
    yaw: number,
    t: PlayTrack,
    pos: number,
    dur: number,
    lyr: ActiveLyricState,
    lines: LyricLine[],
    objs: { label: string; mark: string; pos: { x: number; y: number; z: number }; level?: number }[],
  ) {
    const leftX = 48;
    const leftW = 610;

    // Header pill on top-left
    g.save();
    g.fillStyle = 'rgba(255, 255, 255, 0.07)';
    g.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    g.lineWidth = 1.5;
    roundRect(g, leftX, 34, leftW, 44, 999);
    g.fill();
    g.stroke();

    g.fillStyle = '#22f59a';
    g.beginPath();
    g.arc(leftX + 24, 56, 6.5, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = '#f8fafc';
    g.font = '700 18px Inter, -apple-system, sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText('îňðřæ.ōġ · ñü.ŵævẽš · spacetime bubble™', leftX + 42, 56);

    g.fillStyle = '#7dd3fc';
    g.font = '600 14px "JetBrains Mono", monospace';
    g.textAlign = 'right';
    g.fillText('SharePlay · 3D', leftX + leftW - 20, 56);
    g.restore();

    // Word-pop lyrics stage on middle-left
    const lyrCenterX = leftX + leftW * 0.5;
    const lyrTop = 148;
    g.save();
    if (lyr.line) {
      const prev = lyr.lineIndex > 0 ? lines[lyr.lineIndex - 1] : null;
      const next = lyr.lineIndex + 1 < lines.length ? lines[lyr.lineIndex + 1] : null;
      if (prev) {
        g.fillStyle = 'rgba(245, 247, 250, 0.34)';
        g.font = '600 18px Inter, -apple-system, sans-serif';
        g.textAlign = 'center';
        g.fillText(prev.words.map((w) => w.w).join(' '), lyrCenterX, lyrTop - 28, leftW - 20);
      }

      const roleLabel = (lyr.line.tag || lyr.line.role).toUpperCase();
      const roleColor = lyr.line.role === 'chorus' ? '#22f59a' : lyr.line.role === 'backing' ? '#c8a2ff' : '#7ec8ff';
      g.font = '700 13px "JetBrains Mono", monospace';
      const tagW = g.measureText(roleLabel).width + 24;
      g.fillStyle = 'rgba(10, 18, 34, 0.88)';
      g.strokeStyle = roleColor;
      g.lineWidth = 1.5;
      roundRect(g, lyrCenterX - tagW * 0.5, lyrTop - 8, tagW, 24, 999);
      g.fill();
      g.stroke();
      g.fillStyle = roleColor;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(roleLabel, lyrCenterX, lyrTop + 4);

      this.drawPopLyricWords(g, lyr.line.words, lyr.wordIndex, lyr.wordProgress, lyrCenterX, lyrTop + 48, leftW - 16, 28, 40);

      if (next) {
        g.fillStyle = 'rgba(245, 247, 250, 0.34)';
        g.font = '600 17px Inter, -apple-system, sans-serif';
        g.textAlign = 'center';
        g.fillText(next.words.map((w) => w.w).join(' '), lyrCenterX, lyrTop + 136, leftW - 20);
      }
    }
    g.restore();

    // Mini-player card on bottom-left
    this.drawMiniPlayerCard(g, leftX, 348, leftW, 174, t, pos, dur, objs.length, this.engine.mode, 0.72);

    // Bottom CTA pill on left
    g.save();
    const stickerGrad = g.createLinearGradient(leftX, 544, leftX + leftW, 594);
    stickerGrad.addColorStop(0, '#22f59a');
    stickerGrad.addColorStop(1, '#38a8ff');
    g.fillStyle = stickerGrad;
    roundRect(g, leftX, 544, leftW, 50, 999);
    g.fill();
    g.fillStyle = '#041019';
    g.font = '800 18px Inter, -apple-system, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('🔗 PLAY IN 3D · waves.khensu.nu · indra.og.khensu.nu', leftX + leftW * 0.5, 569);
    g.restore();

    // Right side: Full uncut 3D Spacetime Bubble™ (cx = 935, cy = 315, R = 212 -> top=103, bottom=527 inside 630px)
    drawUncutSpacetimeBubble(g, 935, H * 0.5, 212, now, yaw, objs, 0.78);
  }

  /** 1:1 webË Square layout (1080×1080) with uncut Spacetime Bubble™ + word-pop lyrics + mini-player. */
  private drawSquareFrame(
    g: CanvasRenderingContext2D,
    W: number,
    H: number,
    now: number,
    yaw: number,
    t: PlayTrack,
    pos: number,
    dur: number,
    lyr: ActiveLyricState,
    _lines: LyricLine[],
    objs: { label: string; mark: string; pos: { x: number; y: number; z: number }; level?: number }[],
  ) {
    // Top pill
    g.save();
    g.fillStyle = 'rgba(255, 255, 255, 0.07)';
    g.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    g.lineWidth = 2;
    roundRect(g, W * 0.07, 34, W * 0.86, 52, 999);
    g.fill();
    g.stroke();
    g.fillStyle = '#22f59a';
    g.beginPath();
    g.arc(W * 0.115, 60, 8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f8fafc';
    g.font = '700 22px Inter, -apple-system, sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText('îňðřæ.ōġ · ñü.ŵævẽš · spacetime bubble™', W * 0.14, 60);
    g.fillStyle = '#7dd3fc';
    g.font = '600 18px "JetBrains Mono", monospace';
    g.textAlign = 'right';
    g.fillText('nu:preview · 3D', W * 0.89, 60);
    g.restore();

    // Uncut 3D Spacetime Bubble™ (cy = 320, R = 195 -> top=125, bottom=515)
    drawUncutSpacetimeBubble(g, W * 0.5, 320, 195, now, yaw, objs, 0.82);

    // Word-pop active lyric line
    if (lyr.line) {
      const roleLabel = (lyr.line.tag || lyr.line.role).toUpperCase();
      const roleColor = lyr.line.role === 'chorus' ? '#22f59a' : lyr.line.role === 'backing' ? '#c8a2ff' : '#7ec8ff';
      g.save();
      g.font = '700 16px "JetBrains Mono", monospace';
      const tagW = g.measureText(roleLabel).width + 28;
      g.fillStyle = 'rgba(10, 18, 34, 0.86)';
      g.strokeStyle = roleColor;
      g.lineWidth = 1.8;
      roundRect(g, W * 0.5 - tagW * 0.5, 548, tagW, 28, 999);
      g.fill();
      g.stroke();
      g.fillStyle = roleColor;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(roleLabel, W * 0.5, 562);
      this.drawPopLyricWords(g, lyr.line.words, lyr.wordIndex, lyr.wordProgress, W * 0.5, 614, W * 0.86, 34, 46);
      g.restore();
    }

    // Mini-player card at bottom
    this.drawMiniPlayerCard(g, W * 0.07, 735, W * 0.86, 200, t, pos, dur, objs.length, this.engine.mode, 0.84);

    // Bottom link pill
    g.save();
    const stickerGrad = g.createLinearGradient(W * 0.1, 965, W * 0.9, 1025);
    stickerGrad.addColorStop(0, '#22f59a');
    stickerGrad.addColorStop(1, '#38a8ff');
    g.fillStyle = stickerGrad;
    roundRect(g, W * 0.1, 965, W * 0.8, 58, 999);
    g.fill();
    g.fillStyle = '#041019';
    g.font = '800 22px Inter, -apple-system, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('🔗 PLAY IN 3D & SHAREPLAY · waves.khensu.nu', W * 0.5, 994);
    g.restore();
  }

  private drawMiniPlayerCard(
    g: CanvasRenderingContext2D,
    cardX: number,
    cardY: number,
    cardW: number,
    cardH: number,
    t: PlayTrack,
    pos: number,
    dur: number,
    objCount: number,
    mode: string,
    sc = 1,
  ) {
    g.save();
    g.fillStyle = 'rgba(14, 22, 38, 0.88)';
    g.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    g.lineWidth = 2 * sc;
    roundRect(g, cardX, cardY, cardW, cardH, 34 * sc);
    g.fill();
    g.stroke();

    const pad = Math.round(20 * sc);
    const artS = cardH - pad * 2;
    const artX = cardX + pad;
    const artY = cardY + pad;
    if (this.coverImg && this.coverImg.complete && this.coverImg.naturalWidth > 0) {
      g.save();
      roundRect(g, artX, artY, artS, artS, 18 * sc);
      g.clip();
      g.drawImage(this.coverImg, artX, artY, artS, artS);
      g.restore();
    } else {
      const ag = g.createLinearGradient(artX, artY, artX + artS, artY + artS);
      ag.addColorStop(0, '#22f59a');
      ag.addColorStop(1, '#38a8ff');
      g.fillStyle = ag;
      roundRect(g, artX, artY, artS, artS, 18 * sc);
      g.fill();
    }

    const textX = artX + artS + Math.round(22 * sc);
    const maxTextW = cardX + cardW - textX - Math.round(24 * sc);
    g.fillStyle = '#ffffff';
    g.font = `700 ${Math.round(32 * sc)}px Inter, -apple-system, sans-serif`;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillText(t.title, textX, cardY + Math.round(24 * sc), maxTextW);

    g.fillStyle = 'rgba(220, 230, 242, 0.82)';
    g.font = `500 ${Math.round(23 * sc)}px Inter, -apple-system, sans-serif`;
    g.fillText([t.artistName, t.albumTitle].filter(Boolean).join(' · '), textX, cardY + Math.round(64 * sc), maxTextW);

    g.fillStyle = '#22f59a';
    g.font = `600 ${Math.round(19 * sc)}px "JetBrains Mono", monospace`;
    g.fillText(`${objCount} sounds in 3D · ${mode === 'waves' ? 'nu.waves' : mode}`, textX, cardY + Math.round(98 * sc), maxTextW);

    const barX = textX;
    const barY = cardY + cardH - Math.round(42 * sc);
    const barW = maxTextW;
    const prog = Math.max(0.04, Math.min(1, pos / dur));
    g.fillStyle = 'rgba(255, 255, 255, 0.16)';
    roundRect(g, barX, barY, barW, Math.max(6, Math.round(9 * sc)), 999);
    g.fill();
    const pg = g.createLinearGradient(barX, barY, barX + barW, barY);
    pg.addColorStop(0, '#22f59a');
    pg.addColorStop(1, '#38a8ff');
    g.fillStyle = pg;
    roundRect(g, barX, barY, barW * prog, Math.max(6, Math.round(9 * sc)), 999);
    g.fill();

    g.fillStyle = 'rgba(220, 230, 242, 0.72)';
    g.font = `600 ${Math.round(18 * sc)}px "JetBrains Mono", monospace`;
    g.textAlign = 'left';
    g.fillText(mmss(pos), barX, barY + Math.round(14 * sc));
    g.textAlign = 'right';
    g.fillText(mmss(dur), barX + barW, barY + Math.round(14 * sc));
    g.restore();
  }

  private drawPopLyricWords(
    g: CanvasRenderingContext2D,
    words: LyricWord[],
    activeIdx: number,
    prog: number,
    centerX: number,
    startY: number,
    maxWidth: number,
    fontPx = 42,
    lineH = 58,
  ) {
    g.font = `800 ${fontPx}px Inter, -apple-system, sans-serif`;
    const spaceW = Math.round(fontPx * 0.36);
    const rows: { words: { w: LyricWord; idx: number; width: number }[]; totalW: number }[] = [];
    let curRow: { w: LyricWord; idx: number; width: number }[] = [];
    let curW = 0;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const ww = g.measureText(w.w).width;
      if (curRow.length && curW + spaceW + ww > maxWidth) {
        rows.push({ words: curRow, totalW: curW });
        curRow = [];
        curW = 0;
      }
      curRow.push({ w, idx: i, width: ww });
      curW += (curRow.length > 1 ? spaceW : 0) + ww;
    }
    if (curRow.length) rows.push({ words: curRow, totalW: curW });

    rows.slice(0, 2).forEach((row, rIdx) => {
      let x = centerX - row.totalW * 0.5;
      const y = startY + rIdx * lineH;
      for (const item of row.words) {
        const isCurrent = item.idx === activeIdx;
        const isPast = item.idx < activeIdx;
        const popBump = isCurrent ? Math.sin(Math.min(1, prog * 1.6) * Math.PI) : 0;
        const scale = isCurrent ? 1.16 + popBump * 0.14 : 1;
        const yLift = isCurrent ? -5 - popBump * 6 : 0;

        g.save();
        g.translate(x + item.width * 0.5, y + yLift);
        g.scale(scale, scale);
        if (isCurrent) {
          g.fillStyle = 'rgba(34, 245, 154, 0.24)';
          g.strokeStyle = '#22f59a';
          g.lineWidth = 2;
          roundRect(g, -item.width * 0.5 - 10, -fontPx * 0.68, item.width + 20, fontPx * 1.24, 14);
          g.fill();
          g.stroke();
          g.shadowColor = 'rgba(34, 245, 154, 0.75)';
          g.shadowBlur = 16;
          g.fillStyle = '#ffffff';
        } else if (isPast) {
          g.fillStyle = item.w.role === 'backing' ? '#d9bfff' : '#8ef7c8';
        } else {
          g.fillStyle = item.w.role === 'backing' ? 'rgba(200, 162, 255, 0.62)' : 'rgba(245, 247, 250, 0.65)';
        }
        g.font =
          item.w.role === 'backing'
            ? `italic 700 ${Math.round(fontPx * 0.92)}px Inter, -apple-system, sans-serif`
            : `800 ${fontPx}px Inter, -apple-system, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(item.w.w, 0, 0);
        g.restore();

        x += item.width + spaceW;
      }
    });
  }

  async copyStoryLink(): Promise<string> {
    const t = this.engine.track;
    const url = storyUrl(this.getOrigin(), t?.id ?? 'first-attempt', this.engine.position());
    try {
      await navigator.clipboard?.writeText(url);
      this.toast('Instagram Story link copied — paste into your Story Link Sticker.');
    } catch {
      this.toast(`Story link: ${url}`);
    }
    return url;
  }

  async shareStoryCard() {
    const t = this.engine.track;
    if (!t || !this.canvas) return;
    this.drawFrame(performance.now());
    const url = await this.copyStoryLink();
    const blob = await new Promise<Blob | null>((res) => this.canvas!.toBlob(res, 'image/png', 0.95));
    if (!blob) return;
    const suffix = this.format === 'indra' ? 'indra-16x9' : this.format === 'square' ? 'webe-1x1' : 'story-9x16';
    const fileName = `${t.id}-${suffix}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });
    const title = `${t.title} · ñü.ŵævẽš 3D Story`;
    const text = `Listen in 3D & move every sound on ñü.ŵævẽš: ${url}`;
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text, url });
        this.toast(`Shared ${suffix} card + link.`);
        return;
      }
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    this.toast(`Saved ${suffix} card & copied link.`);
  }

  async recordAndShareReel(seconds = 8, btn?: HTMLElement | null) {
    if (this.recording || !this.canvas) return;
    const t = this.engine.track;
    if (!t) return;
    if (!this.engine.playing) await this.engine.play();
    const url = await this.copyStoryLink();
    const labelEl = btn?.querySelector('span') ?? btn;
    const origText = labelEl?.textContent ?? 'Record 8s Story / Reel video';
    this.recording = true;
    const audioTap = this.engine.createAudioStream();
    try {
      const canvasStream = this.canvas.captureStream(30);
      const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
      if (audioTap) tracks.push(...audioTap.stream.getAudioTracks());
      const combined = new MediaStream(tracks);
      const mimeTypes = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
      const mimeType = mimeTypes.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || '';
      const rec = mimeType ? new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 4_500_000 }) : new MediaRecorder(combined);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      const stopped = new Promise<Blob>((resolve) => {
        rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || 'video/webm' }));
      });
      rec.start(200);
      for (let left = seconds; left > 0; left--) {
        if (labelEl) labelEl.textContent = `Recording clip… ${left}s`;
        await new Promise((r) => setTimeout(r, 1000));
        if (!this.dlg?.open) break;
      }
      if (rec.state !== 'inactive') rec.stop();
      const blob = await stopped;
      const ext = (rec.mimeType || '').includes('mp4') ? 'mp4' : 'webm';
      const fileName = `${t.id}-nu-waves-${this.format}.${ext}`;
      const file = new File([blob], fileName, { type: blob.type || `video/${ext}` });
      const title = `${t.title} · ñü.ŵævẽš Story / Reel`;
      const text = `Listen in 3D & move every sound on ñü.ŵævẽš: ${url}`;
      try {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title, text, url });
          this.toast('Shared video + link.');
          return;
        }
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      this.toast(`Saved ${seconds}s video & copied link.`);
    } catch {
      await this.shareStoryCard();
    } finally {
      audioTap?.disconnect();
      this.recording = false;
      if (labelEl) labelEl.textContent = origText;
    }
  }
}
