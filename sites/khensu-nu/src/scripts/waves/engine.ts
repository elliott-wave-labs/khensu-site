// The nu.waves engine: a queue of tracks, each rendered as sounds you can move. A song with separated instruments
// plays every instrument through its own HRTF panner; a stereo file plays as two sounds, left and right, that you
// can pull apart or swing around you; healing sounds are generated live. Everything meets in one room (reverb,
// echo, your gain: nu.eq), under one limiter, and the listener turns with your head. Nothing leaves the device.

import { VENUES, type Pos, type Stem, type Track, type Venue, type Channel } from '../../data/waves';
import { createVoice, clipBuffer, impulse, type Voice } from './gen';
import { listenerVectors, type Pose } from './head';
import { onAir } from './channels';
import type { Scene } from './scene';

/** Every iPhone and iPad browser is WebKit, which freezes an AudioContext's own output mid-buffer when the app goes
 *  to the background (a buzz) but treats an <audio> element as music it may keep playing. There the mix goes
 *  through a stream into one element. `?out=element` or `?out=device` forces either path for testing. */
const OUT_VIA_ELEMENT = (() => {
  if (typeof navigator === 'undefined') return false;
  const forced = new URLSearchParams(location.search).get('out');
  if (forced) return forced === 'element';
  return /iP(hone|ad|od)/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
})();

export type Mode = 'orig' | 'bed' | 'waves';
export type Repeat = 'off' | 'all' | 'one';
export type Fx = { gain: number; wet: number; rt: number; pre: number; bounces: number };
export const PRESETS: Record<string, Fx> = {
  original: { gain: 0, wet: 45, rt: 1.8, pre: 25, bounces: 0 },
  clean: { gain: 0, wet: 0, rt: 1.8, pre: 0, bounces: 0 },
};
export const venueFx = (v: Venue): Pick<Fx, 'wet' | 'rt' | 'pre'> => ({ wet: Math.round((v.wet / 0.8) * 100), rt: v.rt, pre: Math.round(v.pre * 1000) });

/** A track the engine can play: a catalogue track, or one of your files or downloads wrapped to look like one. */
export type PlayTrack = Track & {
  artistName?: string;
  albumTitle?: string;
  artUrl?: string;
  local?: boolean;
  /** Object URLs to revoke when the deck goes. */
  revoke?: string[];
};

export type ObjKind = 'stem' | 'left' | 'right' | 'mono' | 'direct';
/** nu.orbit: a sound walks a horizontal ellipse around a centre without re-encoding the audio. */
export type ObjOrbit = { rate: number; radius: number; phase: number; center: Pos };
export type Obj = {
  key: string;
  kind: ObjKind;
  stem?: string;
  /** Where this node came from when it was added from another song or bubble (nu.waves stem adding).
   *  `srcStem` is a stem id, `mix` for a whole song as one node, or absent for a generated tone. */
  srcTrack?: string;
  srcStem?: string;
  label: string;
  pos: Pos;
  mark: string;
  clone: boolean;
  gone?: boolean;
  level: number;
  /** Radians per second around `center` on a circle of `radius` metres (nu.orbit). */
  orbit?: ObjOrbit | null;
  el?: HTMLAudioElement;
  voice?: Voice;
  panner?: PannerNode;
  fade?: GainNode;
  meter?: AnalyserNode;
  tap?: GainNode;
};

const MAX_R = 4;
const MAX_CLONES = 12;
const FADE_S = 2;
const ECHO_TAPS = 8;
/** How long a looping sound (rain, noise) plays inside a mixed queue before the next track. */
const SLOT_S = 180;
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
const meterBuf = new Float32Array(2048);

const isMobileAudio = () =>
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod|Android|Mobi/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
    (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches));

const clampPos = (p: Pos) => {
  const d = Math.hypot(p.x, p.y, p.z);
  if (d > MAX_R) {
    p.x *= MAX_R / d;
    p.y *= MAX_R / d;
    p.z *= MAX_R / d;
  }
  return p;
};

/** The listener stays inside the bubble, a little short of the shell where sounds can sit. */
const clampListener = (p: Pos) => {
  const max = MAX_R * 0.8;
  const d = Math.hypot(p.x, p.y, p.z);
  if (d > max) {
    p.x *= max / d;
    p.y *= max / d;
    p.z *= max / d;
  }
  return p;
};

const pick = (el: HTMLAudioElement, srcs: { url: string; type: string }[] = []) => {
  for (const s of srcs) if (!s.type || el.canPlayType(s.type)) return s.url;
  return srcs[0]?.url ?? '';
};

const level = (a: AnalyserNode) => {
  const n = a.fftSize;
  a.getFloatTimeDomainData(meterBuf);
  let s = 0;
  for (let i = 0; i < n; i++) s += meterBuf[i] * meterBuf[i];
  return s / n;
};

type Listener = () => void;

/** One playing track and its sounds. Two decks overlap during a crossfade. */
class Deck {
  objs: Obj[] = [];
  master?: HTMLAudioElement; // the clock for songs: the original, or the one stereo file
  bed?: HTMLAudioElement;
  origGain?: GainNode;
  bedGain?: GainNode;
  spatial?: GainNode;
  fade?: GainNode;
  origMeter?: AnalyserNode;
  startedAt = 0; // ctx time when a generator started
  genOffset = 0; // seconds into a generator at startedAt
  playing = false;
  ended = false;
  disposed = false;
  wired = false;
  serial = 0;
  splits = new Map<HTMLAudioElement, ChannelSplitterNode>();
  ctx: AudioContext | null = null;
  constructor(
    public track: PlayTrack,
    ctx: AudioContext | null = null,
  ) {
    this.ctx = ctx;
  }

  get isSong() {
    return this.track.kind === 'song';
  }
  position(): number {
    if (this.master) {
      if (!this.master.paused && this.master.currentTime > 0) return this.master.currentTime;
      for (const o of this.objs) if (o.el && !o.gone && !o.el.paused && o.el.currentTime > 0) return o.el.currentTime;
      return this.master.currentTime || 0;
    }
    if (!this.playing || !this.ctx) return this.genOffset;
    return this.genOffset + (this.ctx.currentTime - this.startedAt);
  }
  duration(): number {
    if (this.master && Number.isFinite(this.master.duration) && this.master.duration > 0) return this.master.duration;
    for (const o of this.objs) if (o.el && Number.isFinite(o.el.duration) && o.el.duration > 0) return o.el.duration;
    const v = this.objs.find((o) => o.voice)?.voice;
    if (v?.length && !this.track.loop) return v.length;
    return this.track.dur;
  }
  els(): HTMLAudioElement[] {
    const set = new Set<HTMLAudioElement>();
    if (this.master) set.add(this.master);
    if (this.bed) set.add(this.bed);
    for (const o of this.objs) if (o.el && !o.gone) set.add(o.el);
    return [...set];
  }
  /** Active elements that should be started when play() is pressed (skips the 10 MB untouched original when in nu.waves stem mode). */
  playEls(mode: Mode): HTMLAudioElement[] {
    const set = new Set<HTMLAudioElement>();
    const stemsMode = this.track.spatial === 'stems' && this.objs.some((o) => o.kind === 'stem' && o.el);
    if (this.master && (!stemsMode || mode === 'orig')) set.add(this.master);
    if (this.bed && mode === 'bed') set.add(this.bed);
    for (const o of this.objs) if (o.el && !o.gone && (mode === 'waves' || !stemsMode)) set.add(o.el);
    return [...set];
  }
}

