// The nu.waves app: Home, Search, Library and Channels under a hash router, a Now Playing bar, and the Now Playing
// view with the spacetime bubble, venues, ñü.ÊQ and head tracking. The Home is rendered on the server and kept; every
// other view is drawn here from the same catalogue module. Everything you keep stays in this browser.

import {
  ALBUMS,
  ARTISTS,
  CHAKRA_IDS,
  CHANNELS,
  COLLECTIONS,
  HEALING_ALL_IDS,
  HEALING_BINAURAL_IDS,
  HEALING_BOWL_IDS,
  HEALING_NATURE_IDS,
  TRACKS,
  albumOf,
  artistOf,
  trackOf,
  mmss,
  mb,
  type Album,
  type Artist,
  type Channel,
  type Collection,
  type Track,
} from '../../data/waves';
import { Engine, type Mode, type PlayTrack, type Repeat } from './engine';
import { Bubble } from './bubble';
import { HeadTracker, hasCamera, hasDeviceMotion, hasNative, type HeadSource } from './head';
import * as lib from './library';
import * as store from './store';
import { onAir, upcoming } from './channels';
import { capture as captureScene, encodeShare, decodeShare, listenUrl, songUrl, isCatalogueTrack, type Scene } from './scene';
import { InkPen, inkSvg } from './ink';
import { tide, resolveTide } from './tide';

// MARK: Helpers

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const KEEP = new Set('Apple Google Mac Pro Max AirPods Chromium Musopen Wikimedia Commons Spotify Instagram'.split(' '));
/** House style for headings drawn here: plainly Capitalized words go lowercase; names with their own casing stay. */
const lower = (text: string) =>
  text.replace(/(?<![\p{L}\p{N}])[\p{L}][\p{L}\p{M}\p{N}'’-]*/gu, (w) => {
    if (w === 'I') return w;
    const rest = w.slice(1);
    if (w[0] === w[0].toLowerCase() || rest !== rest.toLowerCase() || /\p{N}/u.test(w) || KEEP.has(w)) return w;
    return w.toLowerCase();
  });
