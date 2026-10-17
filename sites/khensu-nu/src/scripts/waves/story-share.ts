// Instagram Story / Reel Share Studio + Apple Speech word-by-word synchronized pop lyrics for nu.waves.
// Powers:
// 1. Spotify-style scrolling lyrics panel on the stage player with Instagram Story word-pop animation and
//    role badges (lead, chorus, backing, spoken).
// 2. Live word-pop lyric ticker inside the floating mini-player bar.
// 3. 9:16 Instagram Story / Reel studio modal that renders the live 3D spacetime bubble, animated word-pop
//    lyrics, embedded mini-player card, and waves.khensu.nu link sticker — exporting either a 1080×1920 Story
//    card or an 8-second recorded 9:16 Reel/Story video with live 3D spatial audio.

import { lyricLine, mmss, type LyricLine, type LyricRole, type LyricWord } from '../../data/waves';
import type { Engine, PlayTrack } from './engine';
import { storyUrl } from './scene';

const STORAGE_PREFIX = 'nu.waves.lyrics.';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

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
      return `<button type="button" class="wv-lyric-line is-role-${esc(line.role)}" data-act="lyric-seek" data-t="${line.t}" data-line="${li}">
        ${badge ? `<span class="wv-lyric-badge is-${esc(line.role)}">${esc(badge)}</span>` : ''}
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
      barLyricEl.innerHTML = `${badge ? `<em class="wv-bar-lyric-tag is-${esc(state.line.role)}">${esc(badge)}</em>` : ''}<span class="wv-bar-lyric-words">${wordsHtml}</span>`;
    }
  }
}

export class StoryShareStudio {
  private dlg: HTMLDialogElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx2d: CanvasRenderingContext2D | null = null;
  private raf = 0;
  private coverImg: HTMLImageElement | null = null;
  private coverSrc = '';
  private recording = false;

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

  open(track?: PlayTrack | null) {
    if (!this.dlg || !this.canvas) return;
    const t = track ?? this.engine.track;
    if (!t) {
      this.toast('Select a song first.');
      return;
    }
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

  /** Draws a single 1080×1920 (scaled to canvas) 9:16 Instagram Story / Reel frame with:
   *  - Top brand pill + link badge
   *  - Live 3D spacetime bubble™ with pulsing instrument/tone nodes
   *  - Word-by-word pop-animated lyrics with [CHORUS] / [BACKING] / [LEAD] badges
   *  - Bottom glass mini-player card + waves.khensu.nu deep-link sticker */
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

    // 1. Deep radial aura backdrop
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#050913');
    bg.addColorStop(0.48, '#081224');
    bg.addColorStop(1, '#04060c');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);

    const pulse = 0.5 + 0.5 * Math.sin(now * 0.0025);
    const glow1 = g.createRadialGradient(W * 0.5, H * 0.34, 20, W * 0.5, H * 0.34, W * 0.56);
    glow1.addColorStop(0, `rgba(34, 245, 154, ${0.18 + pulse * 0.08})`);
    glow1.addColorStop(0.55, 'rgba(56, 168, 255, 0.09)');
    glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = glow1;
    g.fillRect(0, 0, W, H);

    // 2. Top header pill
    g.save();
    g.fillStyle = 'rgba(255, 255, 255, 0.07)';
    g.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    g.lineWidth = 2;
    this.roundRect(g, W * 0.08, H * 0.045, W * 0.84, H * 0.048, 999);
    g.fill();
    g.stroke();

    g.fillStyle = '#22f59a';
    g.beginPath();
    g.arc(W * 0.135, H * 0.069, 9, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = '#f5f7fa';
    g.font = '700 28px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText('ñü.ŵævẽš · spacetime bubble™', W * 0.165, H * 0.069);

    g.fillStyle = 'rgba(126, 200, 255, 0.92)';
    g.font = '600 23px "JetBrains Mono", monospace';
    g.textAlign = 'right';
    g.fillText(eng.venue.label.toLowerCase(), W * 0.88, H * 0.069);
    g.restore();

    // 3. 3D Spacetime Bubble™ in upper-center
    const cx = W * 0.5;
    const cy = H * 0.32;
    const R = W * 0.33;
    g.save();
    // Outer glass sphere
    const sph = g.createRadialGradient(cx - R * 0.28, cy - R * 0.3, R * 0.06, cx, cy, R);
    sph.addColorStop(0, 'rgba(126, 200, 255, 0.16)');
    sph.addColorStop(0.65, 'rgba(18, 38, 68, 0.28)');
    sph.addColorStop(1, 'rgba(34, 245, 154, 0.22)');
    g.fillStyle = sph;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(126, 224, 255, 0.38)';
    g.lineWidth = 2.5;
    g.stroke();

    // Latitude / longitude wireframe rings
    const yaw = now * 0.00045 + eng.pose.yaw;
    g.strokeStyle = 'rgba(255, 255, 255, 0.11)';
    g.lineWidth = 1.5;
    for (const lat of [-0.55, 0, 0.55]) {
      const ry = R * Math.cos(lat) * 0.32;
      const rx = R * Math.cos(lat);
      const yOff = cy + R * Math.sin(lat) * 0.55;
      g.beginPath();
      g.ellipse(cx, yOff, rx, ry, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.beginPath();
    g.ellipse(cx, cy, R * Math.abs(Math.cos(yaw)), R, 0, 0, Math.PI * 2);
    g.stroke();

    // Listener center mark
    g.fillStyle = 'rgba(255, 255, 255, 0.85)';
    g.beginPath();
    g.arc(cx, cy, 7, 0, Math.PI * 2);
    g.fill();

    // Sound / instrument objects inside the bubble
    const objs = eng.objs();
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i];
      const ang = Math.atan2(o.pos.x, o.pos.y) + Math.sin(now * 0.001 + i) * 0.08;
      const dist = Math.min(1, Math.hypot(o.pos.x, o.pos.y) / 3.8);
      const ox = cx + Math.sin(ang) * dist * R * 0.76;
      const oy = cy - Math.cos(ang) * dist * R * 0.52 - (o.pos.z || 0) * 28;
      const lvl = Math.max(0.18, o.level || 0.35 + 0.25 * Math.sin(now * 0.006 + i * 1.3));
      const nr = 16 + lvl * 22;

      const halo = g.createRadialGradient(ox, oy, 2, ox, oy, nr * 2.1);
      halo.addColorStop(0, o.mark || '#22f59a');
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = halo;
      g.beginPath();
      g.arc(ox, oy, nr * 2.1, 0, Math.PI * 2);
      g.fill();

      g.fillStyle = o.mark || '#22f59a';
      g.beginPath();
      g.arc(ox, oy, nr * 0.58, 0, Math.PI * 2);
      g.fill();

      g.fillStyle = '#ffffff';
      g.font = '600 22px Inter, -apple-system, sans-serif';
      g.textAlign = 'center';
      g.fillText(o.label, ox, oy + nr * 0.58 + 24);
    }
    g.restore();

    // 4. Synchronized Lyrics Stage (Spotify scroll + Instagram Story word-pop animation)
    const lyrTop = H * 0.54;
    g.save();
    if (lyr.line) {
      const prev = lyr.lineIndex > 0 ? lines[lyr.lineIndex - 1] : null;
      const next = lyr.lineIndex + 1 < lines.length ? lines[lyr.lineIndex + 1] : null;

      // Previous line (faded above)
      if (prev) {
        g.fillStyle = 'rgba(245, 247, 250, 0.32)';
        g.font = '600 30px Inter, -apple-system, sans-serif';
        g.textAlign = 'center';
        g.fillText(prev.words.map((w) => w.w).join(' '), W * 0.5, lyrTop - 36, W * 0.84);
      }

      // Role / audio layer pill (LEAD / CHORUS / BACKING / SPOKEN)
      const roleLabel = (lyr.line.tag || lyr.line.role).toUpperCase();
      const roleColor =
        lyr.line.role === 'chorus'
          ? '#22f59a'
          : lyr.line.role === 'backing'
            ? '#c8a2ff'
            : lyr.line.role === 'spoken'
              ? '#ffd23c'
              : '#7ec8ff';
      g.font = '700 20px "JetBrains Mono", monospace';
      const tagW = g.measureText(roleLabel).width + 36;
      g.fillStyle = 'rgba(10, 18, 34, 0.82)';
      g.strokeStyle = roleColor;
      g.lineWidth = 2;
      this.roundRect(g, W * 0.5 - tagW * 0.5, lyrTop - 8, tagW, 36, 999);
      g.fill();
      g.stroke();
      g.fillStyle = roleColor;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(roleLabel, W * 0.5, lyrTop + 10);

      // Word-by-word wrapped layout with POP animation on the active word
      this.drawPopLyricWords(g, lyr.line.words, lyr.wordIndex, lyr.wordProgress, W * 0.5, lyrTop + 74, W * 0.84);

      // Next line (faded below)
      if (next) {
        g.fillStyle = 'rgba(245, 247, 250, 0.36)';
        g.font = '600 28px Inter, -apple-system, sans-serif';
        g.textAlign = 'center';
        g.fillText(next.words.map((w) => w.w).join(' '), W * 0.5, lyrTop + 215, W * 0.84);
      }
    }
    g.restore();

    // 5. Embedded Floating Mini-Player Card at bottom of Story
    const cardX = W * 0.07;
    const cardY = H * 0.74;
    const cardW = W * 0.86;
    const cardH = H * 0.135;
    g.save();
    g.fillStyle = 'rgba(14, 22, 38, 0.86)';
    g.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    g.lineWidth = 2.5;
    this.roundRect(g, cardX, cardY, cardW, cardH, 38);
    g.fill();
    g.stroke();

    // Cover art square inside mini-player
    const artS = cardH - 44;
    const artX = cardX + 22;
    const artY = cardY + 22;
    if (this.coverImg && this.coverImg.complete && this.coverImg.naturalWidth > 0) {
      g.save();
      this.roundRect(g, artX, artY, artS, artS, 22);
      g.clip();
      g.drawImage(this.coverImg, artX, artY, artS, artS);
      g.restore();
    } else {
      const ag = g.createLinearGradient(artX, artY, artX + artS, artY + artS);
      ag.addColorStop(0, '#22f59a');
      ag.addColorStop(1, '#38a8ff');
      g.fillStyle = ag;
      this.roundRect(g, artX, artY, artS, artS, 22);
      g.fill();
    }

    // Track title + artist + spec inside mini-player
    const textX = artX + artS + 26;
    const maxTextW = cardX + cardW - textX - 30;
    g.fillStyle = '#ffffff';
    g.font = '700 34px Inter, -apple-system, sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillText(t.title, textX, cardY + 28, maxTextW);

    g.fillStyle = 'rgba(220, 230, 242, 0.8)';
    g.font = '500 25px Inter, -apple-system, sans-serif';
    g.fillText([t.artistName, t.albumTitle].filter(Boolean).join(' · '), textX, cardY + 72, maxTextW);

    g.fillStyle = '#22f59a';
    g.font = '600 21px "JetBrains Mono", monospace';
    g.fillText(`${objs.length} sounds in 3D · ${eng.mode === 'waves' ? 'nu.waves' : eng.mode}`, textX, cardY + 110, maxTextW);

    // Progress bar + timestamps inside mini-player
    const barX = textX;
    const barY = cardY + cardH - 48;
    const barW = maxTextW;
    const prog = Math.max(0.03, Math.min(1, pos / dur));
    g.fillStyle = 'rgba(255, 255, 255, 0.16)';
    this.roundRect(g, barX, barY, barW, 10, 999);
    g.fill();
    const pg = g.createLinearGradient(barX, barY, barX + barW, barY);
    pg.addColorStop(0, '#22f59a');
    pg.addColorStop(1, '#38a8ff');
    g.fillStyle = pg;
    this.roundRect(g, barX, barY, barW * prog, 10, 999);
    g.fill();

    g.fillStyle = 'rgba(220, 230, 242, 0.72)';
    g.font = '600 20px "JetBrains Mono", monospace';
    g.textAlign = 'left';
    g.fillText(mmss(pos), barX, barY + 18);
    g.textAlign = 'right';
    g.fillText(mmss(dur), barX + barW, barY + 18);
    g.restore();

    // 6. Instagram Story Link Sticker CTA pill at bottom
    const pillW = W * 0.78;
    const pillH = 74;
    const pillX = (W - pillW) * 0.5;
    const pillY = H * 0.902;
    g.save();
    const stickerGrad = g.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
    stickerGrad.addColorStop(0, '#22f59a');
    stickerGrad.addColorStop(1, '#38a8ff');
    g.fillStyle = stickerGrad;
    this.roundRect(g, pillX, pillY, pillW, pillH, 999);
    g.fill();

    g.fillStyle = '#041019';
    g.font = '800 27px Inter, -apple-system, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(`🔗 PLAY IN 3D · waves.khensu.nu`, W * 0.5, pillY + pillH * 0.5);
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
  ) {
    g.font = '800 44px Inter, -apple-system, sans-serif';
    const spaceW = 16;
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

    const lineH = 62;
    rows.forEach((row, rIdx) => {
      let x = centerX - row.totalW * 0.5;
      const y = startY + rIdx * lineH;
      for (const item of row.words) {
        const isCurrent = item.idx === activeIdx;
        const isPast = item.idx < activeIdx;
        // Spring pop curve: peaks quickly at start of word then settles
        const popBump = isCurrent ? Math.sin(Math.min(1, prog * 1.6) * Math.PI) : 0;
        const scale = isCurrent ? 1.18 + popBump * 0.14 : 1;
        const yLift = isCurrent ? -6 - popBump * 8 : 0;

        g.save();
        g.translate(x + item.width * 0.5, y + yLift);
        g.scale(scale, scale);
        if (isCurrent) {
          g.fillStyle = 'rgba(34, 245, 154, 0.24)';
          g.strokeStyle = '#22f59a';
          g.lineWidth = 2;
          this.roundRect(g, -item.width * 0.5 - 12, -30, item.width + 24, 54, 16);
          g.fill();
          g.stroke();
          g.shadowColor = 'rgba(34, 245, 154, 0.75)';
          g.shadowBlur = 18;
          g.fillStyle = '#ffffff';
        } else if (isPast) {
          g.fillStyle = item.w.role === 'backing' ? '#d9bfff' : '#8ef7c8';
        } else {
          g.fillStyle = item.w.role === 'backing' ? 'rgba(200, 162, 255, 0.62)' : 'rgba(245, 247, 250, 0.65)';
        }
        g.font = item.w.role === 'backing' ? 'italic 700 40px Inter, -apple-system, sans-serif' : '800 44px Inter, -apple-system, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(item.w.w, 0, 0);
        g.restore();

        x += item.width + spaceW;
      }
    });
  }

  private roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rad = Math.min(r, w * 0.5, h * 0.5);
    g.beginPath();
    g.moveTo(x + rad, y);
    g.arcTo(x + w, y, x + w, y + h, rad);
    g.arcTo(x + w, y + h, x, y + h, rad);
    g.arcTo(x, y + h, x, y, rad);
    g.arcTo(x, y, x + w, y, rad);
    g.closePath();
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
    const fileName = `${t.id}-story-9x16.png`;
    const file = new File([blob], fileName, { type: 'image/png' });
    const title = `${t.title} · ñü.ŵævẽš 3D Story`;
    const text = `Listen in 3D & move every sound on ñü.ŵævẽš: ${url}`;
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text, url });
        this.toast('Shared 9:16 Story card + link.');
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
    this.toast('Saved 9:16 Story card & copied link for Instagram.');
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
        if (labelEl) labelEl.textContent = `Recording Story clip… ${left}s`;
        await new Promise((r) => setTimeout(r, 1000));
        if (!this.dlg?.open) break;
      }
      if (rec.state !== 'inactive') rec.stop();
      const blob = await stopped;
      const ext = (rec.mimeType || '').includes('mp4') ? 'mp4' : 'webm';
      const fileName = `${t.id}-nu-waves-story.${ext}`;
      const file = new File([blob], fileName, { type: blob.type || `video/${ext}` });
      const title = `${t.title} · ñü.ŵævẽš Story / Reel`;
      const text = `Listen in 3D & move every sound on ñü.ŵævẽš: ${url}`;
      try {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title, text, url });
          this.toast('Shared 9:16 Story / Reel video + link.');
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
      this.toast(`Saved ${seconds}s 9:16 Story / Reel video & copied link.`);
    } catch {
      await this.shareStoryCard();
    } finally {
      audioTap?.disconnect();
      this.recording = false;
      if (labelEl) labelEl.textContent = origText;
    }
  }
}