export class Engine {
  ctx: AudioContext | null = null;
  queue: PlayTrack[] = [];
  index = -1;
  repeat: Repeat = 'off';
  shuffle = false;
  volume = 1;
  crossfade = 0;
  mode: Mode = 'waves';
  venue: Venue = VENUES[2];
  fx: Fx = { gain: 0, bounces: 0, ...venueFx(VENUES[2]) };
  preset: string | null = null;
  channel: Channel | null = null;
  private channelSlot = 0;
  sleepAt = 0;
  /** When set, sleep collapses the room (nu.dim) over this many ms before pausing. */
  private dimUntil = 0;
  private dimFrom: { wet: number; volume: number; positions: Map<Obj, Pos> } | null = null;
  tone = { hold: 8, fade: 4, cross: 2 };
  pose: Pose = { yaw: 0, pitch: 0, roll: 0, pos: { x: 0, y: 0, z: 0 } };
  /** ñü.mobility (Immersive Mobility), on by default: the listener is locked inside the bubble, so
   *  head turns and xyz movement move the listener through sounds that stay where they are in the
   *  bubble. Off: every sensor is ignored and the sounds stay fixed in the ears (head-locked). */
  mobility = true;
  /** The listener's place in the bubble, metres: x right, y ahead, z up. Clamped inside the bubble.
   *  Sensor place (camera / AirPods) plus wherever you have walked with the keys, combined. */
  listenerPos: Pos = { x: 0, y: 0, z: 0 };
  private sensorPos: Pos = { x: 0, y: 0, z: 0 };
  private walkedPos: Pos = { x: 0, y: 0, z: 0 };
  private syncListener() {
    this.listenerPos = clampListener({
      x: this.sensorPos.x + this.walkedPos.x,
      y: this.sensorPos.y + this.walkedPos.y,
      z: this.sensorPos.z + this.walkedPos.z,
    });
    this.pose = { ...this.pose, pos: { ...this.listenerPos } };
  }
  selected: Obj | null = null;
  deck: Deck | null = null;
  error: string | null = null;
  private listeners = new Set<Listener>();
  private tickers = new Set<Listener>();
  private bus!: GainNode;
  private flat!: GainNode;
  private direct!: GainNode;
  private dry!: GainNode;
  private wet!: GainNode;
  private verb!: ConvolverNode;
  private preDelay!: DelayNode;
  private echoIn!: GainNode;
  private echoDelays: DelayNode[] = [];
  private echoGains: GainNode[] = [];
  private sum!: GainNode;
  private makeup!: GainNode;
  private user!: GainNode;
  private limiter!: DynamicsCompressorNode;
  private sumMeter!: AnalyserNode;
  private origPow = 0;
  private wavePow = 0;
  private builtRt = 0;
  private rtTimer = 0;
  private lastSync = 0;
  private lastSession = 0;
  private channelTimer = 0;
  private history: ((t: PlayTrack, dur: number) => void) | null = null;
  /** Opens a queued track's files right before it plays (sealed copies, your files, the phone's library). */
  loader: ((t: PlayTrack) => Promise<PlayTrack | undefined>) | null = null;
  /** Synchronous fast-path for catalogue tracks & generators so mobile play() runs inside the user tap gesture. */
  syncLoader: ((t: PlayTrack) => PlayTrack | undefined) | null = null;
  private advancing = false;
  private startSerial = 0;
  // Media elements and their source nodes live for the whole session: a source node binds to an element for good,
  // and on iPhone an element that has played once in a tap may play again without one.
  private sources = new Map<HTMLAudioElement, MediaElementAudioSourceNode>();
  private free: HTMLAudioElement[] = [];
  private unlocked = false;
  /** True when page-load autoplay was deferred by browser autoplay policy and should start on the first gesture. */
  pendingAutoplay = false;
  /** Timestamp when pendingAutoplay was fulfilled by a gesture so a same-tap toggle doesn't immediately pause. */
  autoStartedAt = 0;

  on(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  onTick(l: Listener) {
    this.tickers.add(l);
    return () => this.tickers.delete(l);
  }
  onPlayed(cb: (t: PlayTrack, dur: number) => void) {
    this.history = cb;
  }
  private emit() {
    for (const l of this.listeners) l();
  }

  get track(): PlayTrack | null {
    return this.deck?.track ?? this.queue[this.index] ?? null;
  }
  get playing() {
    return !!this.deck?.playing;
  }
  get live() {
    return !!this.channel;
  }
  /** True when the queue mixes several tracks, so looping sounds take a slot instead of playing for ever. */
  get mixed() {
    return this.queue.length > 1 && !this.channel;
  }
  position() {
    return this.deck?.position() ?? 0;
  }
  /** Seconds the current track plays before the next one; a looping sound alone reports its loop length. */
  duration() {
    const d = this.deck;
    if (!d) return this.track?.dur ?? 0;
    if (this.channel) return this.channelSlot || d.duration();
    if (!d.isSong && d.track.loop) return this.mixed ? SLOT_S : d.track.dur;
    return d.duration();
  }
  get endless() {
    return !!this.deck && !this.deck.isSong && !!this.deck.track.loop && !this.mixed && !this.channel;
  }
  objs(): Obj[] {
    return this.deck?.objs.filter((o) => !o.gone) ?? [];
  }
  hasGone() {
    return !!this.deck?.objs.some((o) => o.gone);
  }

  // MARK: Graph

  private graph(): AudioContext {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = (this.ctx = new Ctor({ latencyHint: 'playback' }));
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.55;
    this.flat = ctx.createGain();
    this.direct = ctx.createGain();
    this.direct.gain.value = 0.9;
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    this.verb = ctx.createConvolver();
    this.preDelay = ctx.createDelay(0.5);
    this.echoIn = ctx.createGain();
    this.sum = ctx.createGain();
    this.makeup = ctx.createGain();
    this.user = ctx.createGain();
    this.user.gain.value = this.volume;
    this.sumMeter = ctx.createAnalyser();
    this.sumMeter.fftSize = 2048;
    const lim = (this.limiter = ctx.createDynamicsCompressor());
    lim.threshold.value = -3;
    lim.knee.value = 6;
    lim.ratio.value = 12;
    lim.attack.value = 0.002;
    lim.release.value = 0.08;
    for (let i = 0; i < ECHO_TAPS; i++) {
      const d = ctx.createDelay(4);
      const g = ctx.createGain();
      g.gain.value = 0;
      this.echoIn.connect(d).connect(g).connect(this.sum);
      this.echoDelays.push(d);
      this.echoGains.push(g);
    }
    // Sounds → room (dry, pre-delay → reverb, echoes) → loudness match → nu.eq gain → limiter → out.
    this.bus.connect(this.dry).connect(this.sum);
    this.bus.connect(this.preDelay).connect(this.verb).connect(this.wet).connect(this.sum);
    this.bus.connect(this.echoIn);
    this.sum.connect(this.sumMeter);
    this.sum.connect(this.makeup).connect(this.user);
    // The untouched original and fixed beds skip the room; binaural beats skip the panners too.
    this.flat.connect(this.user);
    this.direct.connect(this.user);
    this.user.connect(lim);
    try {
      // Safari 16.4+: music, not a game sound, so it ignores the silent switch and may go on in the background.
      (navigator as Navigator & { audioSession?: { type: string } }).audioSession!.type = 'playback';
    } catch {
      /* no Audio Session API */
    }
    this.connectOut();
    ctx.onstatechange = () => {
      // iOS interrupts the context (backgrounded, a call, Siri): show it as paused so play resumes cleanly.
      if (ctx.state !== 'running' && ctx.state !== 'closed' && this.playing && (document.hidden || (ctx.state as string) === 'interrupted')) this.pause();
    };
    this.room();
    this.applyPose();
    return ctx;
  }

  // MARK: Output

  /** On iPhone and iPad the mix plays through one <audio> element fed by a stream (`OUT_VIA_ELEMENT`). */
  private out: HTMLAudioElement | null = null;
  private outStream: MediaStreamAudioDestinationNode | null = null;
  private pausingOut = false;

  private connectOut() {
    const ctx = this.ctx!;
    if (!OUT_VIA_ELEMENT) {
      this.limiter.connect(ctx.destination);
      return;
    }
    const dest = (this.outStream = ctx.createMediaStreamDestination());
    this.limiter.connect(dest);
    const el = (this.out = document.createElement('audio'));
    el.setAttribute('playsinline', '');
    el.srcObject = dest.stream;
    // The system paused it (backgrounded, locked, another app's audio): pause the player too.
    el.addEventListener('pause', () => {
      if (this.out === el && !this.pausingOut && this.playing) this.pause();
    });
  }

  /** Starts the output element; call inside a tap or a Media Session action. Falls back to the context's own
   *  output if the element can't play or its clock doesn't move. */
  private startOut() {
    const el = this.out;
    if (!el || !el.paused) return;
    el.play().then(
      () => {
        const t0 = el.currentTime;
        window.setTimeout(() => {
          if (this.out === el && !el.paused && el.currentTime === t0) this.outToDevice();
        }, 1500);
      },
      (err: DOMException) => {
        // Blocked until a tap: the next gesture starts it. Anything else: play through the context.
        if (this.out === el && err?.name !== 'AbortError' && err?.name !== 'NotAllowedError') this.outToDevice();
      },
    );
  }

  private pauseOut() {
    const el = this.out;
    if (!el || el.paused) return;
    this.pausingOut = true;
    el.pause();
    this.pausingOut = false;
  }

  private outToDevice() {
    if (!this.ctx || !this.out) return;
    try {
      if (this.outStream) this.limiter.disconnect(this.outStream);
    } catch {
      /* ignore */
    }
    this.out.srcObject = null;
    this.out = null;
    this.outStream = null;
    this.limiter.connect(this.ctx.destination);
  }

  /** Creates a live MediaStream tap of the master spatial output for recording 9:16 Instagram Story / Reel clips. */
  createAudioStream(): { stream: MediaStream; disconnect: () => void } | null {
    try {
      const ctx = this.graph();
      this.wakeContext(ctx, true);
      const dest = ctx.createMediaStreamDestination();
      this.limiter.connect(dest);
      return {
        stream: dest.stream,
        disconnect: () => {
          try {
            this.limiter.disconnect(dest);
          } catch {
            /* ignore */
          }
        },
      };
    } catch {
      return null;
    }
  }

  /** Wakes the AudioContext synchronously inside a user tap/click/key gesture (including iOS Safari's "interrupted" state). */
  private wakeContext(ctx: AudioContext, fromGesture = false) {
    if (ctx.state !== 'running') {
      void ctx.resume().catch(() => {});
    }
    if (fromGesture) this.startOut();
    if (fromGesture || ctx.state === 'running') {
      const wasUnlocked = this.unlocked;
      this.unlocked = true;
      if (fromGesture && (!wasUnlocked || ctx.state !== 'running')) {
        try {
          const buf = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.start(0);
        } catch {
          /* fine */
        }
      }
    }
  }

  /** Call from a user tap or key press: wakes the AudioContext synchronously. */
  unlock() {
    const ctx = this.graph();
    this.wakeContext(ctx, true);
  }

  /** If page-load autoplay was blocked by the browser until first interaction, starts playback inside the user gesture. */
  resumePendingAutoplay() {
    this.unlock();
    if (!this.pendingAutoplay) return;
    this.pendingAutoplay = false;
    if (!this.playing && (this.deck || this.queue.length)) {
      this.autoStartedAt = performance.now();
      void this.play();
    }
  }

  private element(): HTMLAudioElement {
    let el = this.free.pop();
    if (!el) {
      el = new Audio();
      el.crossOrigin = 'anonymous';
      el.preload = 'auto';
      (el as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
      el.setAttribute('playsinline', '');
      el.setAttribute('webkit-playsinline', '');
    }
    el.loop = false;
    el.playbackRate = 1;
    return el;
  }

  /** Waits until the element has buffered enough to play cleanly (or times out). */
  private ready(el: HTMLAudioElement, ms = 20_000): Promise<void> {
    if (el.error || el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        el.removeEventListener('canplaythrough', done);
        el.removeEventListener('canplay', done);
        el.removeEventListener('loadeddata', done);
        el.removeEventListener('error', done);
        window.clearTimeout(tid);
        resolve();
      };
      const tid = window.setTimeout(done, ms);
      el.addEventListener('canplaythrough', done);
      el.addEventListener('canplay', done);
      el.addEventListener('loadeddata', done);
      el.addEventListener('error', done);
    });
  }