const h2 = (t: string, extra = '') => `<h2 class="wv-h">${esc(lower(t))}${extra}</h2>`;
const art = (src: string | undefined, cls: string | undefined, alt = '', size = 320) =>
  src ? `<img class="wv-art" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" width="${size}" height="${size}" />` : `<span class="wv-art wv-art-css ${esc(cls || 'h1')}" aria-hidden="true"></span>`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const totalDur = (ts: { dur: number }[]) => {
  const s = ts.reduce((a, t) => a + (t.dur || 0), 0);
  return s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min` : `${Math.round(s / 60)} min`;
};
const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 5h3v14h-3zM13.5 5h3v14h-3z"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5.5v13L15 12zM16.5 5.5h2v13h-2z"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5.5v13L9 12zM5.5 5.5h2v13h-2z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z"/></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0 0l-4-4m4 4l4-4M4 19h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h3.5l9 10H20M20 7h-4.5L13 9.8M3 17h3.5l2.5-2.8M17.5 4.5L20 7l-2.5 2.5M17.5 14.5L20 17l-2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  repeat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  live: '<i class="wv-live-dot" aria-hidden="true"></i>',
  share:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10M12 3l-3.5 3.5M12 3l3.5 3.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }
}

type Route = { name: string; id?: string; sub?: string; q?: string };
const parseRoute = (): Route => {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  const q = new URLSearchParams(qs ?? '').get('q') ?? undefined;
  if (!seg.length) return { name: 'home' };
  if (seg[0] === 'library') {
    const sub = seg[1] && seg[1] !== 'all' ? seg[1] : 'songs';
    return { name: 'library', sub };
  }
  return { name: seg[0], id: seg[1], q };
};

// MARK: App

export class App {
  engine = new Engine();
  head = new HeadTracker();
  bubble!: Bubble;
  private root: HTMLElement;
  private view: HTMLElement;
  private homeHtml: string;
  private bar: HTMLElement;
  private now: HTMLElement;
  private kept = new Set<string>();
  private liked = new Set<string>();
  private follows = new Set<string>();
  private files: store.LocalFile[] = [];
  private playlists: store.Playlist[] = [];
  private busy = new Map<string, string>();
  private lastPaint = 0;
  private seeking = false;
  private menuFor: string | null = null;
  private toastTimer = 0;
  private floatTimers = new WeakMap<HTMLElement, number>();
  private scenes: Scene[] = [];
  private ink = new InkPen();
  private inkTrack = '';
  private wake: WakeLockSentinel | null = null;
  private installEvt: BeforeInstallPromptEvent | null = null;
  private barSwipe: { x: number; y: number } | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.view = root.querySelector('[data-view]')!;
    this.homeHtml = this.view.innerHTML;
    this.bar = root.querySelector('[data-bar]')!;
    this.now = root.querySelector('[data-now]')!;
  }

  async boot() {
    const e = this.engine;
    e.loader = (t) => lib.resolve(t.id);
    e.syncLoader = (t) => {
      if (t.local || t.id.startsWith('file:') || t.id.startsWith('native:') || this.kept.has(t.id)) return undefined;
      return this.light(t.id);
    };
    e.onPlayed((t, dur) => {
      void store.history.add(t.id, dur);
      void this.sealInk();
    });
    this.bubble = new Bubble(this.now.querySelector('[data-ring]')!, e, this.now.querySelector<HTMLInputElement>('[data-height]') ?? undefined, this.now.querySelector('[data-height-out]') ?? undefined);
    this.bubble.onSelect = () => this.paintShape();
    await this.loadState();
    this.bind();
    e.on(() => {
      this.paintNow();
      void this.refreshWake();
    });
    this.paintNow();
    addEventListener('hashchange', () => {
      void this.render().then(() => void this.openShare());
    });
    await this.render();
    const shared = await this.openShare();
    if (!shared) await this.cueDefault();
    const wakeGesture = () => {
      e.unlock();
    };
    addEventListener('pointerdown', wakeGesture, { capture: true, passive: true });
    addEventListener('touchend', wakeGesture, { capture: true, passive: true });
    addEventListener('keydown', wakeGesture, true);
    const loop = (now: number) => {
      e.frame(now);
      this.head.frame();
      if (this.head.source !== 'off' || Math.abs(this.head.pose.yaw) + Math.abs(this.head.pose.pitch) > 1e-3) {
        e.setPose(this.head.pose);
        this.ink.mark(this.head.pose.yaw / Math.PI, this.head.pose.pitch / Math.PI, 'head');
      }
      const sel = e.selected;
      if (sel && !sel.gone) this.ink.mark(sel.pos.x / 4, sel.pos.y / 4, 'drag');
      this.bubble.frame(now);
      if (now - this.lastPaint > 240) {
        this.lastPaint = now;
        this.paintTime();
        this.paintInkLive();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    if (hasNative()) {
      lib.onNativeLibrary(() => {
        if (parseRoute().name === 'library') void this.render();
      });
      lib.requestNativeLibrary();
    }
    void store.persist();
    this.bindInstall();
    this.paintOffline();
  }

  private async loadState() {
    const [kept, likes, follows, files, playlists, scenes] = await Promise.all([
      store.downloads.all(),
      store.likes.all(),
      store.follows.all(),
      store.files.all(),
      store.playlists.all(),
      store.scenes.all(),
    ]).catch(() => [[], [], [], [], [], []] as const);
    this.kept = new Set(kept.map((d) => d.trackId));
    this.liked = new Set(likes.map((l) => l.key));
    this.follows = new Set(follows.map((f) => f.id));
    this.files = files.sort((a, b) => b.added - a.added);
    this.playlists = playlists;
    this.scenes = scenes;
    const s = store.settings;
    const e = this.engine;
    const venue = await s.get('venue', 'hall');
    e.setVenue(venue);
    e.setFx(await s.get('fx', e.fx), await s.get('preset', null));
    e.mode = await s.get<Mode>('mode', 'waves');
    e.volume = await s.get('volume', 1);
    e.crossfade = await s.get('crossfade', 0);
    e.repeat = await s.get<Repeat>('repeat', 'off');
    e.shuffle = await s.get('shuffle', false);
    Object.assign(e.tone, await s.get('tone', e.tone));
  }

  private save() {
    const e = this.engine;
    const s = store.settings;
    void s.set('venue', e.venue.id);
    void s.set('fx', e.fx);
    void s.set('preset', e.preset);
    void s.set('mode', e.mode);
    void s.set('volume', e.volume);
    void s.set('crossfade', e.crossfade);
    void s.set('repeat', e.repeat);
    void s.set('shuffle', e.shuffle);
    void s.set('tone', e.tone);
  }

  private setFloat(el: HTMLElement | null | undefined, open: boolean) {
    if (!el) return;
    const prevTimer = this.floatTimers.get(el);
    if (open) {
      if (prevTimer) {
        clearTimeout(prevTimer);
        this.floatTimers.delete(el);
      }
      if (!el.hidden && el.dataset.open === '1') return;
      el.hidden = false;
      el.dataset.open = '0';
      void el.offsetWidth;
      requestAnimationFrame(() => {
        el.dataset.open = '1';
      });
    } else {
      if (el.hidden) return;
      if (el.dataset.open === '0' && prevTimer) return;
      el.dataset.open = '0';
      const timer = window.setTimeout(() => {
        if (el.dataset.open === '0') el.hidden = true;
        this.floatTimers.delete(el);
      }, 300);
      this.floatTimers.set(el, timer);
    }
  }

  private toast(msg: string) {
    const el = this.root.querySelector<HTMLElement>('[data-toast]');
    if (!el) return;
    el.textContent = msg;
    this.setFloat(el, true);
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.setFloat(el, false), 3200);
  }

  // MARK: Catalogue lookups

  private q(sel: string) {
    return this.root.querySelector<HTMLElement>(sel);
  }
  private tracksOf(ids: string[]): PlayTrack[] {
    return ids.map((id) => this.light(id)).filter((t): t is PlayTrack => !!t);
  }
  /** A queue entry: names and art, no files opened yet. */
  private light(id: string): PlayTrack | undefined {
    if (id.startsWith('file:')) {
      const f = this.files.find((x) => `file:${x.id}` === id);
      return f ? lib.trackOfFile(f) : undefined;
    }
    if (id.startsWith('native:')) {
      const n = lib.nativeItems().find((x) => `native:${x.id}` === id);
      return n ? lib.trackOfNative(n) : undefined;
    }
    const t = trackOf(id);
    return t ? lib.decorate(t) : undefined;
  }
  private fileTracks(): PlayTrack[] {
    return [...this.files.map(lib.trackOfFile), ...lib.nativeItems().map(lib.trackOfNative)];
  }

  // MARK: Views

  async render() {
    const r = parseRoute();
    for (const a of this.root.querySelectorAll<HTMLElement>('[data-tab]')) {
      const on = a.dataset.tab === r.name || (r.name === 'library' && a.dataset.tab === 'library');
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    this.view.dataset.route = r.name;
    let html = '';
    switch (r.name) {
      case 'home':
        this.view.innerHTML = this.homeHtml;
        await this.enhanceHome();
        break;
      case 't': {
        this.view.innerHTML = this.homeHtml;
        await this.enhanceHome();
        if (r.id && this.engine.track?.id !== r.id) {
          const t = this.light(r.id);
          if (t) {
            const albumIds = albumOf(t.albumId)?.tracks ?? TRACKS.map((x) => x.id);
            const rest = albumIds.filter((id) => id !== t.id);
            const queue = [t, ...this.tracksOf(rest)];
            await this.engine.setQueue(queue, 0, false);
            this.bubble.sync();
          }
        }
        this.openNow();
        break;
      }
      case 'healing':
        await this.cueCollection(['all-healing-tones', ...HEALING_ALL_IDS]);
        html = this.healingView();
        break;
      case 'search':
        html = this.searchView(r.q ?? '');
        break;
      case 'library':
        html = await this.libraryView(r.sub ?? 'songs');
        break;
      case 'channels':
        html = this.channelsView();
        break;
      case 'artist':
        html = this.artistView(r.id ?? '');
        break;
      case 'album':
        await this.cueCollection(albumOf(r.id ?? '')?.tracks);
        html = this.albumView(r.id ?? '');
        break;
      case 'collection':
        await this.cueCollection(COLLECTIONS.find((x) => x.id === (r.id ?? ''))?.tracks);
        html = this.collectionView(r.id ?? '');
        break;
      case 'channel':
        html = this.channelView(r.id ?? '');
        break;
      case 'playlist':
        await this.cueCollection(this.playlists.find((x) => x.id === (r.id ?? ''))?.tracks);
        html = this.playlistView(r.id ?? '');
        break;
      default:
        html = `<p class="wv-empty">Nothing here. <a href="#/">Home</a></p>`;
    }
    if (html) this.view.innerHTML = html;
    if (r.name !== 'home' && r.name !== 't' && r.name !== 'search') this.view.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
    if (r.name === 'search') {
      const input = this.view.querySelector<HTMLInputElement>('[data-search]');
      input?.focus({ preventScroll: true });
    }
    this.paintNow();
  }

  private async enhanceHome() {
    for (const el of this.view.querySelectorAll<HTMLElement>('[data-onair]')) {
      const ch = CHANNELS.find((c) => c.id === el.dataset.onair);
      const air = ch && onAir(ch);
      const t = air && trackOf(air.item.trackId);
      el.textContent = t ? `${t.title} · ${artistOf(t.artistId)?.name ?? ''}` : 'off air';
    }
    const plRail = this.view.querySelector<HTMLElement>('[data-home-playlists-rail]');
    if (plRail && this.playlists.length) {
      for (const p of this.playlists) {
        if (!plRail.querySelector(`[href="#/playlist/${CSS.escape(p.id)}"]`)) {
          plRail.insertAdjacentHTML('afterbegin', this.playlistCard(p));
        }
      }
    }
    const mine = this.view.querySelector<HTMLElement>('[data-home-mine]');
    if (!mine) return;
    let html = '';
    const mineTracks = this.fileTracks();
    if (mineTracks.length) {
      html += `<section class="wv-sec">${h2('Your files', `<a class="wv-h-link" href="#/library/files">${plural(mineTracks.length, 'file')}</a>`)}${this.list(mineTracks.slice(0, 5), { art: true })}</section>`;
    }
    mine.innerHTML = html;
  }

  private rail(cards: string[]) {
    return `<div class="wv-rail">${cards.join('')}</div>`;
  }
  private subnav(crumb: string) {
    return `<nav class="wv-subnav" aria-label="Breadcrumb">
  <a class="wv-subnav-back" href="#/">← Home</a>
  <a class="wv-subnav-pill" href="#/library/songs">Songs</a>
  <a class="wv-subnav-pill" href="#/library/albums">Albums</a>
  <a class="wv-subnav-pill" href="#/library/playlists">Playlists</a>
  <a class="wv-subnav-pill" href="#/healing">Healing tones</a>
  <a class="wv-subnav-pill" href="#/channels">Channels</a>
  <span class="wv-subnav-cur">${esc(lower(crumb))}</span>
</nav>`;
  }
  private albumCard(a: Album) {
    const by = artistOf(a.artistId)?.name ?? '';
    return `<a class="wv-card" href="#/album/${esc(a.id)}"><span class="wv-card-media">${art(a.art, a.artClass, '', 240)}<span class="wv-card-play" data-act="play-all" data-ids="${esc(JSON.stringify(a.tracks))}" role="button" tabindex="0" aria-label="Play ${esc(a.title)}">${ICON.play}</span></span><b>${esc(a.title)}</b><small>${esc(by)} · ${a.year}</small></a>`;
  }
  private collectionCard(c: Collection) {
    return `<a class="wv-card" href="#/collection/${esc(c.id)}"><span class="wv-card-media">${art(c.art, c.artClass, '', 240)}<span class="wv-card-play" data-act="play-all" data-ids="${esc(JSON.stringify(c.tracks))}" role="button" tabindex="0" aria-label="Play ${esc(c.title)}">${ICON.play}</span></span><b>${esc(c.title)}</b><small>${esc(c.desc)}</small></a>`;
  }
  private artistCard(a: Artist) {
    const artistTracks = TRACKS.filter((t) => t.artistId === a.id).map((t) => t.id);
    return `<a class="wv-card wv-card-round" href="#/artist/${esc(a.id)}"><span class="wv-card-media">${art(a.art, a.artClass, '', 240)}<span class="wv-card-play" data-act="play-all" data-ids="${esc(JSON.stringify(artistTracks))}" role="button" tabindex="0" aria-label="Play ${esc(a.name)}">${ICON.play}</span></span><b>${esc(a.name)}</b><small>${esc(a.kind)}</small></a>`;
  }
  private channelCard(c: Channel) {
    const air = c.kind === 'live' ? onAir(c) : null;
    const t = air && trackOf(air.item.trackId);
    const playAct = c.kind === 'live' ? `data-act="tune" data-id="${esc(c.id)}"` : '';
    return `<a class="wv-card wv-card-ch" href="#/channel/${esc(c.id)}"><span class="wv-card-media">${art(c.art, c.artClass, '', 240)}${playAct ? `<span class="wv-card-play" ${playAct} role="button" tabindex="0" aria-label="Tune in to ${esc(c.name)}">${ICON.play}</span>` : ''}</span><b>${c.live ? ICON.live : ''}${esc(c.name)}</b><small>${t ? `${esc(t.title)}` : esc(c.by)}</small></a>`;
  }
  private trackCard(t: PlayTrack) {
    return `<button type="button" class="wv-card" data-act="play-one" data-id="${esc(t.id)}"><span class="wv-card-media">${art(t.artUrl, this.cssArt(t), '', 240)}<span class="wv-card-play" aria-hidden="true">${ICON.play}</span></span><b>${esc(t.title)}</b><small>${esc(t.artistName ?? '')}</small></button>`;
  }
  private cssArt(t: PlayTrack) {
    if (t.local) return 'f1';
    if (t.kind === 'generator') return t.gen?.type === 'tone' ? 'h5' : t.gen?.type === 'binaural' ? 'h2' : 'h3';
    return 'h1';
  }

  /** A track list. `ids` of the whole list ride on the <ol>, so a tap on the row selects/loads and the play button starts. */
  private list(tracks: PlayTrack[], opts: { num?: boolean; art?: boolean; playlist?: string; showAlbum?: boolean } = {}) {
    const seen = new Set<string>();
    const unique = tracks.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
    if (!unique.length) return `<p class="wv-empty">Nothing yet.</p>`;
    const ids = unique.map((t) => t.id);
    const cur = this.engine.track?.id;
    return `<ol class="wv-list" data-list="${esc(JSON.stringify(ids))}">${unique
      .map((t, i) => {
        const sub = [t.artistName, opts.showAlbum ? t.albumTitle : '', t.spec ? t.spec.replace(/ · generated.*$/, '') : '', this.kept.has(t.id) ? 'kept' : ''].filter(Boolean).join(' · ');
        const canLayer = t.kind === 'generator' && !t.gens?.length;
        return `<li class="wv-row${t.id === cur ? ' is-current' : ''}" data-id="${esc(t.id)}">
  <button type="button" class="wv-row-play" data-act="play-track" data-id="${esc(t.id)}" data-i="${i}" aria-label="Play ${esc(t.title)}">${opts.art ? art(t.artUrl, this.cssArt(t), '', 96) : `<span class="wv-row-n">${i + 1}</span>`}<span class="wv-row-ic">${ICON.play}</span></button>
  <button type="button" class="wv-row-text" data-act="select-track" data-id="${esc(t.id)}" data-i="${i}"><b>${esc(t.title)}</b><small>${esc(sub)}</small></button>
  ${canLayer ? `<button type="button" class="wv-row-layer" data-act="add-to-bubble" data-id="${esc(t.id)}" title="Add ${esc(t.title)} into the spacetime bubble">+ 3D</button>` : ''}
  <button type="button" class="wv-row-share" data-act="share" data-id="${esc(t.id)}" title="Share ${esc(t.title)}" aria-label="Share ${esc(t.title)}">${ICON.share}</button>
  <span class="wv-row-dur">${t.loop ? '∞' : t.dur ? mmss(t.dur) : ''}</span>
  <button type="button" class="wv-row-more" data-act="menu" data-id="${esc(t.id)}" ${opts.playlist ? `data-playlist="${esc(opts.playlist)}"` : ''} aria-label="More for ${esc(t.title)}">${ICON.more}</button>
</li>`;
      })
      .join('')}</ol>`;
  }

  private headActions(ids: string[], extra = '') {
    const kept = ids.filter((id) => !id.startsWith('file:') && !id.startsWith('native:')).every((id) => this.kept.has(id) || trackOf(id)?.kind === 'generator');
    const keepable = ids.some((id) => trackOf(id) && trackOf(id)!.kind === 'song');
    return `<div class="wv-acts-row">
  <button type="button" class="wv-btn wv-btn-primary" data-act="play-all" data-ids="${esc(JSON.stringify(ids))}">${ICON.play}<span>Play</span></button>
  <button type="button" class="wv-btn" data-act="shuffle-all" data-ids="${esc(JSON.stringify(ids))}">${ICON.shuffle}<span>Shuffle</span></button>
  ${keepable ? `<button type="button" class="wv-btn" data-act="${kept ? 'unkeep-all' : 'keep-all'}" data-ids="${esc(JSON.stringify(ids))}">${kept ? ICON.check : ICON.down}<span>${kept ? 'Kept offline' : 'Keep offline'}</span></button>` : ''}
  ${extra}
</div>`;
  }

  private searchView(q: string) {
    const needle = q.trim().toLowerCase();
    let results = '';
    if (needle) {
      const has = (...parts: (string | undefined)[]) => parts.some((p) => p && p.toLowerCase().includes(needle));
      const tracks = [...TRACKS.map(lib.decorate), ...this.fileTracks()].filter((t) => has(t.title, t.artistName, t.albumTitle, t.tags.join(' '), t.spec)).slice(0, 40);
      const albums = ALBUMS.filter((a) => has(a.title, artistOf(a.artistId)?.name, a.note));
      const artists = ARTISTS.filter((a) => has(a.name, a.bio, a.kind));
      const channels = CHANNELS.filter((c) => has(c.name, c.by, c.desc));
      const collections = COLLECTIONS.filter((c) => has(c.title, c.desc));
      const playlists = this.playlists.filter((p) => has(p.name));
      results += tracks.length ? `<section class="wv-sec">${h2('Tracks')}${this.list(tracks, { art: true, showAlbum: true })}</section>` : '';
      results += artists.length ? `<section class="wv-sec">${h2('Artists')}${this.rail(artists.map((a) => this.artistCard(a)))}</section>` : '';
      results += albums.length ? `<section class="wv-sec">${h2('Albums')}${this.rail(albums.map((a) => this.albumCard(a)))}</section>` : '';
      results += collections.length ? `<section class="wv-sec">${h2('Collections')}${this.rail(collections.map((c) => this.collectionCard(c)))}</section>` : '';
      results += channels.length ? `<section class="wv-sec">${h2('Channels')}${this.rail(channels.map((c) => this.channelCard(c)))}</section>` : '';
      results += playlists.length ? `<section class="wv-sec">${h2('Playlists')}${this.rail(playlists.map((p) => this.playlistCard(p)))}</section>` : '';
      if (!results) results = `<p class="wv-empty">Nothing for “${esc(q)}”. Search runs on this device: the catalogue, your files and your playlists.</p>`;
    } else {
      const tags = ['piano', 'nocturne', 'sleep', 'focus', 'healing', 'rain', 'ocean', 'binaural', 'film score', 'classical', 'waltz', 'chakra'];
      results = `<section class="wv-sec">${h2('Browse')}<div class="wv-chips">${tags.map((t) => `<a class="wv-chip" href="#/search?q=${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}</div></section>
<section class="wv-sec">${h2('Artists')}${this.rail(ARTISTS.map((a) => this.artistCard(a)))}</section>`;
    }
    return `<form class="wv-search" data-search-form role="search" action="#/search">
  <label class="sr" for="wv-q">Search nu.waves</label>
  <input id="wv-q" type="search" name="q" data-search value="${esc(q)}" placeholder="Songs, artists, channels, your files" autocomplete="off" />
</form>${results}`;
  }

  private healingView() {
    const ensembles = this.tracksOf(['all-healing-tones', 'all-chakras-3d']);
    const chakras = this.tracksOf(CHAKRA_IDS);
    const bowls = this.tracksOf(HEALING_BOWL_IDS);
    const binaural = this.tracksOf(HEALING_BINAURAL_IDS);
    const nature = this.tracksOf(HEALING_NATURE_IDS);
    return `${this.subnav('healing tones')}
<header class="wv-page-head">
  ${art(undefined, 'h1', '', 240)}
  <div>
    <p class="eyebrow">ñü.ŵævẽš · generated on your device</p>
    <h1 class="wv-h1">healing tones & frequencies</h1>
    <p class="wv-page-sub">Seven planetary chakra tones, Solfeggio singing bowls (528 · 432 · 396 Hz), binaural beats and nature sounds. Play them all in sequence, place all 10 in the 3D spacetime bubble at once, or tap <b>+ 3D</b> on any sound to layer it into what you’re hearing.</p>
  </div>
</header>
<div class="wv-acts-row">
  <button type="button" class="wv-btn wv-btn-primary" data-act="play-healing-all">${ICON.play}<span>Play all healing tones</span></button>
  <button type="button" class="wv-btn" data-act="play-one" data-id="all-healing-tones"><span>All 10 tones in 3D bubble</span></button>
  <button type="button" class="wv-btn" data-act="play-one" data-id="all-chakras-3d"><span>All 7 chakras in 3D</span></button>
  <button type="button" class="wv-btn" data-act="shuffle-all" data-ids="${esc(JSON.stringify(HEALING_ALL_IDS))}">${ICON.shuffle}<span>Shuffle all</span></button>
  <button type="button" class="wv-btn" data-act="tune" data-id="healing-live">${ICON.live}<span>Healing live channel</span></button>
</div>
<section class="wv-sec">
  ${h2('3D ensembles (all in the bubble at once)')}
  ${this.list(ensembles, { art: true })}
</section>
<section class="wv-sec">
  ${h2('7 planetary chakra tones (root → crown)', `<button type="button" class="wv-h-link" data-act="play-all" data-ids="${esc(JSON.stringify(CHAKRA_IDS))}">Play all 7 →</button>`)}
  ${this.list(chakras, { num: true })}
</section>
<section class="wv-sec">
  ${h2('Solfeggio singing bowls (528 · 432 · 396 Hz)', `<button type="button" class="wv-h-link" data-act="play-all" data-ids="${esc(JSON.stringify(HEALING_BOWL_IDS))}">Play bowls →</button>`)}
  ${this.list(bowls, { art: true })}
</section>
<section class="wv-sec">
  ${h2('Binaural beats (theta · alpha · delta)', `<button type="button" class="wv-h-link" data-act="play-all" data-ids="${esc(JSON.stringify(HEALING_BINAURAL_IDS))}">Play binaural →</button>`)}
  ${this.list(binaural, { art: true })}
</section>
<section class="wv-sec">
  ${h2('Nature & sleep sounds', `<button type="button" class="wv-h-link" data-act="play-all" data-ids="${esc(JSON.stringify(HEALING_NATURE_IDS))}">Play nature →</button>`)}
  ${this.list(nature, { art: true })}
</section>`;
  }

  private async libraryView(sub: string) {
    const activeSub = sub === 'all' ? 'songs' : sub;
    const tabs = [
      ['songs', 'Songs'],
      ['albums', 'Albums'],
      ['playlists', 'Playlists'],
      ['healing', 'Healing tones'],
      ['liked', 'Liked'],
      ['kept', 'Kept offline'],
      ['files', 'Your files'],
      ['scenes', 'Scenes'],
      ['ink', 'Ink'],
      ['history', 'History'],
      ['following', 'Following'],
    ];
    const headBar = `<div class="wv-lib-topbar">
  <div>
    <h1 class="wv-h1 wv-lib-title">your library</h1>
    <p class="wv-lib-sub">Songs, albums, playlists and healing tones — separate, organized and sealed on this device.</p>
  </div>
  <div class="wv-acts-row">
    <button type="button" class="wv-btn wv-btn-primary" data-act="play-healing-all">${ICON.play}<span>Play all healing tones</span></button>
    <button type="button" class="wv-btn" data-act="new-playlist"><span>+ New playlist</span></button>
    <button type="button" class="wv-btn" data-act="add-files">${ICON.down}<span>+ Add files</span></button>
    <input type="file" accept="audio/*,.mp3,.m4a,.aac,.mp4,.wav,.flac,.ogg,.opus,.aif,.aiff,.caf" multiple hidden data-file-input />
  </div>
</div>`;
    const nav = `<div class="wv-segs" role="tablist" aria-label="Library">${tabs.map(([id, label]) => `<a role="tab" href="#/library/${id}" aria-selected="${id === activeSub}">${esc(label)}</a>`).join('')}</div>`;
    let body = '';
    if (activeSub === 'songs') {
      const mine = this.fileTracks();
      const catSongs = TRACKS.filter((t) => t.kind === 'song').map(lib.decorate);
      const songs = [...mine, ...catSongs];
      body = `<section class="wv-sec">
  ${h2('Songs', `<span class="wv-h-sub">${plural(songs.length, 'song')}</span>`)}
  ${this.headActions(songs.map((t) => t.id))}
  ${this.list(songs, { art: true, showAlbum: true })}
</section>`;
    } else if (activeSub === 'albums') {
      const musicAlbums = ALBUMS.filter((a) => a.artistId !== 'waves');
      body = `<section class="wv-sec">
  ${h2('Albums', `<span class="wv-h-sub">${plural(musicAlbums.length, 'album')}</span>`)}
  ${this.rail(musicAlbums.map((a) => this.albumCard(a)))}
</section>`;
    } else if (activeSub === 'playlists') {
      const cards = [
        ...this.playlists.map((p) => this.playlistCard(p)),
        ...COLLECTIONS.map((c) => this.collectionCard(c)),
      ];
      body = `<section class="wv-sec">
  ${h2('Playlists', `<button type="button" class="wv-h-link" data-act="new-playlist">+ New playlist</button>`)}
  ${cards.length ? this.rail(cards) : `<p class="wv-empty">No playlists yet.</p>`}
</section>`;
    } else if (activeSub === 'healing') {
      const healingTracks = this.tracksOf(['all-healing-tones', 'all-chakras-3d', ...HEALING_ALL_IDS]);
      body = `<div class="wv-acts-row">
  <button type="button" class="wv-btn wv-btn-primary" data-act="play-healing-all">${ICON.play}<span>Play all healing tones</span></button>
  <button type="button" class="wv-btn" data-act="play-one" data-id="all-healing-tones"><span>All 10 tones in 3D</span></button>
  <button type="button" class="wv-btn" data-act="play-one" data-id="all-chakras-3d"><span>All 7 chakras in 3D</span></button>
  <button type="button" class="wv-btn" data-act="play-all" data-ids="${esc(JSON.stringify(HEALING_BOWL_IDS))}"><span>Solfeggio bowls</span></button>
</div>
${this.list(healingTracks, { art: true, showAlbum: false })}`;
    } else if (activeSub === 'files') {
      const use = await store.usage();
      const mine = this.fileTracks();
      const nativeN = lib.nativeItems().length;
      body = `<div class="wv-lib-head">
  <p class="wv-lib-note">Add music from this device. Files are copied into a sealed library in this browser (AES-256-GCM, a key that never leaves it) and play like everything else: left and right as two sounds you can move. Nothing is uploaded.</p>
  <div class="wv-acts-row">
    <button type="button" class="wv-btn wv-btn-primary" data-act="add-files">${ICON.down}<span>Add files</span></button>
    ${lib.canPickFolder() ? `<button type="button" class="wv-btn" data-act="add-folder"><span>Add a folder</span></button>` : ''}
    ${hasNative() ? `<button type="button" class="wv-btn" data-act="native-refresh"><span>Music on this phone${nativeN ? ` · ${nativeN}` : ''}</span></button>` : ''}
  </div>
  <p class="wv-lib-storage" data-storage>${use.bytes ? `${mb(use.bytes)} on this device${use.quota ? ` · ${mb(use.quota)} available` : ''}` : ''}</p>
  <p class="wv-progress" data-add-progress hidden></p>
</div>
${mine.length ? this.headActions(mine.map((t) => t.id)) : ''}
${this.list(mine, { art: true, showAlbum: true })}`;
    } else if (activeSub === 'kept') {
      const ids = [...this.kept];
      const tracks = this.tracksOf(ids);
      const bytes = (await store.downloads.all()).reduce((a, d) => a + d.bytes, 0);
      body = `<p class="wv-lib-note">Kept tracks play with no connection, sealed on this device. ${bytes ? `${mb(bytes)} kept.` : 'Keep an album from its page, or a track from its menu.'} All generated healing sounds need no download: they are already here.</p>
${tracks.length ? this.headActions(ids) : ''}${this.list(tracks, { art: true, showAlbum: true })}`;
    } else if (activeSub === 'liked') {
      const tracks = this.tracksOf([...this.liked]);
      body = `${tracks.length ? this.headActions(tracks.map((t) => t.id)) : ''}${this.list(tracks, { art: true, showAlbum: true })}`;
    } else if (activeSub === 'scenes') {
      const all = await store.scenes.all();
      this.scenes = all;
      body = all.length
        ? `<p class="wv-lib-note">ñü.scene layouts stay on this device. Share a listen and the catalogue song opens with these settings.</p><ul class="wv-scene-lib">${all
            .map(
              (s) => `<li>
  <b>${esc(s.name)}</b>
  <small>${esc(s.trackId ? trackOf(s.trackId)?.title || s.trackId : 'any track')} · ${new Date(s.updated).toLocaleDateString()}</small>
  <span class="wv-acts-row">
    <button type="button" class="wv-btn" data-act="scene-apply" data-id="${esc(s.id)}"><span>Recall</span></button>
    <button type="button" class="wv-btn" data-act="scene-share" data-id="${esc(s.id)}"><span>Share scene</span></button>
    <button type="button" class="wv-btn" data-act="scene-delete" data-id="${esc(s.id)}"><span>Delete</span></button>
  </span>
</li>`,
            )
            .join('')}</ul>`
        : `<p class="wv-empty">No scenes yet. Play something, arrange the spacetime bubble, then save a ñü.scene.</p>`;
    } else if (activeSub === 'ink') {
      const rows = await store.inks.recent(60);
      body = rows.length
        ? `<p class="wv-lib-note">ñü.ink glyphs of how you listened. Private to this device.</p><div class="wv-ink-grid">${rows
            .map((ink) => `<figure class="wv-ink-card" title="${esc(ink.title)}">${inkSvg(ink.d, 120)}<figcaption><b>${esc(ink.title)}</b><small>${new Date(ink.at).toLocaleString()}</small></figcaption><button type="button" class="wv-btn" data-act="ink-delete" data-id="${esc(ink.id)}"><span>Delete</span></button></figure>`)
            .join('')}</div><div class="wv-acts-row"><button type="button" class="wv-btn" data-act="ink-clear"><span>Clear all ink</span></button></div>`
        : `<p class="wv-empty">No ink yet. Drag sounds or turn your head while something plays, then keep the glyph.</p>`;
    } else if (activeSub === 'history') {
      const rows = await store.history.recent(100);
      const tracks = rows.map((r) => this.light(r.key)).filter((t): t is PlayTrack => !!t);
      body = `${tracks.length ? `<div class="wv-acts-row"><button type="button" class="wv-btn" data-act="clear-history"><span>Clear history</span></button></div>` : ''}${this.list(tracks, { art: true, showAlbum: true })}`;
    } else if (activeSub === 'following') {
      const arts = ARTISTS.filter((a) => this.follows.has(a.id));
      const chs = CHANNELS.filter((c) => this.follows.has(c.id));
      body = arts.length || chs.length ? `${arts.length ? `<section class="wv-sec">${h2('Artists')}${this.rail(arts.map((a) => this.artistCard(a)))}</section>` : ''}${chs.length ? `<section class="wv-sec">${h2('Channels')}${this.rail(chs.map((c) => this.channelCard(c)))}</section>` : ''}` : `<p class="wv-empty">Follow an artist or a channel and it shows here. Follows stay on this device.</p>`;
    }
    return `${headBar}${nav}<div class="wv-lib">${body}</div>`;
  }

  private playlistCard(p: store.Playlist) {
    return `<a class="wv-card" href="#/playlist/${esc(p.id)}"><span class="wv-card-media">${art(undefined, 'p1', '', 240)}${p.tracks.length ? `<span class="wv-card-play" data-act="play-all" data-ids="${esc(JSON.stringify(p.tracks))}" role="button" tabindex="0" aria-label="Play ${esc(p.name)}">${ICON.play}</span>` : ''}</span><b>${esc(p.name)}</b><small>${plural(p.tracks.length, 'track')}</small></a>`;
  }

  private channelsView() {
    const live = CHANNELS.filter((c) => c.kind === 'live');
    const creators = CHANNELS.filter((c) => c.kind === 'creator');
    return `<section class="wv-sec">${h2('Live now')}<p class="wv-lib-note">Programmes pinned to the clock: everyone who tunes in hears the same moment, with no server choosing. Tune in and the player joins mid-song.</p>${this.rail(live.map((c) => this.channelCard(c)))}</section>
<section class="wv-sec">${h2('Creator channels')}<p class="wv-lib-note">Artists publish releases to their channel and go live when they play. Follow to hear when something new is up.</p>${this.rail(creators.map((c) => this.channelCard(c)))}</section>`;
  }

  private channelView(id: string) {
    const c = CHANNELS.find((x) => x.id === id);
    if (!c) return `<p class="wv-empty">No such channel.</p>`;
    const following = this.follows.has(c.id);
    const follow = `<button type="button" class="wv-btn" data-act="follow" data-id="${esc(c.id)}" data-kind="channel" aria-pressed="${following}"><span>${following ? 'Following' : 'Follow'}</span></button>`;
    let body = '';
    if (c.kind === 'live') {
      const air = onAir(c);
      const t = air && trackOf(air.item.trackId);
      const next = upcoming(c, 8).map(({ item, at }) => {
        const tr = trackOf(item.trackId);
        return `<li><time datetime="${new Date(at).toISOString()}">${new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time><span>${esc(tr?.title ?? item.trackId)}</span><small>${esc(tr ? (artistOf(tr.artistId)?.name ?? '') : '')}</small></li>`;
      });
      body = `<div class="wv-acts-row"><button type="button" class="wv-btn wv-btn-primary" data-act="tune" data-id="${esc(c.id)}">${ICON.play}<span>Tune in</span></button>${follow}</div>
<p class="wv-onair-line">${ICON.live} On air: <b>${esc(t?.title ?? '')}</b>${air ? ` · ${mmss(air.offset)} in` : ''}</p>
<section class="wv-sec">${h2('Up next')}<ol class="wv-sched">${next.join('')}</ol></section>`;
    } else {
      const rel = (c.releases ?? []).map((r) => albumOf(r)).filter((a): a is Album => !!a);
      body = `<div class="wv-acts-row">${follow}</div>
<p class="wv-lib-note">${c.live ? 'Live now.' : 'Not live right now.'} ${esc(c.desc)}</p>
<section class="wv-sec">${h2('Releases')}${this.rail(rel.map((a) => this.albumCard(a)))}</section>`;
    }
    return `${this.subnav(c.name)}<header class="wv-page-head">${art(c.art, c.artClass, '', 480)}<div><p class="eyebrow">${c.kind === 'live' ? 'live channel' : 'creator channel'}</p><h1 class="wv-h1">${esc(lower(c.name))}</h1><p class="wv-page-sub">${esc(c.desc)}</p><p class="wv-page-meta">by ${esc(c.by)}</p></div></header>${body}`;
  }

  private artistView(id: string) {
    const a = artistOf(id);
    if (!a) return `<p class="wv-empty">No such artist.</p>`;
    const albums = ALBUMS.filter((x) => x.artistId === a.id);
    const tracks = TRACKS.filter((t) => t.artistId === a.id).map(lib.decorate);
    const chans = CHANNELS.filter((c) => c.artistId === a.id);
    const following = this.follows.has(a.id);
    return `${this.subnav(a.name)}<header class="wv-page-head">${art(a.art, a.artClass, '', 480)}<div><p class="eyebrow">${esc(a.kind)}${a.handle ? ` · <span class="wv-handle">${esc(a.handle)}</span>` : ''}</p><h1 class="wv-h1">${esc(lower(a.name))}</h1><p class="wv-page-sub">${esc(a.bio)}</p>${(a.links ?? []).map((l) => `<a class="wv-page-link" href="${esc(l.href)}" rel="noopener">${esc(l.label)}</a>`).join(' ')}</div></header>
${this.headActions(
  tracks.map((t) => t.id),
  `<button type="button" class="wv-btn" data-act="follow" data-id="${esc(a.id)}" data-kind="artist" aria-pressed="${following}"><span>${following ? 'Following' : 'Follow'}</span></button>`,
)}
${albums.length ? `<section class="wv-sec">${h2('Releases')}${this.rail(albums.map((x) => this.albumCard(x)))}</section>` : ''}
<section class="wv-sec">${h2('Tracks')}${this.list(tracks, { showAlbum: true })}</section>
${chans.length ? `<section class="wv-sec">${h2('Channels')}${this.rail(chans.map((c) => this.channelCard(c)))}</section>` : ''}`;
  }

  private albumView(id: string) {
    const a = albumOf(id);
    if (!a) return `<p class="wv-empty">No such album.</p>`;
    const tracks = this.tracksOf(a.tracks);
    const by = artistOf(a.artistId);
    return `${this.subnav(a.title)}<header class="wv-page-head">${art(a.art, a.artClass, '', 480)}<div><p class="eyebrow">${esc(a.kind)} · ${a.year}</p><h1 class="wv-h1">${esc(lower(a.title))}</h1><p class="wv-page-sub"><a href="#/artist/${esc(a.artistId)}">${esc(by?.name ?? '')}</a> · ${plural(tracks.length, 'track')} · ${totalDur(tracks)}</p>${a.note ? `<p class="wv-page-meta">${esc(a.note)}</p>` : ''}<p class="wv-page-licence">${esc(a.licence)}</p></div></header>
${this.headActions(a.tracks)}
${this.list(tracks, { num: true })}`;
  }

  private collectionView(id: string) {
    const c = COLLECTIONS.find((x) => x.id === id);
    if (!c) return `<p class="wv-empty">No such collection.</p>`;
    const tracks = this.tracksOf(c.tracks);
    return `${this.subnav(c.title)}<header class="wv-page-head">${art(c.art, c.artClass, '', 480)}<div><p class="eyebrow">${c.journey ? 'journey' : 'collection'}</p><h1 class="wv-h1">${esc(lower(c.title))}</h1><p class="wv-page-sub">${esc(c.desc)}</p><p class="wv-page-meta">${plural(tracks.length, 'track')}${c.journey ? ' · plays as one, crossfading, on a loop' : ''}</p></div></header>
${this.headActions(c.tracks)}
${this.list(tracks, { art: true, showAlbum: true })}`;
  }

  private playlistView(id: string) {
    const p = this.playlists.find((x) => x.id === id);
    if (!p) return `<p class="wv-empty">No such playlist.</p>`;
    const tracks = this.tracksOf(p.tracks);
    return `${this.subnav(p.name)}<header class="wv-page-head">${art(undefined, 'p1', '', 480)}<div><p class="eyebrow">playlist</p><h1 class="wv-h1">${esc(lower(p.name))}</h1><p class="wv-page-sub">${plural(tracks.length, 'track')} · ${totalDur(tracks)}</p></div></header>
${this.headActions(
  p.tracks,
  `<button type="button" class="wv-btn" data-act="rename-playlist" data-id="${esc(p.id)}"><span>Rename</span></button><button type="button" class="wv-btn" data-act="delete-playlist" data-id="${esc(p.id)}"><span>Delete</span></button>`,
)}
${this.list(tracks, { art: true, showAlbum: true, playlist: p.id })}`;
  }

  // MARK: Actions

  private bind() {
    this.root.addEventListener('click', (e) => void this.onClick(e));
    this.root.addEventListener('submit', (e) => {
      const form = (e.target as HTMLElement).closest<HTMLFormElement>('[data-search-form]');
      if (!form) return;
      e.preventDefault();
      const q = form.querySelector<HTMLInputElement>('[data-search]')?.value ?? '';
      location.hash = `#/search?q=${encodeURIComponent(q)}`;
    });
    this.root.addEventListener('input', (e) => {
      const el = e.target as HTMLInputElement;
      if (el.matches('[data-search]')) {
        const q = el.value;
        clearTimeout(this.searchTimer);
        this.searchTimer = window.setTimeout(() => {
          history.replaceState(null, '', `#/search?q=${encodeURIComponent(q)}`);
          const res = document.createElement('div');
          res.innerHTML = this.searchView(q);
          const form = this.view.querySelector('[data-search-form]');
          this.view.innerHTML = '';
          if (form) this.view.appendChild(form);
          for (const n of [...res.children]) if (!n.matches('[data-search-form]')) this.view.appendChild(n);
        }, 120);
        return;
      }
      void this.onInput(el);
    });
    this.root.addEventListener('change', (e) => {
      const el = e.target as HTMLInputElement;
      if (el.matches('[data-file-input]') && el.files?.length) void this.importFiles(el.files);
      if (el.matches('[data-sleep]')) {
        this.engine.setSleep(Number(el.value));
        this.toast(Number(el.value) ? `Sleeping in ${el.value} min.` : 'Sleep timer off.');
      }
    });
    const seek = this.q('[data-seek]') as HTMLInputElement | null;
    seek?.addEventListener('pointerdown', () => (this.seeking = true));
    seek?.addEventListener('change', () => {
      this.seeking = false;
      this.engine.seek(Number(seek.value));
    });
    addEventListener('keydown', (e) => {
      const a = document.activeElement as HTMLElement | null;
      const typing = a && (a.matches('input, textarea, select, [contenteditable]') || a.isContentEditable);
      if (typing) return;
      if (e.key === ' ' && !(a && a.matches('button, a, [role=button]'))) {
        e.preventDefault();
        void this.engine.toggle();
      } else if (e.key === 'Escape' && !this.now.hidden) this.openNow(false);
      else if (e.key === 'ArrowRight' && e.shiftKey) this.engine.seek(this.engine.position() + 10);
      else if (e.key === 'ArrowLeft' && e.shiftKey) this.engine.seek(this.engine.position() - 10);
      else if (e.key === 'n' || e.key === 'N') void this.engine.next();
      else if (e.key === 'p' || e.key === 'P') void this.engine.prev();
      else if (e.key === 'm' || e.key === 'M') {
        this.engine.setVolume(this.engine.volume > 0 ? 0 : 1);
        this.save();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.engine.setVolume(this.engine.volume + 0.05);
        this.save();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.engine.setVolume(this.engine.volume - 0.05);
        this.save();
      } else if (e.key === 'f' || e.key === 'F') void this.like(this.engine.track?.id || '');
    });
    addEventListener('online', () => {
      this.toast('Back online.');
      this.paintOffline();
    });
    addEventListener('offline', () => {
      this.toast('Offline. Kept tracks, your files and generated sounds still play.');
      this.paintOffline();
    });
    // Swipe the mini bar: left = next, right = previous.
    this.bar.addEventListener('pointerdown', (e) => {
      this.barSwipe = { x: e.clientX, y: e.clientY };
    });
    this.bar.addEventListener('pointerup', (e) => {
      if (!this.barSwipe) return;
      const dx = e.clientX - this.barSwipe.x;
      const dy = e.clientY - this.barSwipe.y;
      this.barSwipe = null;
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      if (dx < 0) void this.engine.next();
      else void this.engine.prev();
    });
    document.addEventListener('visibilitychange', () => void this.refreshWake());
  }
  private searchTimer = 0;

  private async onClick(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el) return;
    if (el.closest('a[href]')) {
      e.preventDefault();
      e.stopPropagation();
    }
    const act = el.dataset.act!;
    const id = el.dataset.id ?? '';
    const eng = this.engine;
    const ids = () => JSON.parse(el.dataset.ids ?? '[]') as string[];
    const listIds = () => {
      const ol = el.closest<HTMLElement>('[data-list]');
      return ol ? (JSON.parse(ol.dataset.list!) as string[]) : [id];
    };
    switch (act) {
      case 'play-healing-all':
        eng.setRepeat('all');
        this.playIds(['all-healing-tones', ...HEALING_ALL_IDS], 0, true);
        this.toast('Playing all healing tones.');
        break;
      case 'add-to-bubble': {
        const tr = this.light(id);
        if (tr) {
          await eng.addGenToBubble(tr);
          this.bubble.sync();
          this.paintNow();
          this.toast(`${tr.title} added to the spacetime bubble.`);
        }
        break;
      }
      case 'select-track': {
        const all = listIds();
        const i = Math.max(0, all.indexOf(id));
        const isTouch = typeof matchMedia === 'function' && matchMedia('(hover: none), (pointer: coarse)').matches;
        if (eng.track?.id === id && eng.deck && !eng.live) {
          if (isTouch) await eng.toggle();
          this.openNow(true);
          break;
        }
        this.playIds(all, i, isTouch || eng.playing);
        break;
      }
      case 'play-track': {
        const all = listIds();
        const i = Math.max(0, all.indexOf(id));
        if (eng.track?.id === id && eng.deck && !eng.live) return void eng.toggle();
        this.playIds(all, i, true);
        break;
      }
      case 'play-one':
        this.playIds([id], 0);
        break;
      case 'play-all':
        this.playIds(ids(), 0);
        break;
      case 'shuffle-all': {
        const all = ids();
        eng.setShuffle(true);
        this.playIds(all, Math.floor(Math.random() * all.length));
        break;
      }
      case 'tune':
        await this.tune(id);
        break;
      case 'leave':
        eng.leaveChannel();
        break;
      case 'toggle':
        if (!eng.track) this.playIds(['first-attempt'], 0);
        else await eng.toggle();
        break;
      case 'next':
        await eng.next();
        break;
      case 'prev':
        await eng.prev();
        break;
      case 'shuffle':
        eng.setShuffle(!eng.shuffle);
        this.save();
        break;
      case 'repeat':
        eng.setRepeat(eng.repeat === 'off' ? 'all' : eng.repeat === 'all' ? 'one' : 'off');
        this.save();
        break;
      case 'open-now':
        this.openNow(true);
        break;
      case 'close-now':
        this.openNow(false);
        break;
      case 'queue-toggle': {
        const q = this.q('[data-queue]')!;
        q.hidden = !q.hidden;
        el.setAttribute('aria-pressed', String(!q.hidden));
        if (!q.hidden) q.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
      case 'queue-jump':
        if (eng.playing) await eng.playIndex(Number(el.dataset.i));
        else await eng.loadIndex(Number(el.dataset.i));
        this.bubble.sync();
        this.paintNow();
        break;
      case 'queue-remove':
        eng.removeAt(Number(el.dataset.i));
        break;
      case 'queue-clear':
        eng.clearQueue();
        this.toast('Queue cleared.');
        break;
      case 'queue-up': {
        const i = Number(el.dataset.i);
        eng.move(i, Math.max(0, i - 1));
        break;
      }
      case 'queue-down': {
        const i = Number(el.dataset.i);
        eng.move(i, Math.min(eng.queue.length - 1, i + 1));
        break;
      }
      case 'queue-next':
      case 'queue-last': {
        const t = this.light(id);
        if (t) {
          eng.enqueue([t], act === 'queue-next');
          this.toast(act === 'queue-next' ? 'Playing next.' : 'Added to the queue.');
        }
        this.closeMenu();
        break;
      }
      case 'like':
        await this.like(id || eng.track?.id || '');
        break;
      case 'follow': {
        const on = !this.follows.has(id);
        await store.follows.set(id, (el.dataset.kind as 'artist' | 'channel') ?? 'artist', on);
        if (on) this.follows.add(id);
        else this.follows.delete(id);
        await this.render();
        break;
      }
      case 'keep':
        await this.keep([id]);
        this.closeMenu();
        break;
      case 'unkeep':
        await lib.unkeep(id);
        this.kept.delete(id);
        this.toast('Removed from this device.');
        this.closeMenu();
        await this.render();
        break;
      case 'keep-all':
        await this.keep(ids());
        break;
      case 'unkeep-all':
        for (const t of ids()) if (this.kept.has(t)) {
          await lib.unkeep(t);
          this.kept.delete(t);
        }
        this.toast('Removed from this device.');
        await this.render();
        break;
      case 'keep-current':
        if (eng.track) await this.keep([eng.track.id]);
        break;
      case 'add-files':
        this.q('[data-file-input]')?.click();
        break;
      case 'add-folder':
        await this.importFolder();
        break;
      case 'native-refresh':
        lib.requestNativeLibrary();
        this.toast('Asking the app for your music…');
        break;
      case 'remove-file': {
        await store.files.remove(id.replace(/^file:/, ''));
        this.files = this.files.filter((f) => `file:${f.id}` !== id);
        this.closeMenu();
        await this.render();
        break;
      }
      case 'menu':
        this.openMenu(id, el.dataset.playlist);
        break;
      case 'close-menu':
        this.closeMenu();
        break;
      case 'go': {
        this.closeMenu();
        location.hash = el.dataset.href ?? '#/';
        break;
      }
      case 'new-playlist': {
        const name = prompt('Playlist name');
        if (!name) break;
        const p: store.Playlist = { id: store.uid(), name: name.trim(), tracks: id ? [id] : [], created: Date.now(), updated: Date.now() };
        await store.playlists.put(p);
        this.playlists.unshift(p);
        this.closeMenu();
        this.toast(id ? `Added to ${p.name}.` : `${p.name} created.`);
        if (!id) location.hash = `#/playlist/${p.id}`;
        else await this.render();
        break;
      }
      case 'add-to-playlist': {
        this.closeMenu();
        this.pickPlaylist(id);
        break;
      }
      case 'put-in-playlist': {
        const p = this.playlists.find((x) => x.id === el.dataset.playlist);
        const tid = el.dataset.track ?? '';
        if (p && tid && !p.tracks.includes(tid)) {
          p.tracks.push(tid);
          p.updated = Date.now();
          await store.playlists.put(p);
        }
        (this.q('[data-pick]') as HTMLDialogElement | null)?.close();
        this.toast(p ? `Added to ${p.name}.` : 'Added.');
        break;
      }
      case 'remove-from-playlist': {
        const p = this.playlists.find((x) => x.id === el.dataset.playlist);
        if (p) {
          p.tracks = p.tracks.filter((t) => t !== id);
          p.updated = Date.now();
          await store.playlists.put(p);
        }
        this.closeMenu();
        await this.render();
        break;
      }
      case 'rename-playlist': {
        const p = this.playlists.find((x) => x.id === id);
        const name = p && prompt('Playlist name', p.name);
        if (p && name) {
          p.name = name.trim();
          p.updated = Date.now();
          await store.playlists.put(p);
          await this.render();
        }
        break;
      }
      case 'delete-playlist': {
        const p = this.playlists.find((x) => x.id === id);
        if (p && confirm(`Delete ${p.name}?`)) {
          await store.playlists.remove(p.id);
          this.playlists = this.playlists.filter((x) => x.id !== p.id);
          location.hash = '#/library/playlists';
        }
        break;
      }
      case 'clear-history':
        await store.history.clear();
        await this.render();
        break;
      case 'mode':
        eng.setMode(el.dataset.mode as Mode);
        this.save();
        break;
      case 'venue':
        eng.setVenue(el.dataset.venue!);
        this.save();
        this.root.querySelector<HTMLDetailsElement>('[data-room-menu]')!.open = false;
        break;
      case 'preset':
        eng.usePreset(el.dataset.preset!);
        this.save();
        break;
      case 'rotate':
        eng.rotate(Number(el.dataset.deg));
        break;
      case 'restore':
        eng.restoreObjs();
        break;
      case 'head': {
        const src = (el.dataset.src as HeadSource) || 'off';
        const next = src === 'off' ? 'off' : src === this.head.source ? 'off' : src;
        const ok = await this.head.start(next);
        this.bubble.showFacing = this.head.source !== 'off';
        if (this.head.source === 'off') eng.setPose({ yaw: 0, pitch: 0, roll: 0 });
        this.paintHead();
        if (!ok && this.head.status) this.toast(this.head.status);
        break;
      }
      case 'recentre':
        this.head.recentre();
        this.toast('Ahead is where you are facing now.');
        break;
      case 'sleep-off':
        eng.setSleep(0);
        break;
      case 'orbit': {
        const o = eng.selected ?? eng.objs()[0];
        if (o) eng.setOrbit(o, Number(el.dataset.rpm));
        this.toast(Number(el.dataset.rpm) ? 'ñü.orbit on the selected sound.' : 'Orbit stopped.');
        break;
      }
      case 'orbit-all': {
        const rpm = Number(el.dataset.rpm);
        for (const o of eng.objs()) if (o.kind !== 'direct' && !o.gone) eng.setOrbit(o, rpm);
        this.toast('Every sound drifts.');
        break;
      }
      case 'scene-save':
        await this.saveScene();
        break;
      case 'scene-apply':
        await this.applySceneId(id || el.dataset.id || '');
        break;
      case 'scene-share':
        await this.shareScene(id || el.dataset.id || '');
        break;
      case 'share':
        await this.shareSong(id || el.dataset.id || '');
        break;
      case 'scene-import':
        await this.importScene();
        break;
      case 'scene-delete':
        await store.scenes.remove(id);
        this.scenes = this.scenes.filter((s) => s.id !== id);
        this.toast('Scene deleted.');
        await this.render();
        break;
      case 'ink-seal':
        await this.sealInk(true);
        break;
      case 'ink-delete':
        await store.inks.remove(id);
        await this.render();
        break;
      case 'ink-clear':
        if (confirm('Clear every ñü.ink glyph on this device?')) {
          await store.inks.clear();
          await this.render();
        }
        break;
      case 'install':
        if (this.installEvt) {
          await this.installEvt.prompt();
          this.installEvt = null;
          this.paintInstall();
        }
        break;
      case 'install-dismiss':
        void store.settings.set('installDismissed', Date.now());
        this.paintInstall(true);
        break;
    }
  }

  private async onInput(el: HTMLInputElement) {
    const eng = this.engine;
    const v = Number(el.value);
    if (el.matches('[data-fx]')) {
      eng.setFx({ [el.dataset.fx!]: v });
      this.paintFx();
      this.save();
    } else if (el.matches('[data-tone]')) {
      eng.setTone({ [el.dataset.tone!]: v });
      this.paintTone();
      this.save();
    } else if (el.matches('[data-volume]')) {
      eng.setVolume(v / 100);
      this.save();
    } else if (el.matches('[data-crossfade]')) {
      eng.setCrossfade(v);
      const out = this.q('[data-crossfade-out]');
      if (out) out.textContent = v ? `${v.toFixed(0)} s` : 'off';
      this.save();
    } else if (el.matches('[data-width]')) {
      eng.setWidth(v / 100);
      const out = this.q('[data-width-out]');
      if (out) out.textContent = `${v}%`;
    } else if (el.matches('[data-seek]')) {
      const cur = this.q('[data-cur]');
      if (cur) cur.textContent = mmss(v);
    }
  }

  private playIds(ids: string[], start: number, autoplay = true) {
    const tracks = this.tracksOf(ids);
    if (!tracks.length) return;
    const eng = this.engine;
    const journey = COLLECTIONS.find((c) => c.journey && c.tracks.length === ids.length && c.tracks.every((t, i) => t === ids[i]));
    if (journey) {
      eng.setRepeat('all');
      eng.setCrossfade(Math.max(eng.crossfade, eng.tone.cross));
    }
    void this.sealInk();
    const t = tracks[Math.max(0, Math.min(start, tracks.length - 1))];
    if (t) {
      eng.prefetch(t);
      this.ink.begin(t.id, t.title);
      this.inkTrack = t.id;
    }
    // Load deck + bubble on select; play only when asked (autoplay still loads first).
    void eng.setQueue(tracks, start, autoplay).then(() => {
      this.bubble.sync();
      this.paintNow();
    });
    this.openNow(true);
  }

  private async saveScene() {
    const eng = this.engine;
    const t = eng.track;
    if (!t) return this.toast('Play something first.');
    const name = prompt('Scene name', `${t.title} · ${eng.venue.label}`) || '';
    if (!name.trim()) return;
    const s = captureScene(t.id, name, eng.venue.id, eng.fx, eng.mode, eng.objs());
    await store.scenes.put(s);
    this.scenes = [s, ...this.scenes.filter((x) => x.id !== s.id)];
    this.toast(`Saved “${s.name}”.`);
    this.paintScenes();
  }

  private async applySceneId(id: string) {
    const s = this.scenes.find((x) => x.id === id) || (await store.scenes.get(id));
    if (!s) return;
    if (s.trackId && this.engine.track && s.trackId !== this.engine.track.id) {
      const tr = this.light(s.trackId);
      if (tr) {
        this.engine.enqueue([tr], true);
        await this.engine.next();
      }
    }
    this.engine.applyScene(s);
    this.toast(`Recalled “${s.name}”.`);
    this.openNow(true);
  }

  private shareOrigin(): string {
    if (location.hostname === 'waves.khensu.nu') return `${location.origin}/`;
    const p = location.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '');
    return `${location.origin}${p || ''}/`;
  }

  private async shareSong(id: string) {
    const tid = id || this.engine.track?.id || 'first-attempt';
    const song = this.light(tid);
    this.closeMenu();
    if (!song) return this.toast('Play a song first.');
    if (song.local || !isCatalogueTrack(song.id)) {
      return this.toast('Local files stay on this device and are never uploaded.');
    }
    const url = songUrl(this.shareOrigin(), song.id);
    const title = `${song.title}${song.artistName ? ` · ${song.artistName}` : ''} — ñü.ŵævẽš`;
    const text = `Listen to ${song.title}${song.artistName ? ` by ${song.artistName}` : ''} on ñü.ŵævẽš`;
    let copied = false;
    try {
      await navigator.clipboard?.writeText(url);
      copied = true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        copied = document.execCommand('copy');
        ta.remove();
      } catch {
        /* fallback below */
      }
    }
    this.toast(`Song link copied: ${song.title}`);
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        this.toast(`Shared “${song.title}”.`);
        return;
      }
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return;
    }
    if (!copied) {
      try {
        prompt(`Share link for ${song.title}`, url);
      } catch {
        /* ignore in headless */
      }
    }
  }

  private async shareScene(id: string) {
    const eng = this.engine;
    let s = id ? this.scenes.find((x) => x.id === id) || (await store.scenes.get(id)) : null;
    if (!s && eng.track) s = captureScene(eng.track.id, eng.track.title, eng.venue.id, eng.fx, eng.mode, eng.objs());
    if (!s) return this.toast('Play something first.');
    const code = encodeShare(s);
    const origin = this.shareOrigin();
    const url = listenUrl(origin, s, code);
    const song = isCatalogueTrack(s.trackId) ? this.light(s.trackId) : undefined;
    const title = song ? `${song.title} · nu.waves` : `${s.name} · nu.waves`;
    const text = song
      ? `Listen to ${song.title} in this room, with these settings.`
      : 'A nu.waves scene. Open it and play the same song — the sounds sit where they were.';
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        this.toast('Shared the listen.');
        return;
      }
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      this.toast(song ? 'Link copied — the song and these settings.' : 'Link copied. They still need the same file on their device.');
    } catch {
      prompt('Copy this listen', url);
    }
  }

  private async importScene() {
    const pasted = prompt('Paste a nu.waves listen link or a ñü.scene code');
    if (!pasted) return;
    const raw = pasted.trim();
    let fromUrl: string | null = null;
    try {
      const u = raw.includes('://') || raw.startsWith('#') ? new URL(raw, 'https://waves.khensu.nu/') : null;
      const h = u?.hash ?? '';
      fromUrl = h.includes('?') ? new URLSearchParams(h.slice(h.indexOf('?') + 1)).get('scene') : null;
    } catch {
      fromUrl = null;
    }
    const s = decodeShare(fromUrl || raw);
    if (!s) return this.toast('That listen could not be read.');
    await store.scenes.put(s);
    this.scenes = [s, ...this.scenes.filter((x) => x.id !== s.id)];
    if (s.trackId && this.light(s.trackId) && this.engine.track?.id !== s.trackId) {
      await this.engine.setQueue(this.tracksOf([s.trackId]), 0, false);
    }
    this.engine.applyScene(s);
    this.toast(`“${s.name}” is on ${this.engine.track?.title ?? 'the stage'}. Press play.`);
    this.paintScenes();
    this.openNow(true);
  }

  /** Opens a shared song (`#/t/{id}`) or shared scene (`#/t/{id}?scene=`) or returns false when the hash is not one. */
  private async openShare(): Promise<boolean> {
    const r = parseRoute();
    const q = new URLSearchParams(location.hash.includes('?') ? location.hash.slice(location.hash.indexOf('?') + 1) : '');
    const code = q.get('scene');
    const scene = code ? decodeShare(code) : null;
    const trackId = (r.name === 't' && r.id) || q.get('t') || scene?.trackId || '';
    if (!trackId && !scene) return false;
    if (trackId && this.light(trackId)) {
      if (this.engine.track?.id !== trackId) {
        const cat = trackOf(trackId);
        const alb = cat?.albumId ? albumOf(cat.albumId) : undefined;
        const pool = alb?.tracks?.length ? alb.tracks : TRACKS.map((x) => x.id);
        const ordered = [trackId, ...pool.filter((x) => x !== trackId)];
        await this.engine.setQueue(this.tracksOf(ordered), 0, false);
        this.bubble.sync();
        this.paintNow();
      }
    } else if (trackId && !this.light(trackId)) {
      this.toast('That song is not in the catalogue. Files stay on the device they were added on.');
    }
    if (scene) {
      await store.scenes.put(scene);
      this.scenes = [scene, ...this.scenes.filter((x) => x.id !== scene.id)];
      this.engine.applyScene(scene);
      this.toast(`“${scene.name}” is on ${this.engine.track?.title ?? 'the stage'}. Press play.`);
    }
    this.openNow(true);
    return true;
  }

  /** Builds the deck + spacetime bubble and buffers every stem as soon as the page opens, without autoplay. */
  private async cueDefault() {
    if (this.engine.deck) return;
    const tracks = this.tracksOf(TRACKS.map((t) => t.id));
    if (!tracks.length) return;
    this.engine.prefetch(tracks[0]);
    await this.engine.setQueue(tracks, 0, false);
    this.bubble.sync();
    this.paintNow();
  }

  /** Cues the first track of an opened album, collection or playlist onto the stage when nothing is actively playing. */
  private async cueCollection(ids?: string[]) {
    if (!ids?.length || this.engine.playing || this.engine.live) return;
    const tracks = this.tracksOf(ids);
    if (!tracks.length) return;
    this.engine.prefetch(tracks[0]);
    await this.engine.setQueue(tracks, 0, false);
    this.bubble.sync();
    this.paintNow();
  }

  private async sealInk(force = false) {
    if (!force && this.ink.points.length < 8) {
      this.ink.clear();
      return;
    }
    const ink = this.ink.seal();
    this.ink.clear();
    this.inkTrack = '';
    if (!ink) {
      if (force) this.toast('Move a sound or turn your head a little first.');
      return;
    }
    await store.inks.put(ink);
    if (force) this.toast('ñü.ink kept on this device.');
    this.paintInkLive();
  }

  private paintInkLive() {
    const el = this.now.querySelector<HTMLElement>('[data-ink-live]');
    if (!el) return;
    const d = this.ink.previewD();
    el.innerHTML = d ? inkSvg(d, 72) : '';
  }

  private bindInstall() {
    addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installEvt = e as BeforeInstallPromptEvent;
      void this.paintInstall();
    });
    void this.paintInstall();
  }

  private async paintInstall(forceHide = false) {
    const el = this.root.querySelector<HTMLElement>('[data-install]');
    if (!el) return;
    const dismissed = await store.settings.get('installDismissed', 0);
    const hide = forceHide || !this.installEvt || (dismissed && Date.now() - dismissed < 14 * 864e5);
    this.setFloat(el, !hide);
  }

  private paintOffline() {
    const el = this.root.querySelector<HTMLElement>('[data-offline]');
    if (el) el.hidden = navigator.onLine;
  }

  private async refreshWake() {
    try {
      if (this.engine.playing && document.visibilityState === 'visible') {
        if (!this.wake && 'wakeLock' in navigator) this.wake = await navigator.wakeLock.request('screen');
      } else {
        await this.wake?.release();
        this.wake = null;
      }
    } catch {
      this.wake = null;
    }
  }

  private paintScenes() {
    const list = this.now.querySelector<HTMLElement>('[data-scene-list]');
    if (!list) return;
    const tid = this.engine.track?.id;
    const rows = this.scenes.filter((s) => !s.trackId || s.trackId === tid).slice(0, 8);
    list.innerHTML = rows.length
      ? rows
          .map(
            (s) => `<button type="button" class="wv-chip" data-act="scene-apply" data-id="${esc(s.id)}">${esc(s.name)}</button>`,
          )
          .join('')
      : '<span class="wv-lib-note">No scenes for this track yet.</span>';
  }

  private async tune(id: string) {
    const ch = CHANNELS.find((c) => c.id === id);
    if (!ch) return;
    if (ch.kind !== 'live' || !ch.programme) {
      const ids = (ch.releases ?? []).flatMap((r) => albumOf(r)?.tracks ?? []);
      if (ids.length) this.playIds(ids, 0);
      return;
    }
    await this.engine.tune(ch, (tid) => this.light(tid));
    this.openNow(true);
  }

  private async like(id: string) {
    if (!id) return;
    const on = !this.liked.has(id);
    await store.likes.set(id, on);
    if (on) this.liked.add(id);
    else this.liked.delete(id);
    this.toast(on ? 'Liked. Stays on this device.' : 'Unliked.');
    this.closeMenu();
    this.paintNow();
    if (parseRoute().sub === 'liked') await this.render();
  }

  private async keep(ids: string[]) {
    const songs = ids.map((i) => trackOf(i)).filter((t): t is Track => !!t && t.kind === 'song' && !this.kept.has(t.id));
    if (!songs.length) {
      this.toast('Already on this device.');
      return;
    }
    const prog = this.q('[data-add-progress]');
    for (const t of songs) {
      this.busy.set(t.id, 'keeping');
      try {
        await lib.keep(t, (p) => {
          const msg = `Keeping ${t.title}: ${p.done}/${p.total}`;
          this.toast(msg);
          if (prog) prog.textContent = msg;
        });
        this.kept.add(t.id);
      } catch (err) {
        this.toast(`Could not keep ${t.title}.`);
        console.error(err);
      } finally {
        this.busy.delete(t.id);
      }
    }
    this.toast(`${plural(songs.length, 'track')} kept on this device.`);
    await this.render();
  }

  private async importFiles(list: FileList) {
    const prog = this.q('[data-add-progress]');
    if (prog) prog.hidden = false;
    try {
      const added = await lib.addFiles(list, (p) => {
        if (prog) prog.textContent = p.name ? `Adding ${p.done + 1} of ${p.total}: ${p.name}` : `Added ${p.total}.`;
      });
      this.files = [...added.reverse(), ...this.files];
      this.toast(`${plural(added.length, 'file')} added. They stay on this device.`);
    } catch (err) {
      this.toast('Some files could not be added.');
      console.error(err);
    }
    await this.render();
  }

  private async importFolder() {
    const prog = this.q('[data-add-progress]');
    if (prog) prog.hidden = false;
    try {
      const added = await lib.addFolder((p) => {
        if (prog) prog.textContent = p.name ? `Reading ${p.done + 1} of ${p.total}: ${p.name}` : `Found ${p.total}.`;
      });
      this.files = [...added.reverse(), ...this.files];
      this.toast(`${plural(added.length, 'file')} from the folder. Nothing was copied.`);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') this.toast('The folder could not be read.');
    }
    await this.render();
  }

  // MARK: Menus

  private openMenu(id: string, playlist?: string) {
    const dlg = this.q('[data-menu]') as HTMLDialogElement | null;
    const t = this.light(id);
    if (!dlg || !t) return;
    this.menuFor = id;
    const cat = trackOf(id);
    const items: string[] = [];
    items.push(`<button type="button" data-act="queue-next" data-id="${esc(id)}">Play next</button>`);
    items.push(`<button type="button" data-act="queue-last" data-id="${esc(id)}">Add to queue</button>`);
    if (cat) items.push(`<button type="button" data-act="share" data-id="${esc(id)}">Share song link</button>`);
    items.push(`<button type="button" data-act="like" data-id="${esc(id)}">${this.liked.has(id) ? 'Unlike' : 'Like'}</button>`);
    items.push(`<button type="button" data-act="add-to-playlist" data-id="${esc(id)}">Add to playlist</button>`);
    if (playlist) items.push(`<button type="button" data-act="remove-from-playlist" data-id="${esc(id)}" data-playlist="${esc(playlist)}">Remove from this playlist</button>`);
    if (cat?.kind === 'song') items.push(`<button type="button" data-act="${this.kept.has(id) ? 'unkeep' : 'keep'}" data-id="${esc(id)}">${this.kept.has(id) ? 'Remove from this device' : 'Keep offline'}</button>`);
    if (cat) items.push(`<button type="button" data-act="go" data-href="#/artist/${esc(cat.artistId)}">Go to artist</button>`);
    if (cat?.albumId) items.push(`<button type="button" data-act="go" data-href="#/album/${esc(cat.albumId)}">Go to album</button>`);
    if (id.startsWith('file:')) items.push(`<button type="button" data-act="remove-file" data-id="${esc(id)}">Remove from library</button>`);
    dlg.querySelector('[data-menu-title]')!.textContent = t.title;
    dlg.querySelector('[data-menu-sub]')!.textContent = [t.artistName, t.albumTitle, t.licence].filter(Boolean).join(' · ');
    dlg.querySelector('[data-menu-items]')!.innerHTML = items.join('');
    dlg.showModal();
  }
  private closeMenu() {
    (this.q('[data-menu]') as HTMLDialogElement | null)?.close();
    this.menuFor = null;
  }
  private pickPlaylist(trackId: string) {
    const dlg = this.q('[data-pick]') as HTMLDialogElement | null;
    if (!dlg) return;
    dlg.querySelector('[data-pick-items]')!.innerHTML =
      this.playlists.map((p) => `<button type="button" data-act="put-in-playlist" data-playlist="${esc(p.id)}" data-track="${esc(trackId)}">${esc(p.name)} <small>${plural(p.tracks.length, 'track')}</small></button>`).join('') +
      `<button type="button" data-act="new-playlist" data-id="${esc(trackId)}">New playlist…</button>`;
    dlg.showModal();
  }

  // MARK: Now playing

  openNow(open: boolean) {
    // The player stays on the page; open scrolls it into view, close leaves it alone.
    document.body.classList.remove('wv-now-open');
    this.now.hidden = false;
    if (open) {
      this.bubble.sync();
      this.now.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private paintNow() {
    const eng = this.engine;
    const live = eng.track;
    const idle = !live;
    const t = live ?? this.light('first-attempt');
    if (!t) return;
    const bar = this.bar;
    document.body.classList.toggle('wv-has-bar', !!live);
    this.setFloat(bar, !!live);
    this.now.hidden = false;
    if (live && t.id !== this.inkTrack) {
      void this.sealInk();
      this.ink.begin(t.id, t.title);
      this.inkTrack = t.id;
    }
    const artHtml = art(t.artUrl, this.cssArt(t), '', 128);
    const byLine = eng.live ? `${eng.channel!.name} · live` : [t.artistName, t.albumTitle].filter(Boolean).join(' · ');
    const set = (sel: string, text: string, scope: HTMLElement = this.root) => {
      for (const el of scope.querySelectorAll<HTMLElement>(sel)) if (el.textContent !== text) el.textContent = text;
    };
    if (live) {
      set('[data-bar-title]', t.title);
      set('[data-bar-by]', byLine);
      const barArt = bar.querySelector<HTMLElement>('[data-bar-art]')!;
      if (barArt.dataset.for !== t.id) {
        barArt.innerHTML = artHtml;
        barArt.dataset.for = t.id;
      }
      for (const b of bar.querySelectorAll<HTMLElement>('[data-act="prev"]')) b.innerHTML = ICON.prev;
      for (const b of bar.querySelectorAll<HTMLElement>('[data-act="next"]')) b.innerHTML = ICON.next;
      bar.querySelector<HTMLElement>('[data-bar-live]')!.hidden = !eng.live;
    }
    const perSongUrl = isCatalogueTrack(t.id) ? songUrl(this.shareOrigin(), t.id) : '';
    for (const b of this.root.querySelectorAll<HTMLElement>('[data-now] [data-act="share"], [data-bar] [data-act="share"]')) {
      b.dataset.id = t.id;
      if (perSongUrl) b.dataset.url = perSongUrl;
      b.setAttribute('aria-label', `Share ${t.title}`);
      b.setAttribute('title', perSongUrl ? `Share ${t.title} (${perSongUrl})` : `Share ${t.title}`);
      if (!b.hasAttribute('data-now-share')) b.innerHTML = ICON.share;
    }
    for (const row of this.root.querySelectorAll<HTMLElement>('.wv-row[data-id]')) {
      row.classList.toggle('is-current', row.dataset.id === t.id);
    }
    for (const b of this.root.querySelectorAll<HTMLElement>('[data-act="toggle"]')) {
      b.innerHTML = eng.playing ? ICON.pause : ICON.play;
      b.setAttribute('aria-label', eng.playing ? 'Pause' : 'Play');
    }
    // The stage always shows the current (or next-up) track.
    const now = this.now;
    set('[data-now-title]', t.title, now);
    set('[data-now-by]', byLine, now);
    set('[data-now-spec]', [t.spec, t.local ? 'your file' : this.kept.has(t.id) ? 'kept on this device' : ''].filter(Boolean).join(' · '), now);
    set(
      '[data-now-from]',
      idle
        ? 'Next up'
        : eng.live
          ? `Live · ${eng.channel!.name}`
          : !eng.playing
            ? 'Ready'
            : t.albumTitle
              ? `Playing from ${t.albumTitle}`
              : t.local
                ? 'Playing from your files'
                : 'Playing',
      now,
    );
    const nowArt = now.querySelector<HTMLElement>('[data-now-art]')!;
    if (nowArt.dataset.for !== t.id) {
      nowArt.innerHTML = art(t.artUrl, this.cssArt(t), `Cover of ${t.albumTitle ?? t.title}`, 480);
      nowArt.dataset.for = t.id;
    }
    const shuffleBtn = now.querySelector<HTMLElement>('[data-act="shuffle"]');
    if (shuffleBtn) {
      shuffleBtn.innerHTML = ICON.shuffle;
      shuffleBtn.setAttribute('aria-pressed', String(eng.shuffle));
    }
    const rep = now.querySelector<HTMLElement>('[data-act="repeat"]');
    if (rep) {
      rep.innerHTML = ICON.repeat;
      rep.setAttribute('aria-pressed', String(eng.repeat !== 'off'));
      rep.setAttribute('data-state', eng.repeat);
      rep.setAttribute('aria-label', eng.repeat === 'one' ? 'Repeat one' : eng.repeat === 'all' ? 'Repeat all' : 'Repeat off');
    }
    const prevBtn = now.querySelector<HTMLElement>('[data-act="prev"]');
    const nextBtn = now.querySelector<HTMLElement>('[data-act="next"]');
    if (prevBtn) prevBtn.innerHTML = ICON.prev;
    if (nextBtn) nextBtn.innerHTML = ICON.next;
    for (const b of now.querySelectorAll<HTMLButtonElement>('[data-act="prev"],[data-act="next"],[data-act="shuffle"],[data-act="repeat"]')) b.disabled = eng.live;
    (now.querySelector('[data-seek]') as HTMLInputElement).disabled = eng.live || eng.endless;
    const likeBtn = now.querySelector<HTMLElement>('[data-act="like"]');
    if (likeBtn) {
      likeBtn.innerHTML = ICON.heart;
      likeBtn.setAttribute('aria-pressed', String(this.liked.has(t.id)));
    }
    const shareBtn = now.querySelector<HTMLElement>('[data-act="share"]');
    if (shareBtn) shareBtn.innerHTML = ICON.share;
    const keepBtn = now.querySelector<HTMLButtonElement>('[data-act="keep-current"]');
    if (keepBtn) {
      const can = t.kind === 'song' && !t.local;
      keepBtn.hidden = !can;
      keepBtn.setAttribute('aria-pressed', String(this.kept.has(t.id)));
      keepBtn.querySelector('span')!.textContent = this.kept.has(t.id) ? 'Kept' : 'Keep';
    }
    now.querySelector<HTMLElement>('[data-leave]')!.hidden = !eng.live;
    now.classList.toggle('is-live', eng.live);
    // Modes.
    const modes = now.querySelector<HTMLElement>('[data-modes]')!;
    modes.hidden = t.kind !== 'song';
    for (const b of modes.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
      b.setAttribute('aria-pressed', String(b.dataset.mode === eng.mode));
      if (b.dataset.mode === 'bed') {
        b.hidden = !eng.hasBed;
        if (eng.hasBed && t.bed) b.textContent = t.bed.label;
      }
    }
    now.dataset.mode = t.kind === 'song' ? eng.mode : 'waves';
    for (const b of now.querySelectorAll<HTMLButtonElement>('[data-venue]')) {
      const on = b.dataset.venue === eng.venue.id;
      b.setAttribute('aria-checked', String(on));
      b.setAttribute('aria-pressed', String(on));
    }
    const venueLabel = now.querySelector<HTMLElement>('[data-venue-label]');
    if (venueLabel) venueLabel.textContent = eng.venue.label;
    set('[data-picked]', eng.venue.why, now);
    this.paintFx();
    this.paintTone();
    this.paintShape();
    this.paintQueue();
    this.paintHead();
    this.paintScenes();
    const err = now.querySelector<HTMLElement>('[data-now-error]')!;
    err.hidden = !eng.error;
    err.textContent = eng.error ?? '';
    const sleep = now.querySelector<HTMLSelectElement>('[data-sleep]');
    if (sleep && !eng.sleepAt) sleep.value = '0';
    const orbitBox = now.querySelector<HTMLElement>('[data-orbit-box]');
    if (orbitBox) orbitBox.hidden = eng.mode === 'orig' || (t.kind === 'generator' && t.spatial === 'direct');
  }

  private paintTime() {
    const eng = this.engine;
    const t = eng.track;
    if (!t) return;
    const pos = eng.position();
    const dur = eng.duration();
    const endless = eng.endless;
    const shown = endless ? pos % Math.max(1, t.dur) : Math.min(pos, dur);
    const seek = this.q('[data-seek]') as HTMLInputElement | null;
    if (seek && !this.seeking) {
      seek.max = String(Math.max(1, dur));
      seek.value = String(shown);
      seek.style.setProperty('--p', `${dur ? (shown / dur) * 100 : 0}%`);
    }
    const cur = this.q('[data-cur]');
    const durEl = this.q('[data-dur]');
    if (cur) cur.textContent = mmss(shown);
    if (durEl) durEl.textContent = endless ? 'loops' : eng.live ? `live · ${mmss(Math.max(0, dur - shown))} left` : mmss(dur);
    const prog = this.bar.querySelector<HTMLElement>('[data-bar-prog]');
    if (prog) prog.style.width = `${dur && !endless ? (shown / dur) * 100 : 0}%`;
    if (!this.now.hidden) {
      const q = this.now.querySelector<HTMLElement>('[data-queue-list]');
      if (q && q.dataset.index !== String(eng.index)) this.paintQueue();
    }
  }

  private paintFx() {
    const eng = this.engine;
    for (const [k, v] of Object.entries(eng.fx)) {
      const input = this.now.querySelector<HTMLInputElement>(`[data-fx="${k}"]`);
      if (input && document.activeElement !== input) input.value = String(v);
      const out = this.now.querySelector<HTMLElement>(`[data-fx-out="${k}"]`);
      if (out) out.textContent = k === 'gain' ? `${v > 0 ? '+' : ''}${v} dB` : k === 'wet' ? `${v}%` : k === 'rt' ? `${Number(v).toFixed(1)} s` : k === 'pre' ? `${v} ms` : String(v);
    }
    for (const b of this.now.querySelectorAll<HTMLButtonElement>('[data-preset]')) b.setAttribute('aria-pressed', String(b.dataset.preset === eng.preset));
    const vol = this.now.querySelector<HTMLInputElement>('[data-volume]');
    if (vol && document.activeElement !== vol) vol.value = String(Math.round(eng.volume * 100));
    const xf = this.now.querySelector<HTMLInputElement>('[data-crossfade]');
    if (xf && document.activeElement !== xf) xf.value = String(eng.crossfade);
    const xfo = this.q('[data-crossfade-out]');
    if (xfo) xfo.textContent = eng.crossfade ? `${eng.crossfade.toFixed(0)} s` : 'off';
  }

  private paintTone() {
    const eng = this.engine;
    const box = this.now.querySelector<HTMLElement>('[data-tone-box]');
    if (!box) return;
    box.hidden = eng.track?.gen?.type !== 'tone';
    for (const k of ['hold', 'fade', 'cross'] as const) {
      const input = box.querySelector<HTMLInputElement>(`[data-tone="${k}"]`);
      if (input && document.activeElement !== input) input.value = String(eng.tone[k]);
      const out = box.querySelector<HTMLElement>(`[data-tone-out="${k}"]`);
      if (out) out.textContent = `${eng.tone[k].toFixed(1)} s`;
    }
  }

  private paintShape() {
    const eng = this.engine;
    const objs = eng.objs();
    const width = this.now.querySelector<HTMLElement>('[data-width-box]');
    if (width) width.hidden = !objs.some((o) => o.kind === 'left');
    const restore = this.now.querySelector<HTMLButtonElement>('[data-act="restore"]');
    if (restore) restore.hidden = !eng.hasGone();
    const count = this.now.querySelector<HTMLElement>('[data-obj-count]');
    if (count) count.textContent = objs.length ? `${plural(objs.length, 'sound')} in the bubble` : '';
  }

  private paintHead() {
    const box = this.now.querySelector<HTMLElement>('[data-head-box]');
    if (!box) return;
    const src = this.head.source;
    for (const b of box.querySelectorAll<HTMLButtonElement>('[data-src]')) {
      b.setAttribute('aria-pressed', String(b.dataset.src === src));
      const s = b.dataset.src as HeadSource;
      b.hidden = (s === 'device' && !hasDeviceMotion()) || (s === 'camera' && !hasCamera()) || (s === 'airpods' && !hasNative());
    }
    const status = box.querySelector<HTMLElement>('[data-head-status]')!;
    status.textContent = src === 'off' ? (hasNative() ? 'Off. Your AirPods, the camera or the phone can steer the sound.' : hasDeviceMotion() ? 'Off. Turn it on and the phone steers the sound as you turn.' : hasCamera() ? 'Off. The camera can follow your face, on this device only.' : 'Off. In the nu.waves app, AirPods steer the sound.') : this.head.status;
    box.querySelector<HTMLButtonElement>('[data-act="recentre"]')!.hidden = src === 'off';
  }

  private paintQueue() {
    const eng = this.engine;
    const list = this.now.querySelector<HTMLElement>('[data-queue-list]');
    if (!list) return;
    list.dataset.index = String(eng.index);
    if (eng.live) {
      const next = upcoming(eng.channel!, 6).map(({ item, at }) => {
        const tr = trackOf(item.trackId);
        return `<li><span class="wv-q-text"><b>${esc(tr?.title ?? '')}</b><small>${esc(tr ? (artistOf(tr.artistId)?.name ?? '') : '')} · ${new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></span></li>`;
      });
      list.innerHTML = next.join('') || '<li class="wv-empty">Nothing scheduled.</li>';
      return;
    }
    list.innerHTML =
      eng.queue
        .map(
          (t, i) => `<li class="${i === eng.index ? 'is-current' : ''}">
  <button type="button" class="wv-q-jump" data-act="queue-jump" data-i="${i}">${art(t.artUrl, this.cssArt(t), '', 64)}<span class="wv-q-text"><b>${esc(t.title)}</b><small>${esc(t.artistName ?? '')}</small></span></button>
  <span class="wv-row-dur">${t.loop ? '∞' : t.dur ? mmss(t.dur) : ''}</span>
  ${i !== eng.index ? `<span class="wv-q-move"><button type="button" data-act="queue-up" data-i="${i}" aria-label="Move up">↑</button><button type="button" data-act="queue-down" data-i="${i}" aria-label="Move down">↓</button><button type="button" class="wv-row-more" data-act="queue-remove" data-i="${i}" aria-label="Remove ${esc(t.title)} from the queue">×</button></span>` : ''}
</li>`,
        )
        .join('') || '<li class="wv-empty">The queue is empty.</li>';
  }
}