  private async readyAll(els: HTMLAudioElement[]) {
    await Promise.all(els.map((el) => this.ready(el)));
  }
  private release(el: HTMLAudioElement) {
    el.pause();
    el.onended = null;
    el.onerror = null;
    el.removeAttribute('src');
    el.load();
    this.sources.get(el)?.disconnect();
    if (this.free.length < 12) this.free.push(el);
    else this.sources.delete(el);
  }
  private sourceOf(el: HTMLAudioElement) {
    let s = this.sources.get(el);
    if (!s) {
      s = this.ctx!.createMediaElementSource(el);
      this.sources.set(el, s);
    }
    return s;
  }
  private panner() {
    return new PannerNode(this.ctx!, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 2, maxDistance: 12, rolloffFactor: 0.45 });
  }

  // MARK: Room and nu.eq

  setFx(part: Partial<Fx>, preset: string | null = null) {
    Object.assign(this.fx, part);
    this.preset = preset;
    this.room();
    this.emit();
  }
  usePreset(name: string) {
    this.setFx(PRESETS[name], name);
  }
  setVenue(id: string) {
    const v = VENUES.find((x) => x.id === id);
    if (!v) return;
    this.venue = v;
    if (this.deck) for (const o of this.deck.objs) if (!o.clone) this.placeDefault(o);
    Object.assign(this.fx, venueFx(v));
    this.preset = null;
    this.room();
    this.emit();
  }
  private room() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const fx = this.fx;
    const w = (fx.wet / 100) * 0.8;
    this.wet.gain.setTargetAtTime(w, t, 0.08);
    this.dry.gain.setTargetAtTime(1 - w * 0.5, t, 0.08);
    this.preDelay.delayTime.setTargetAtTime(Math.min(0.45, fx.pre / 1000), t, 0.03);
    this.user.gain.setTargetAtTime(this.volume * 10 ** (fx.gain / 20), t, 0.05);
    const n = Math.round(fx.bounces);
    const gap = fx.pre / 1000;
    for (let i = 0; i < ECHO_TAPS; i++) {
      const on = i < n && gap > 0.005;
      const at = gap * (i + 1);
      this.echoDelays[i].delayTime.setTargetAtTime(on ? Math.min(3.8, at) : 0.001, t, 0.03);
      const amp = on ? Math.exp((-3 * at) / Math.max(0.15, fx.rt)) * 0.4 : 0;
      this.echoGains[i].gain.setTargetAtTime(amp, t, 0.05);
    }
    if (fx.rt !== this.builtRt) {
      clearTimeout(this.rtTimer);
      this.rtTimer = window.setTimeout(
        () => {
          this.builtRt = fx.rt;
          this.verb.buffer = impulse(ctx, fx.rt);
        },
        this.builtRt ? 120 : 0,
      );
    }
  }
  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ctx) this.user.gain.setTargetAtTime(this.volume * 10 ** (this.fx.gain / 20), this.ctx.currentTime, 0.03);
    this.emit();
  }

  // MARK: Head (ñü.mobility)

  /** Turns Immersive Mobility on or off. Off eases the listener back to the centre, facing ahead,
   *  and sensor poses stop reaching the listener at all — gyro, accelerometer, camera and AirPods
   *  motion are ignored until it is turned back on. */
  setMobility(on: boolean) {
    this.mobility = on;
    if (!on) {
      this.pose = { yaw: 0, pitch: 0, roll: 0, pos: { x: 0, y: 0, z: 0 } };
      this.sensorPos = { x: 0, y: 0, z: 0 };
      this.walkedPos = { x: 0, y: 0, z: 0 };
      this.listenerPos = { x: 0, y: 0, z: 0 };
    }
    this.applyPose();
    this.emit();
  }
  setPose(p: Pose) {
    if (!this.mobility) return;
    this.pose = p;
    if (p.pos) {
      this.sensorPos = { ...p.pos };
      this.syncListener();
    }
    this.applyPose();
  }
  /** Moves the listener through the bubble (keys, a lean, a step). Metres, bubble axes. */
  moveListener(d: Pos) {
    if (!this.mobility) return;
    this.walkedPos = { x: this.walkedPos.x + d.x, y: this.walkedPos.y + d.y, z: this.walkedPos.z + d.z };
    this.syncListener();
    this.applyPose();
    this.emit();
  }
  /** Back to the centre of the bubble, where every listen starts. */
  recentreListener() {
    this.walkedPos = { x: 0, y: 0, z: 0 };
    this.sensorPos = { x: 0, y: 0, z: 0 };
    this.syncListener();
    this.applyPose();
    this.emit();
  }
  private applyPose() {
    if (!this.ctx) return;
    const pose = this.mobility ? this.pose : { yaw: 0, pitch: 0, roll: 0, pos: { x: 0, y: 0, z: 0 } };
    const { forward, up } = listenerVectors(pose);
    const at = this.mobility ? this.listenerPos : { x: 0, y: 0, z: 0 };
    const L = this.ctx.listener;
    const t = this.ctx.currentTime;
    if (L.forwardX) {
      L.forwardX.setTargetAtTime(forward.x, t, 0.02);
      L.forwardY.setTargetAtTime(forward.y, t, 0.02);
      L.forwardZ.setTargetAtTime(forward.z, t, 0.02);
      L.upX.setTargetAtTime(up.x, t, 0.02);
      L.upY.setTargetAtTime(up.y, t, 0.02);
      L.upZ.setTargetAtTime(up.z, t, 0.02);
      // Same axis map as `place`: bubble (x right, y ahead, z up) → Web Audio (x, z, −y).
      L.positionX.setTargetAtTime(at.x, t, 0.03);
      L.positionY.setTargetAtTime(at.z, t, 0.03);
      L.positionZ.setTargetAtTime(-at.y, t, 0.03);
    } else {
      L.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
      L.setPosition(at.x, at.z, -at.y);
    }
  }

  // MARK: Placing sounds

  private placeDefault(o: Obj) {
    const v = this.venue;
    if (o.kind === 'stem' && o.stem) Object.assign(o.pos, v.stems[o.stem] ?? v.mono);
    else if (o.kind === 'left') Object.assign(o.pos, v.stereo.l);
    else if (o.kind === 'right') Object.assign(o.pos, v.stereo.r);
    else if (o.kind === 'mono') Object.assign(o.pos, this.deck?.track.pos ?? v.mono);
    this.place(o);
  }
  place(o: Obj) {
    clampPos(o.pos);
    if (o.panner && this.ctx) {
      const t = this.ctx.currentTime;
      o.panner.positionX.setTargetAtTime(o.pos.x, t, 0.03);
      o.panner.positionY.setTargetAtTime(o.pos.z, t, 0.03);
      o.panner.positionZ.setTargetAtTime(-o.pos.y, t, 0.03);
    }
  }
  moveObj(o: Obj, pos: Pos) {
    o.pos = { ...pos };
    if (o.orbit) o.orbit.center = { ...pos };
    this.place(o);
    this.selected = o;
  }

  /** Starts or stops nu.orbit on a sound. Rate is revolutions per minute; 0 clears. */
  setOrbit(o: Obj, rpm: number) {
    if (o.kind === 'direct' || o.gone) return;
    if (rpm <= 0) {
      o.orbit = null;
      this.emit();
      return;
    }
    const r = Math.max(0.35, Math.min(2.2, Math.hypot(o.pos.x, o.pos.y) * 0.55 || 0.8));
    o.orbit = {
      rate: (rpm / 60) * Math.PI * 2,
      radius: r,
      phase: Math.atan2(o.pos.x, o.pos.y),
      center: { x: 0, y: Math.max(0.4, o.pos.y * 0.35), z: o.pos.z },
    };
    this.emit();
  }

  applyScene(s: Scene) {
    if (s.venue) this.setVenue(s.venue);
    if (s.fx) this.setFx(s.fx, null);
    if (s.mode) this.setMode(s.mode);
    const d = this.deck;
    if (!d) return;
    for (const so of s.objs) {
      const o =
        (so.src && d.objs.find((x) => x.srcTrack === so.src!.track && (x.srcStem ?? '') === (so.src!.stem ?? ''))) ||
        d.objs.find((x) => x.key === so.key || x.label === so.label || (so.key && x.stem && so.key.includes(x.stem)));
      if (!o) continue;
      o.pos = { ...so.pos };
      this.place(o);
      if (so.gone && !o.gone) this.removeObj(o);
      if (so.orbit) {
        o.orbit = { rate: so.orbit.rate, radius: so.orbit.radius, phase: so.orbit.phase, center: { x: 0, y: Math.max(0.4, so.pos.y * 0.35), z: so.pos.z } };
      } else o.orbit = null;
    }
    this.emit();
  }
  select(o: Obj | null) {
    this.selected = o;
    this.emit();
  }
  /** Pulls the left and right sounds of a stereo track together or apart: 0 is one point ahead, 1 the venue, 2 twice as wide. */
  setWidth(w: number) {
    const d = this.deck;
    if (!d) return;
    const l = d.objs.find((o) => o.kind === 'left' && !o.clone);
    const r = d.objs.find((o) => o.kind === 'right' && !o.clone);
    if (!l || !r) return;
    const { l: bl, r: br } = this.venue.stereo;
    const mid = { x: (bl.x + br.x) / 2, y: (bl.y + br.y) / 2, z: (bl.z + br.z) / 2 };
    for (const [o, b] of [
      [l, bl],
      [r, br],
    ] as const) {
      o.pos = { x: mid.x + (b.x - mid.x) * w, y: mid.y + (b.y - mid.y) * w, z: mid.z + (b.z - mid.z) * w };
      this.place(o);
    }
    this.emit();
  }
  /** Swings every sound of the current track around you by `deg`. */
  rotate(deg: number) {
    const d = this.deck;
    if (!d) return;
    const a = (deg * Math.PI) / 180;
    for (const o of d.objs) {
      if (o.kind === 'direct') continue;
      const { x, y } = o.pos;
      o.pos = { x: x * Math.cos(a) + y * Math.sin(a), y: -x * Math.sin(a) + y * Math.cos(a), z: o.pos.z };
      this.place(o);
    }
    this.emit();
  }

  private rampTo(g: GainNode | undefined, to: number, s = FADE_S) {
    if (!this.ctx || !g) return;
    const t = this.ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(to, t + s);
  }

  canRemove() {
    return this.objs().filter((o) => o.kind !== 'direct').length > 1;
  }
  removeObj(o: Obj) {
    const d = this.deck;
    if (!d || !this.canRemove() || o.gone || o.kind === 'direct') return;
    if (!o.clone) {
      o.gone = true;
      this.rampTo(o.fade, 0);
      window.setTimeout(() => {
        if (o.gone && o.el && o.el !== d.master && o.kind === 'stem') o.el.pause();
      }, FADE_S * 1000 + 60);
    } else {
      this.rampTo(o.fade, 0);
      window.setTimeout(() => this.unwire(d, o), FADE_S * 1000 + 60);
      d.objs.splice(d.objs.indexOf(o), 1);
    }
    this.selected = this.objs()[0] ?? null;
    this.emit();
  }
  restoreObjs() {
    const d = this.deck;
    if (!d) return;
    for (const o of d.objs) {
      if (!o.gone) continue;
      o.gone = false;
      if (o.el && o.el !== d.master && d.playing) {
        o.el.currentTime = d.master?.currentTime ?? 0;
        o.el.play().catch(() => {});
      }
      this.rampTo(o.fade, 1);
    }
    this.emit();
  }
  async cloneObj(src: Obj) {
    const d = this.deck;
    if (!d || src.kind === 'direct') return;
    if (d.objs.filter((x) => x.clone).length >= MAX_CLONES) return;
    const ctx = this.graph();
    const offset = clampPos({ x: src.pos.x + 0.6, y: src.pos.y - 0.4, z: src.pos.z + 0.3 });
    const n = d.objs.filter((x) => x.kind === src.kind && x.stem === src.stem).length;
    const base = src.label.replace(/ \d+$/, '');
    const o: Obj = { key: `${src.key}-${++d.serial}`, kind: src.kind, stem: src.stem, srcTrack: src.srcTrack, srcStem: src.srcStem, label: `${base} ${n + 1}`, pos: offset, mark: src.mark, clone: true, level: 0 };
    if (src.el) {
      const el = this.element();
      el.src = src.el.currentSrc || src.el.src;
      el.loop = src.el.loop;
      o.el = el;
    } else if (d.track.gen) {
      const g = d.track.gen;
      o.voice = createVoice(ctx, g, { loop: !!d.track.loop || g.type !== 'tone', attack: 0.04, clip: g.type === 'clip' ? await clipBuffer(ctx, g.url) : undefined });
    }
    if (d !== this.deck || d.disposed) return;
    this.wire(d, o);
    d.objs.push(o);
    if (d.playing) {
      if (o.fade) {
        o.fade.gain.value = 0;
        this.rampTo(o.fade, 1);
      }
      if (o.el) {
        o.el.currentTime = d.master?.currentTime ?? 0;
        o.el.play().catch(() => {});
      }
      o.voice?.start();
    }
    this.selected = o;
    this.emit();
  }

  /** Layers a generated healing tone or nature sound into the active spacetime bubble alongside whatever is playing. */
  async addGenToBubble(track: PlayTrack): Promise<boolean> {
    const g = track.gen;
    if (!g) return false;
    const ctx = this.graph();
    await ctx.resume();
    if (!this.deck) {
      await this.setQueue([track], 0, true);
      return true;
    }
    const d = this.deck;
    if (d.objs.length >= 16) return false;
    const clip = g.type === 'clip' ? await clipBuffer(ctx, g.url) : undefined;
    const voice = createVoice(ctx, g, { loop: true, attack: 0.15, clip });
    voice.out.gain.value = 0.65;
    const basePos = track.pos ?? { x: (Math.random() - 0.5) * 2.2, y: 1.4, z: (Math.random() - 0.5) * 1.2 };
    const jitter = d.objs.some((x) => Math.hypot(x.pos.x - basePos.x, x.pos.y - basePos.y, x.pos.z - basePos.z) < 0.25)
      ? clampPos({ x: basePos.x + 0.45, y: basePos.y - 0.3, z: basePos.z + 0.2 })
      : clampPos({ ...basePos });
    const o: Obj = {
      key: `gen-${track.id}-${++d.serial}`,
      kind: track.spatial === 'direct' ? 'direct' : 'mono',
      srcTrack: track.id,
      label: track.title,
      pos: jitter,
      mark: g.mark,
      clone: true,
      level: 0,
      voice,
    };
    this.wire(d, o);
    d.objs.push(o);
    if (!d.playing) {
      await this.play();
    } else {
      if (o.fade) {
        o.fade.gain.value = 0;
        this.rampTo(o.fade, 1, 0.6);
      }
      o.voice?.start();
    }
    this.selected = o;
    this.emit();
    return true;
  }

  /**
   * Layers one stem — or a whole other song as a single node — from any track in the library, or from
   * another bubble (a recalled ñü.scene carries these nodes with it), into the playing spacetime
   * bubble. The node loops and stays locked to the deck clock, is fully movable / cloneable /
   * removable like a native stem, and never touches the playing track's own objects.
   * Returns false when the bubble is full or the source has nothing playable on this device.
   */
  async addStemFromTrack(source: PlayTrack, stem?: Stem): Promise<boolean> {
    if (!stem && source.gen) return this.addGenToBubble(source);
    const ctx = this.graph();
    await ctx.resume();
    if (!this.deck) {
      await this.setQueue([source], 0, true);
      return true;
    }
    const d = this.deck;
    if (d.objs.length >= 28) return false;
    const el = this.element();
    el.src = stem ? stem.url : pick(el, source.src ?? source.original ?? []);
    if (!el.src) return false;
    el.loop = true;
    el.preload = 'auto';
    const base = stem ? { ...(this.venue.stems[stem.id] ?? this.venue.mono) } : { ...this.venue.mono };
    const pos = d.objs.some((x) => Math.hypot(x.pos.x - base.x, x.pos.y - base.y, x.pos.z - base.z) < 0.3)
      ? clampPos({ x: base.x + 0.55, y: base.y - 0.35, z: base.z + 0.25 })
      : clampPos(base);
    const o: Obj = {
      key: `xstem-${source.id}-${stem?.id ?? 'mix'}-${++d.serial}`,
      kind: stem ? 'stem' : 'mono',
      stem: stem?.id,
      srcTrack: source.id,
      srcStem: stem?.id ?? 'mix',
      label: stem ? `${stem.label} · ${source.title}` : source.title,
      pos,
      mark: stem?.mark ?? '#7ee0ff',
      clone: true,
      level: 0,
      el,
    };
    this.wire(d, o);
    d.objs.push(o);
    const syncPlay = () => {
      const dur = el.duration;
      const at = d.master?.currentTime ?? 0;
      try {
        el.currentTime = Number.isFinite(dur) && dur > 0 ? at % dur : at;
      } catch { /* not seekable yet */ }
      if (d.playing) el.play().catch(() => {});
    };
    if (el.readyState >= 1) syncPlay();
    else el.addEventListener('loadedmetadata', syncPlay, { once: true });
    if (d.playing && o.fade) {
      o.fade.gain.value = 0;
      this.rampTo(o.fade, 1, 0.6);
    }
    this.selected = o;
    this.emit();
    return true;
  }

  private wire(d: Deck, o: Obj) {
    const ctx = this.graph();
    o.meter = ctx.createAnalyser();
    o.meter.fftSize = 1024;
    o.fade = ctx.createGain();
    if (o.kind === 'direct') {
      o.voice!.out.connect(o.fade).connect(d.spatial!);
      o.fade.connect(o.meter);
      return;
    }
    o.panner = this.panner();
    let into: AudioNode;
    if (o.el) {
      const src = this.sourceOf(o.el);
      if (o.kind === 'left' || o.kind === 'right') {
        let split = d.splits.get(o.el);
        if (!split) {
          split = ctx.createChannelSplitter(2);
          src.connect(split);
          d.splits.set(o.el, split);
          // A stereo file's untouched original is the same element, flat and unsplit.
          if (!o.clone && d.origGain) src.connect(d.origGain);
        }
        const tap = ctx.createGain();
        split.connect(tap, o.kind === 'left' ? 0 : 1);
        into = tap;
        o.tap = tap;
      } else if (o.kind === 'mono') {
        into = src;
        if (!o.clone && d.origGain) src.connect(d.origGain);
      } else {
        into = src;
        if (o.stem === 'piano') {
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 6200;
          lp.Q.value = 0.6;
          const soft = ctx.createDynamicsCompressor();
          soft.threshold.value = -16;
          soft.knee.value = 10;
          soft.ratio.value = 2.5;
          soft.attack.value = 0.004;
          soft.release.value = 0.14;
          src.connect(lp).connect(soft);
          into = soft;
        }
      }
    } else {
      into = o.voice!.out;
    }
    into.connect(o.fade).connect(o.panner).connect(d.spatial!);
    o.fade.connect(o.meter);
    this.place(o);
  }

  private unwire(d: Deck, o: Obj) {
    o.voice?.stop();
    o.panner?.disconnect();
    o.fade?.disconnect();
    o.tap?.disconnect();
    if (o.el && o.el !== d.master && !d.objs.some((x) => x !== o && x.el === o.el)) this.release(o.el);
  }

  // MARK: Decks

  /** Connects a deck's media elements or generators into the Web Audio graph.
   *  May be deferred until the first tap gesture so mobile Safari never creates a background-suspended AudioContext. */
  private wireDeck(d: Deck) {
    if (d.wired || d.disposed) return;
    const ctx = this.graph();
    d.ctx = ctx;
    d.wired = true;
    d.origGain = ctx.createGain();
    d.bedGain = ctx.createGain();
    d.spatial = ctx.createGain();
    d.fade = ctx.createGain();
    d.origGain.gain.value = 0;
    d.bedGain.gain.value = 0;
    d.origGain.connect(d.fade);
    d.bedGain.connect(d.fade);
    d.fade.connect(this.flat);
    const track = d.track;
    if (track.kind === 'song') {
      if (track.spatial === 'stems' && track.stems) {
        if (d.master) {
          const o = this.sourceOf(d.master);
          o.connect(d.origGain);
          d.origMeter = ctx.createAnalyser();
          d.origMeter.fftSize = 2048;
          o.connect(d.origMeter);
        }
        d.spatial.connect(this.bus);
      } else {
        d.spatial.connect(this.bus);
      }
    } else if (track.gens?.length) {
      d.spatial.connect(this.bus);
      const gainScale = 1 / Math.sqrt(track.gens.length);
      for (let i = 0; i < track.gens.length; i++) {
        const item = track.gens[i];
        const o = d.objs[i];
        if (o && !o.voice && item.gen.type !== 'clip') {
          o.voice = createVoice(ctx, item.gen, { loop: !!track.loop, attack: 0.35 });
          o.voice.out.gain.value = gainScale;
        }
      }
    } else if (track.gen) {
      const direct = track.spatial === 'direct';
      d.spatial.connect(direct ? this.direct : this.bus);
      const o = d.objs[0];
      if (o && !o.voice && track.gen.type !== 'clip') {
        o.voice = createVoice(ctx, track.gen, { loop: !!track.loop, attack: 0.04 });
      }
    }
    for (const o of d.objs) if (o.el || o.voice) this.wire(d, o);
    for (const o of d.objs) if (o.kind !== 'mono' || (!track.pos && !track.gens?.length)) this.placeDefault(o);
    this.applyMode(d, true);
  }

  /** Synchronously creates the Deck and its HTMLAudioElements + bubble objects without awaiting network or IDB.
   *  When `deferAudioContext` is true (cued on page open before any user gesture), no AudioContext is created yet. */
  private buildSync(track: PlayTrack, deferAudioContext = false): Deck {
    const d = new Deck(track, deferAudioContext ? null : this.graph());
    if (track.kind === 'song') {
      const mk = (srcs: { url: string; type: string }[] = [], eager = true) => {
        const el = this.element();
        el.preload = eager ? 'auto' : isMobileAudio() ? 'metadata' : 'auto';
        el.src = pick(el, srcs);
        return el;
      };
      if (track.spatial === 'stems' && track.stems) {
        // On mobile, don't force a simultaneous 10 MB original download while 5 stems are buffering in nu.waves mode.
        d.master = mk(track.original ?? track.src, !isMobileAudio() || this.mode === 'orig');
        for (const s of track.stems) {
          const el = mk([{ url: s.url, type: '' }], true);
          d.objs.push({ key: s.id, kind: 'stem', stem: s.id, label: s.label, pos: { x: 0, y: 1, z: 0 }, mark: s.mark, clone: false, level: 0, el });
        }
      } else {
        const el = mk(track.src, true);
        d.master = el;
        if (track.spatial === 'mono') {
          d.objs.push({ key: 'mono', kind: 'mono', label: track.title, pos: { ...(track.pos ?? this.venue.mono) }, mark: '#7ee0ff', clone: false, level: 0, el });
        } else {
          d.objs.push({ key: 'left', kind: 'left', label: 'Left', pos: { ...this.venue.stereo.l }, mark: '#7ec8ff', clone: false, level: 0, el });
          d.objs.push({ key: 'right', kind: 'right', label: 'Right', pos: { ...this.venue.stereo.r }, mark: '#c8a2ff', clone: false, level: 0, el });
        }
      }
    } else if (track.gens?.length) {
      for (const item of track.gens) {
        d.objs.push({
          key: item.id,
          kind: 'mono',
          label: item.label,
          pos: { ...item.pos },
          mark: item.gen.mark,
          clone: false,
          level: 0,
        });
      }
    } else if (track.gen) {
      const direct = track.spatial === 'direct';
      d.objs.push({ key: 'voice', kind: direct ? 'direct' : 'mono', label: track.title, pos: { ...(track.pos ?? this.venue.mono) }, mark: track.gen.mark, clone: false, level: 0 });
    }
    for (const o of d.objs) if (o.kind !== 'mono' || (!track.pos && !track.gens?.length)) this.placeDefault(o);
    if (!deferAudioContext) this.wireDeck(d);
    return d;
  }

  private async build(track: PlayTrack, deferAudioContext = false): Promise<Deck> {
    const d = this.buildSync(track, deferAudioContext);
    if (!deferAudioContext && track.kind === 'generator') {
      const ctx = this.graph();
      if (track.gens?.length) {
        const gainScale = 1 / Math.sqrt(track.gens.length);
        for (let i = 0; i < track.gens.length; i++) {
          const item = track.gens[i];
          if (item.gen.type === 'clip' && d.objs[i] && !d.objs[i].voice) {
            const clip = await clipBuffer(ctx, item.gen.url);
            d.objs[i].voice = createVoice(ctx, item.gen, { loop: !!track.loop, attack: 0.35, clip });
            d.objs[i].voice!.out.gain.value = gainScale;
            this.wire(d, d.objs[i]);
          }
        }
      } else if (track.gen?.type === 'clip' && d.objs[0] && !d.objs[0].voice) {
        const clip = await clipBuffer(ctx, track.gen.url);
        d.objs[0].voice = createVoice(ctx, track.gen, { loop: !!track.loop, attack: 0.04, clip });
        this.wire(d, d.objs[0]);
      }
    }
    return d;
  }

  private dispose(d: Deck) {
    if (d.disposed) return;
    d.disposed = true;
    for (const o of d.objs) this.unwire(d, o);
    for (const el of d.els()) this.release(el);
    if (d.bed) this.release(d.bed);
    d.origGain?.disconnect();
    d.bedGain?.disconnect();
    d.spatial?.disconnect();
    d.fade?.disconnect();
    d.origMeter?.disconnect();
    for (const s of d.splits.values()) s.disconnect();
    for (const u of d.track.revoke ?? []) URL.revokeObjectURL(u);
  }

  /** The gain the split path needs to sit level with the untouched file. */
  private spatialGain(d: Deck) {
    return d.track.spatial === 'stems' ? 1 : d.track.spatial === 'mono' ? 1.15 : d.track.spatial === 'direct' ? 1 : 1.25;
  }

  private applyMode(d: Deck, now = false) {
    if (!this.ctx || !d.wired || !d.origGain || !d.bedGain || !d.spatial) return;
    const t = this.ctx.currentTime;
    const k = now ? 0.001 : 0.12;
    const stems = d.track.spatial === 'stems';
    const hasBed = stems && !!d.track.bed;
    let mode: Mode = d.isSong ? this.mode : 'waves';
    if (mode === 'bed' && !hasBed) mode = 'orig';
    d.origGain.gain.setTargetAtTime(mode === 'orig' ? 1 : 0, t, k);
    d.bedGain.gain.setTargetAtTime(mode === 'bed' ? 1 : 0, t, k);
    d.spatial.gain.setTargetAtTime(mode === 'waves' ? this.spatialGain(d) : 0, t, k);
    if (mode === 'orig' && d.master && d.playing && d.master.paused) {
      d.master.currentTime = d.position();
      d.master.play().catch(() => {});
    }
    if (mode === 'bed' && !d.bed && d.track.bed) {
      const el = this.element();
      el.src = pick(el, d.track.bed.src);
      this.sourceOf(el).connect(d.bedGain);
      d.bed = el;
      // Load as soon as the bed source is selected; play only once it is ready.
      void this.ready(el).then(() => {
        if (d.disposed || d.bed !== el) return;
        el.currentTime = d.master?.currentTime ?? 0;
        if (d.playing) el.play().catch(() => {});
      });
    }
  }
  setMode(m: Mode) {
    this.mode = m;
    if (this.deck) this.applyMode(this.deck);
    this.emit();
  }
  /** Whether the current track has a fixed-speaker bed to compare against. */
  get hasBed() {
    return !!this.deck?.track.bed;
  }

  // MARK: Queue and transport

  setQueue(tracks: PlayTrack[], start = 0, autoplay = true) {
    this.channel = null;
    clearTimeout(this.channelTimer);
    this.queue = [...tracks];
    this.index = Math.max(0, Math.min(start, this.queue.length - 1));
    // Selecting a source always loads it; autoplay only decides whether to start after load.
    return autoplay ? this.playIndex(this.index) : this.loadIndex(this.index);
  }

  /** Builds the deck and buffers media for queue index `i` without starting playback. */
  async loadIndex(i: number) {
    const track = this.queue[i];
    if (!track) return;
    this.index = i;
    await this.load(track, 0);
  }
  enqueue(tracks: PlayTrack[], next = false) {
    if (next) this.queue.splice(this.index + 1, 0, ...tracks);
    else this.queue.push(...tracks);
    this.emit();
  }
  removeAt(i: number) {
    if (i === this.index) return;
    this.queue.splice(i, 1);
    if (i < this.index) this.index--;
    this.emit();
  }
  move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= this.queue.length || to >= this.queue.length) return;
    const [t] = this.queue.splice(from, 1);
    this.queue.splice(to, 0, t);
    if (this.index === from) this.index = to;
    else if (from < this.index && to >= this.index) this.index--;
    else if (from > this.index && to <= this.index) this.index++;
    this.emit();
  }

  async playIndex(i: number, xf?: number) {
    const track = this.queue[i];
    if (!track) return;
    this.index = i;
    await this.start(track, 0, xf);
  }

  /** Warm the HTTP cache for a track’s media so select/play hits warm bytes. */
  prefetch(track: PlayTrack) {
    const urls: string[] = [];
    if (track.kind === 'song') {
      for (const s of track.src ?? []) if (s.url) urls.push(s.url);
      for (const s of track.original ?? []) if (s.url) urls.push(s.url);
      for (const s of track.stems ?? []) if (s.url) urls.push(s.url);
      for (const s of track.bed?.src ?? []) if (s.url) urls.push(s.url);
    } else if (track.gen?.type === 'clip' && track.gen.url) urls.push(track.gen.url);
    for (const url of urls) {
      if (!url || url.startsWith('data:')) continue;
      void fetch(url, { mode: 'cors', credentials: 'omit', cache: 'force-cache' }).catch(() => {});
    }
  }

  /** Installs `d` as the active deck, handles crossfades from `old`, and configures element listeners. */
  private installDeck(d: Deck, old: Deck | null, at: number, xf?: number, my = this.startSerial) {
    this.deck = d;
    this.selected = d.objs[0] ?? null;
    if (d.wired) this.applyMode(d, true);
    const wasPlaying = !!old?.playing;
    const fadeS = xf ?? (wasPlaying ? this.crossfade : 0);
    const outS = Math.max(fadeS, wasPlaying ? 0.25 : 0);
    if (old && old !== d) {
      if (outS > 0 && old.wired) {
        this.rampTo(old.fade, 0, outS);
        this.rampTo(old.spatial, 0, outS);
        window.setTimeout(() => this.dispose(old), outS * 1000 + 80);
      } else this.dispose(old);
    }
    if (fadeS > 0 && d.isSong && d.wired && d.fade) {
      d.fade.gain.value = 0;
      this.rampTo(d.fade, 1, fadeS);
      for (const o of d.objs)
        if (o.fade) {
          o.fade.gain.value = 0;
          this.rampTo(o.fade, 1, fadeS);
        }
    }
    if (!d.isSong && d.wired) {
      const v = d.objs.find((o) => o.voice)?.voice;
      v?.retune?.(this.tone.hold, this.tone.fade, fadeS > 0 ? fadeS : 0.04);
    }
    if (d.isSong) {
      for (const el of d.els()) {
        if (at > 0) {
          try {
            el.currentTime = at;
          } catch {
            /* seek applied on loadedmetadata */
          }
        }
        el.loop = this.repeat === 'one' && !this.channel && !this.mixed;
      }
      const endCarrier = d.master ?? d.objs.find((o) => o.el)?.el;
      if (endCarrier) {
        endCarrier.onended = () => this.onEnded(d);
        endCarrier.onerror = () => {
          if (d !== this.deck || d.disposed) return;
          this.error = `${d.track.title} could not be played.`;
          window.setTimeout(() => this.onEnded(d), 400);
        };
      }
      if (d.objs[0]?.el && d.objs[0].el !== endCarrier) {
        d.objs[0].el.onended = () => this.onEnded(d);
      }
      this.error = null;
    }
    this.emit();
    if (d.isSong) {
      void this.readyAll(d.els()).then(() => {
        if (my === this.startSerial) this.emit();
      });
    }
    if (d.bed) {
      void this.ready(d.bed).then(() => {
        if (my === this.startSerial) this.emit();
      });
    }
  }

  /** Builds + buffers `track` into the active deck. Does not start playback.
   *  Never creates or resumes AudioContext when unlocked is false — on iOS Safari an AudioContext created
   *  outside a user gesture can permanently silence MediaElementAudioSourceNode until the tab reloads. */
  private async load(track: PlayTrack, at: number, xf?: number): Promise<Deck | null> {
    const deferCtx = !this.unlocked;
    if (!deferCtx) this.graph();
    const my = ++this.startSerial;
    const old = this.deck;
    // Reuse an already-loaded deck for the same track (select → load, then play).
    if (old && !old.disposed && old.track.id === track.id && old.isSong) {
      for (const el of old.els()) {
        if (at > 0 || el.currentTime > 0.05) {
          try {
            el.currentTime = at;
          } catch {
            /* ignore before metadata */
          }
        }
        el.loop = this.repeat === 'one' && !this.channel && !this.mixed;
      }
      this.emit();
      void this.readyAll(old.els()).then(() => {
        if (my === this.startSerial) this.emit();
      });
      return old;
    }
    this.prefetch(track);
    const syncTrack = this.syncLoader?.(track);
    if (syncTrack) {
      const d = await this.build(syncTrack, deferCtx);
      if (my !== this.startSerial) {
        this.dispose(d);
        return null;
      }
      this.installDeck(d, old, at, xf, my);
      return d;
    }
    let loaded = track;
    if (this.loader) {
      try {
        loaded = (await this.loader(track)) ?? track;
      } catch {
        loaded = track;
      }
      if (my !== this.startSerial) return null;
    }
    const d = await this.build(loaded, deferCtx);
    if (my !== this.startSerial) {
      this.dispose(d);
      return null;
    }
    this.installDeck(d, old, at, xf, my);
    return d;
  }

  /** Swaps the playing deck for `track`, crossfading over `xf` seconds when given.
   *  For catalogue tracks and generators, builds the deck and invokes `el.play()` synchronously
   *  before the first `await` so mobile browsers (iOS Safari / Android Chrome) never reject playback. */
  private async start(track: PlayTrack, at: number, xf?: number) {
    const deferUntilPlay = !this.unlocked && track.kind === 'song';
    if (!deferUntilPlay) {
      const ctx = this.graph();
      this.wakeContext(ctx);
    }
    const old = this.deck;
    if (old && !old.disposed && old.track.id === track.id && old.isSong) {
      if (!deferUntilPlay && !old.wired) this.wireDeck(old);
      await this.run(old, at);
      this.history?.(old.track, this.duration());
      this.emit();
      return;
    }
    const syncTrack = this.syncLoader?.(track);
    if (syncTrack && !(syncTrack.kind === 'generator' && (syncTrack.gen?.type === 'clip' || syncTrack.gens?.some((g) => g.gen.type === 'clip')))) {
      const my = ++this.startSerial;
      this.prefetch(syncTrack);
      const d = this.buildSync(syncTrack, deferUntilPlay);
      this.installDeck(d, old, at, xf, my);
      await this.run(d, at);
      this.history?.(d.track, this.duration());
      this.emit();
      return;
    }
    const d = await this.load(track, at, xf);
    if (!d || d !== this.deck || d.disposed) return;
    if (!deferUntilPlay && !d.wired) this.wireDeck(d);
    await this.run(d, at);
    this.history?.(d.track, this.duration());
    this.emit();
  }

  private async run(d: Deck, at: number) {
    if (this.unlocked || !d.isSong) {
      const ctx = this.graph();
      this.wakeContext(ctx);
      if (!d.wired) this.wireDeck(d);
    }
    d.playing = true;
    d.ended = false;
    this.error = null;
    this.emit();
    if (d.isSong) {
      const allEls = d.els();
      const activeEls = d.playEls(this.mode);
      for (const el of allEls) {
        el.loop = this.repeat === 'one' && !this.channel && !this.mixed;
        if (at > 0 || el.currentTime > 0.05) {
          try {
            if (Math.abs(el.currentTime - at) > 0.05) el.currentTime = at;
          } catch {
            const seekOnce = () => {
              el.removeEventListener('loadedmetadata', seekOnce);
              try {
                el.currentTime = at;
              } catch {
                /* ignore */
              }
            };
            el.addEventListener('loadedmetadata', seekOnce);
          }
        }
      }
      this.lastSync = performance.now();
      // Call play() on every active element synchronously inside the user gesture before awaiting anything!
      const playPromises = activeEls.map((el) => {
        try {
          return el.play();
        } catch (err) {
          return Promise.reject(err);
        }
      });
      const results = await Promise.allSettled(playPromises);
      if (d !== this.deck || d.disposed) return;
      const anyBlocked = results.some(
        (r) => r.status === 'rejected' && ((r.reason as DOMException)?.name === 'NotAllowedError' || String(r.reason).includes('NotAllowedError')),
      );
      // Retry any stem that rejected transiently (not due to autoplay policy) once it finishes buffering.
      if (!anyBlocked) {
        for (let i = 0; i < activeEls.length; i++) {
          if (results[i].status === 'rejected' && d.playing) {
            const el = activeEls[i];
            void this.ready(el, 6000).then(() => {
              if (d === this.deck && d.playing && !d.disposed && el.paused) {
                const refT = d.position();
                if (refT > 0.05) {
                  try {
                    el.currentTime = refT;
                  } catch {
                    /* ignore */
                  }
                }
                el.play().catch(() => {});
              }
            });
          }
        }
      }
      const anyPlaying = activeEls.some((el) => !el.paused);
      if (!anyPlaying && results.length && results.every((r) => r.status === 'rejected')) {
        d.playing = false;
        if (anyBlocked || !this.unlocked) this.pendingAutoplay = true;
        this.emit();
        return;
      }
      this.pendingAutoplay = false;
      if (!d.wired) {
        const ctx = this.graph();
        this.wakeContext(ctx, true);
        this.wireDeck(d);
      } else if (this.ctx && this.ctx.state !== 'running') {
        void this.ctx.resume().catch(() => {});
        if (this.ctx.state !== 'running') this.pendingAutoplay = true;
      }
    } else {
      const ctx = this.graph();
      if (ctx.state !== 'running') {
        try {
          await ctx.resume();
        } catch {
          /* ignore */
        }
      }
      if (ctx.state !== 'running') {
        d.playing = false;
        this.pendingAutoplay = true;
        this.emit();
        return;
      }
      this.pendingAutoplay = false;
      d.genOffset = at;
      d.startedAt = ctx.currentTime;
      for (const o of d.objs) o.voice?.start();
    }
    this.updateSession();
  }

  private onEnded(d: Deck) {
    if (d !== this.deck || d.disposed || d.ended) return;
    if (d.master?.loop) return;
    d.playing = false;
    d.ended = true;
    for (const el of d.els()) el.pause();
    this.emit();
    void this.advance(true);
  }

  async play() {
    const ctx = this.graph();
    this.wakeContext(ctx, true);
    this.pendingAutoplay = false;
    const d = this.deck;
    if (!d) {
      if (this.channel) return;
      if (this.queue[this.index]) await this.playIndex(this.index);
      return;
    }
    if (d.playing) {
      if (!d.wired) this.wireDeck(d);
      return;
    }
    const at = d.ended ? 0 : d.position();
    await this.run(d, at);
    this.emit();
  }
  pause() {
    this.pendingAutoplay = false;
    const d = this.deck;
    if (!d || !d.playing) return;
    if (d.isSong) for (const el of d.els()) el.pause();
    else {
      d.genOffset = d.position();
      for (const o of d.objs) o.voice?.stop();
    }
    d.playing = false;
    this.pauseOut();
    this.updateSession();
    this.emit();
  }
  toggle() {
    if (this.playing && performance.now() - this.autoStartedAt < 450) return Promise.resolve();
    return this.playing ? this.pause() : this.play();
  }
  seek(t: number) {
    const d = this.deck;
    if (!d || this.channel) return;
    const to = Math.max(0, Math.min(this.duration(), t));
    if (d.isSong) {
      for (const el of d.els()) el.currentTime = to;
    } else {
      const was = d.playing;
      if (was) for (const o of d.objs) o.voice?.stop();
      d.genOffset = to;
      d.startedAt = this.ctx!.currentTime;
      if (was) for (const o of d.objs) o.voice?.start();
    }
    d.ended = false;
    this.emit();
  }
  async next() {
    if (this.channel) return;
    await this.advance(false);
  }
  async prev() {
    if (this.channel) return;
    if (this.position() > 3 || this.index <= 0) {
      this.seek(0);
      if (!this.playing) await this.play();
      return;
    }
    await this.playIndex(this.index - 1);
  }
  private async advance(auto: boolean, xf?: number) {
    if (this.advancing) return;
    this.advancing = true;
    try {
      if (this.sleepAt && Date.now() >= this.sleepAt) {
        this.sleepAt = 0;
        this.pause();
        return;
      }
      if (this.repeat === 'one' && auto) return await this.playIndex(this.index, xf);
      let i = this.index + 1;
      if (this.shuffle && this.queue.length > 1) {
        do i = Math.floor(Math.random() * this.queue.length);
        while (i === this.index);
      }
      if (i >= this.queue.length) {
        if (this.repeat === 'all') i = 0;
        else {
          this.emit();
          return;
        }
      }
      await this.playIndex(i, xf);
    } finally {
      this.advancing = false;
    }
  }
  setRepeat(r: Repeat) {
    this.repeat = r;
    if (this.deck?.isSong) for (const el of this.deck.els()) el.loop = r === 'one' && !this.channel && !this.mixed;
    this.emit();
  }
  setShuffle(on: boolean) {
    this.shuffle = on;
    this.emit();
  }
  setCrossfade(s: number) {
    this.crossfade = Math.max(0, Math.min(12, s));
    this.emit();
  }
  setSleep(minutes: number) {
    this.sleepAt = minutes > 0 ? Date.now() + minutes * 60_000 : 0;
    if (!minutes) {
      this.dimUntil = 0;
      this.dimFrom = null;
    }
    this.emit();
  }

  clearQueue() {
    if (this.live) return;
    const cur = this.track;
    this.queue = cur ? [cur] : [];
    this.index = cur ? 0 : -1;
    this.emit();
  }
  setTone(part: Partial<{ hold: number; fade: number; cross: number }>) {
    Object.assign(this.tone, part);
    const v = this.deck?.objs.find((o) => o.voice)?.voice;
    v?.retune?.(this.tone.hold, this.tone.fade, 0.04);
    this.emit();
  }

  // MARK: Live channels

  /** Joins a live channel at the moment everyone else is hearing. */
  async tune(ch: Channel, resolve: (id: string) => PlayTrack | undefined) {
    clearTimeout(this.channelTimer);
    const air = onAir(ch);
    if (!air) return;
    this.channel = ch;
    const track = resolve(air.item.trackId);
    if (!track) return;
    this.queue = [track];
    this.index = 0;
    this.channelSlot = air.item.dur;
    const at = Math.min(air.offset, Math.max(0, air.item.dur - 1));
    await this.start(track, at, 0.6);
    const ms = Math.max(500, air.remaining * 1000);
    this.channelTimer = window.setTimeout(() => {
      if (this.channel === ch) void this.tune(ch, resolve);
    }, ms);
    this.emit();
  }
  leaveChannel() {
    clearTimeout(this.channelTimer);
    this.channel = null;
    this.channelSlot = 0;
    this.emit();
  }

  // MARK: Frame

  /** Once per animation frame: keeps stems in step, matches loudness, meters every sound, times the hand-offs. */
  frame(now: number) {
    const d = this.deck;
    if (d && this.ctx) {
      // Stem clock: only wake paused elements, and only hard-seek on catastrophic drift.
      // Seeking HTMLMediaElement every ~500ms at a 50ms threshold was the choppy drop.
      if (d.playing && d.isSong && now - this.lastSync > 2000) {
        this.lastSync = now;
        const activeEls = d.playEls(this.mode);
        const clockEl = (d.master && !d.master.paused ? d.master : activeEls.find((e) => !e.paused)) ?? null;
        if (clockEl) {
          const t = clockEl.currentTime;
          for (const el of activeEls) {
            if (el === clockEl) continue;
            if (el.paused) {
              try {
                el.currentTime = t;
              } catch {
                /* ignore */
              }
              el.play().catch(() => {});
            } else if (Math.abs(el.currentTime - t) > 0.45) {
              try {
                el.currentTime = t;
              } catch {
                /* ignore */
              }
            }
          }
        }
      }
      // Keep the split as loud as the untouched file, measured live, while both play in step.
      if (d.origMeter && d.master && !d.master.paused && this.mode === 'waves') {
        const po = level(d.origMeter);
        const pw = level(this.sumMeter);
        if (po > 1e-6 && pw > 1e-6) {
          this.origPow = this.origPow ? this.origPow * 0.98 + po * 0.02 : po;
          this.wavePow = this.wavePow ? this.wavePow * 0.98 + pw * 0.02 : pw;
          const k = Math.min(1.6, Math.max(0.5, Math.sqrt(this.origPow / this.wavePow)));
          this.makeup.gain.setTargetAtTime(k, this.ctx.currentTime, 0.4);
        }
      } else if (Math.abs(this.makeup.gain.value - 1) > 0.01) this.makeup.gain.setTargetAtTime(1, this.ctx.currentTime, 0.3);
      for (const o of d.objs) {
        let v = 0;
        if (o.meter && d.playing && !o.gone) {
          const db = 10 * Math.log10(level(o.meter) + 1e-12);
          v = Math.max(0, Math.min(1, (db + 62) / 44));
        }
        o.level = o.level * 0.7 + v * 0.3;
        // nu.orbit: walk the ellipse; samples stay put, only the position numbers change.
        if (o.orbit && d.playing && !o.gone && o.kind !== 'direct') {
          const dt = 1 / 60;
          o.orbit.phase += o.orbit.rate * dt;
          const { center: c, radius: r, phase } = o.orbit;
          o.pos = { x: c.x + Math.sin(phase) * r, y: c.y + Math.cos(phase) * r, z: c.z };
          this.place(o);
        }
      }
      // nu.dim: last 45 s of a sleep timer collapse the room toward you, then fade volume.
      if (this.sleepAt && d.playing) {
        const left = this.sleepAt - Date.now();
        if (left <= 45_000 && left > 0) {
          if (!this.dimFrom) {
            this.dimFrom = {
              wet: this.fx.wet,
              volume: this.volume,
              positions: new Map(d.objs.map((o) => [o, { ...o.pos }])),
            };
            this.dimUntil = this.sleepAt;
          }
          const k = Math.max(0, Math.min(1, left / 45_000));
          const collapse = 1 - (1 - k) * (1 - k);
          for (const o of d.objs) {
            if (o.kind === 'direct' || o.gone) continue;
            const from = this.dimFrom.positions.get(o) ?? o.pos;
            o.pos = { x: from.x * collapse, y: from.y * collapse, z: from.z * collapse };
            o.orbit = null;
            this.place(o);
          }
          this.fx.wet = Math.round(this.dimFrom.wet * collapse);
          this.volume = this.dimFrom.volume * (0.15 + 0.85 * k);
          this.room();
        }
      }
      if (d.playing && !d.ended && !this.channel) {
        const pos = d.position();
        if (d.isSong) {
          // Start the next song early so the two overlap.
          const dur = d.duration();
          if (this.crossfade > 0 && this.mixed && dur > 0 && dur - pos <= this.crossfade && !d.master?.loop && (this.repeat !== 'off' || this.index < this.queue.length - 1)) {
            d.ended = true;
            void this.advance(true, this.crossfade);
          }
        } else {
          const end = d.track.loop ? (this.mixed ? SLOT_S : Infinity) : d.duration();
          if (Number.isFinite(end)) {
            const tone = d.track.gen?.type === 'tone';
            const xf = this.mixed ? (tone ? this.tone.cross : Math.max(this.crossfade, 1.5)) : 0;
            if (pos >= end - xf - 0.02) {
              d.ended = true;
              if (this.mixed || this.repeat !== 'off') void this.advance(true, xf);
              else
                window.setTimeout(
                  () => {
                    if (this.deck !== d || d.disposed) return;
                    d.playing = false;
                    for (const o of d.objs) o.voice?.stop();
                    d.genOffset = end;
                    this.updateSession();
                    this.emit();
                  },
                  Math.max(0, (end - pos) * 1000),
                );
            }
          }
        }
      }
      if (this.sleepAt && Date.now() >= this.sleepAt && d.playing) {
        this.sleepAt = 0;
        this.pause();
      }
      if (d.playing && now - this.lastSession > 4000) {
        this.lastSession = now;
        this.updateSession(false);
      }
    }
    for (const l of this.tickers) l();
  }

  // MARK: Media session

  private sessionBound = false;
  private updateSession(meta = true) {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const t = this.track;
    if (t && meta) {
      const art = t.artUrl ? [{ src: new URL(t.artUrl, location.href).href, sizes: '512x512' }] : [];
      ms.metadata = new MediaMetadata({ title: t.title, artist: t.artistName ?? '', album: this.channel ? `${this.channel.name} · live` : (t.albumTitle ?? ''), artwork: art });
    }
    ms.playbackState = this.playing ? 'playing' : 'paused';
    if (!this.sessionBound) {
      this.sessionBound = true;
      const set = (a: MediaSessionAction, h: MediaSessionActionHandler | null) => {
        try {
          ms.setActionHandler(a, h);
        } catch {
          /* unsupported action */
        }
      };
      set('play', () => void this.play());
      set('pause', () => this.pause());
      set('nexttrack', () => void this.next());
      set('previoustrack', () => void this.prev());
      set('seekto', (e) => e.seekTime != null && this.seek(e.seekTime));
      set('seekbackward', (e) => this.seek(this.position() - (e.seekOffset ?? 10)));
      set('seekforward', (e) => this.seek(this.position() + (e.seekOffset ?? 10)));
    }
    try {
      const dur = this.duration();
      if (Number.isFinite(dur) && dur > 0 && !this.endless) ms.setPositionState?.({ duration: dur, position: Math.min(dur, this.position()), playbackRate: 1 });
    } catch {
      /* fine */
    }
  }
}
