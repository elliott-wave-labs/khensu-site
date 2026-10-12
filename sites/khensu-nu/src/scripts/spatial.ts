// ñü.sounds player: the original 2008 stereo file and its separated instruments play in step, and a toggle
// crossfades between them. Every sound (instrument, clone, stair creak, tuning fork) runs through its own HRTF panner,
// placed where it sits in the orb, then through the room. Everything renders in the browser; nothing is sent anywhere.
import { createOrb, type Orb, type Pos } from './orb';

type Venue = { rt: number; wet: number; pre: number; pos: Record<string, Pos> };

const VENUES: Record<string, Venue> = {
  room: {
    rt: 0.45, wet: 0.12, pre: 0.004,
    pos: { drums: { x: 0, y: 1.3, z: 0 }, piano: { x: -1, y: 0.9, z: 0 }, synths: { x: 1.1, y: 0.5, z: 0.4 }, guitar: { x: 0.8, y: 1.1, z: 0.2 }, bass: { x: -0.3, y: 0.7, z: -0.4 } },
  },
  club: {
    rt: 0.9, wet: 0.2, pre: 0.012,
    pos: { drums: { x: 0, y: 2.6, z: 0.7 }, piano: { x: -1.9, y: 1.4, z: 0 }, synths: { x: 1.1, y: 0.5, z: 1.7 }, guitar: { x: 2.3, y: 1.6, z: -0.3 }, bass: { x: -0.9, y: 1, z: -0.8 } },
  },
  hall: {
    rt: 2.1, wet: 0.32, pre: 0.025,
    pos: { drums: { x: 0, y: 3.4, z: 0.9 }, piano: { x: -2.3, y: 2.6, z: 0.3 }, synths: { x: 1.4, y: 2.2, z: 1.8 }, guitar: { x: 2.6, y: 3, z: -0.1 }, bass: { x: -1.1, y: 3.2, z: -0.7 } },
  },
  stadium: {
    rt: 3.2, wet: 0.38, pre: 0.06,
    pos: { drums: { x: 0, y: 3.4, z: 1.6 }, piano: { x: -3, y: 2, z: 0.8 }, synths: { x: 2.6, y: -1.6, z: 2 }, guitar: { x: 2.4, y: 2.2, z: 1 }, bass: { x: 0, y: 2.8, z: 0.4 } },
  },
  festival: {
    rt: 1.4, wet: 0.24, pre: 0.03,
    pos: { drums: { x: 0, y: 2.6, z: 0.4 }, piano: { x: -2.4, y: -1.4, z: 1 }, synths: { x: 2.2, y: -1.4, z: 2 }, guitar: { x: 2.2, y: 1.8, z: 0.6 }, bass: { x: 0, y: 1, z: -0.5 } },
  },
};
const EXTRAS: Record<string, { label: string; pos: Pos }> = {
  // Behind you to the left, about 2 m (6–7 ft) above your ears.
  creak: { label: 'Stair creak', pos: { x: -1.4, y: -2.2, z: 2 } },
  // Just in front of the forehead.
  fork: { label: 'Third-eye fork', pos: { x: 0, y: 0.45, z: 0.25 } },
};
const MAX_R = 4; // metres to the edge of the orb
const MAX_CLONES = 12;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Room sound added on top of the clean instruments. "Match original" is tuned by ear to the 2008 file's room. */
type Fx = { gain: number; wet: number; rt: number; pre: number }; // dB, 0–100 %, seconds, milliseconds
const PRESETS: Record<string, Fx> = {
  original: { gain: 0, wet: 45, rt: 1.8, pre: 25 },
  clean: { gain: 0, wet: 0, rt: 1.8, pre: 0 },
};

/** A room impulse: a few early reflections, then decaying noise, slightly different in each ear. Pre-delay is a separate node. */
function impulse(ctx: BaseAudioContext, rt: number) {
  const len = Math.ceil(rt * ctx.sampleRate);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp((-6.9 * i) / ctx.sampleRate / rt);
    for (let k = 1; k <= 6; k++) {
      const i = Math.floor(ctx.sampleRate * 0.007 * k * (1 + 0.13 * c));
      if (i < len) d[i] += (c ? -0.6 : 0.6) / k;
    }
  }
  return buf;
}

/** One creak of a wooden stair: stick-slip friction, a run of clicks whose rate rises then falls, ringing in the wood. */
function creak(ctx: BaseAudioContext) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * (0.55 + Math.random() * 0.35));
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const modes = [
    { f: 480 + Math.random() * 120, a: 1 },
    { f: 1150 + Math.random() * 200, a: 0.6 },
    { f: 2300 + Math.random() * 300, a: 0.3 },
  ];
  const peak = 55 + Math.random() * 40;
  let t = 0;
  while (t < len / sr) {
    const k = t / (len / sr);
    const rate = 18 + peak * Math.sin(Math.PI * k);
    const amp = Math.sin(Math.PI * k) ** 0.6 * (0.6 + Math.random() * 0.4);
    const start = Math.floor(t * sr);
    for (const m of modes) {
      for (let i = 0; i < sr * 0.012 && start + i < len; i++) {
        d[start + i] += amp * m.a * Math.sin((2 * Math.PI * m.f * i) / sr) * Math.exp(-i / (sr * 0.0025));
      }
    }
    t += 1 / rate;
  }
  for (let i = 0; i < len; i++) d[i] *= 0.25;
  return buf;
}

/** One strike of a tuning fork: a long pure tone, a faint second tine beating against it, and a short metallic clang. */
function strike(ctx: AudioContext, out: AudioNode, t: number, f: number) {
  const tone = (freq: number, amp: number, decay: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + decay + 0.05);
  };
  tone(f, 0.32, 7.5);
  tone(f + 0.6, 0.06, 6.5);
  tone(f * 6.27, 0.07, 0.35);
}

type Kind = 'stem' | 'creak' | 'fork';
type Obj = {
  key: string;
  kind: Kind;
  stem?: string; // which instrument a stem or its clone plays
  label: string;
  node: HTMLButtonElement;
  pos: Pos;
  el?: HTMLAudioElement;
  panner?: PannerNode;
  meter?: AnalyserNode;
  out?: GainNode; // synth sounds feed this
  timer?: number;
  clone: boolean;
};

const root = document.querySelector<HTMLElement>('[data-spatial]');
if (root) {
  const orig = root.querySelector<HTMLAudioElement>('[data-orig]')!;
  const play = root.querySelector<HTMLButtonElement>('[data-play]')!;
  const seek = root.querySelector<HTMLInputElement>('[data-seek]')!;
  const loopBtn = root.querySelector<HTMLButtonElement>('[data-loop]')!;
  const cur = root.querySelector<HTMLElement>('[data-cur]')!;
  const dur = root.querySelector<HTMLElement>('[data-dur]')!;
  const label = root.querySelector<HTMLElement>('[data-label]')!;
  const modeBtns = [...root.querySelectorAll<HTMLButtonElement>('[data-mode]')];
  const venueBtns = [...root.querySelectorAll<HTMLButtonElement>('[data-venue]')];
  const ring = root.querySelector<HTMLElement>('[data-ring]')!;
  const canvas = ring.querySelector<HTMLCanvasElement>('[data-orb]')!;
  const template = ring.querySelector<HTMLTemplateElement>('[data-node-template]')!;
  const dirs = [...ring.querySelectorAll<HTMLElement>('[data-dir]')];
  const height = root.querySelector<HTMLInputElement>('[data-height]')!;
  const heightOut = root.querySelector<HTMLElement>('[data-height-out]')!;
  const picked = root.querySelector<HTMLElement>('[data-picked]')!;
  const extraBtns = [...root.querySelectorAll<HTMLButtonElement>('[data-extra]')];
  const cloneBtn = root.querySelector<HTMLButtonElement>('[data-clone]')!;
  const removeBtn = root.querySelector<HTMLButtonElement>('[data-remove]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const fxBox = root.querySelector<HTMLElement>('[data-fx]')!;
  const fxIn = {
    gain: fxBox.querySelector<HTMLInputElement>('[data-fx-gain]')!,
    wet: fxBox.querySelector<HTMLInputElement>('[data-fx-wet]')!,
    rt: fxBox.querySelector<HTMLInputElement>('[data-fx-rt]')!,
    pre: fxBox.querySelector<HTMLInputElement>('[data-fx-pre]')!,
  };
  const presetBtns = [...fxBox.querySelectorAll<HTMLButtonElement>('[data-preset]')];
  const fx: Fx = { ...PRESETS.original };

  let mode: 'wave' | 'orig' = 'wave';
  let venue = 'club';
  let started = false;
  let serial = 0;

  const objs: Obj[] = [...ring.querySelectorAll<HTMLButtonElement>('.sp-node[data-node]')].map((node) => {
    const stem = node.dataset.node!;
    return {
      key: stem,
      kind: 'stem' as Kind,
      stem,
      label: node.dataset.label!,
      node,
      pos: { ...VENUES[venue].pos[stem] },
      el: root.querySelector<HTMLAudioElement>(`[data-stem="${stem}"]`)!,
      clone: false,
    };
  });
  let selected = objs[0];

  let ctx: AudioContext | null = null;
  let origGain: GainNode, waveGain: GainNode, dry: GainNode, wet: GainNode, verb: ConvolverNode;
  let bus: GainNode, sum: GainNode, makeup: GainNode, user: GainNode, preDelay: DelayNode, extrasDry: GainNode;
  let origMeter: AnalyserNode, waveMeter: AnalyserNode;
  let origPow = 0;
  let wavePow = 0;
  let builtRt = 0;
  const meterBuf = new Float32Array(1024);

  const panner = (c: AudioContext) =>
    new PannerNode(c, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 1.5, rolloffFactor: 0.7 });

  /** Wires one sound into the graph: stems and their clones into the song's bus, synth sounds alongside it. */
  const wire = (o: Obj) => {
    if (!ctx || o.panner) return;
    o.panner = panner(ctx);
    o.meter = ctx.createAnalyser();
    o.meter.fftSize = 1024;
    if (o.kind === 'stem') {
      const src = ctx.createMediaElementSource(o.el!);
      src.connect(o.panner).connect(bus);
      src.connect(o.meter);
    } else {
      o.out = ctx.createGain();
      o.out.connect(o.panner);
      o.out.connect(o.meter);
      // Extras sit in the same room, and stay audible when you switch to the original.
      o.panner.connect(extrasDry);
      o.panner.connect(preDelay);
    }
    place(o);
  };

  const graph = () => {
    if (ctx) return ctx;
    ctx = new AudioContext({ latencyHint: 'playback' });
    origGain = ctx.createGain();
    waveGain = ctx.createGain();
    dry = ctx.createGain();
    wet = ctx.createGain();
    verb = ctx.createConvolver();
    bus = ctx.createGain();
    sum = ctx.createGain();
    makeup = ctx.createGain();
    user = ctx.createGain();
    extrasDry = ctx.createGain();
    preDelay = ctx.createDelay(0.5);
    origMeter = ctx.createAnalyser();
    waveMeter = ctx.createAnalyser();
    origMeter.fftSize = waveMeter.fftSize = 2048;
    const o = ctx.createMediaElementSource(orig);
    o.connect(origGain).connect(ctx.destination);
    o.connect(origMeter);
    // Instruments → room (dry + pre-delay → reverb) → loudness match → your gain → mode crossfade.
    bus.connect(dry).connect(sum);
    bus.connect(preDelay).connect(verb).connect(wet).connect(sum);
    sum.connect(waveMeter);
    sum.connect(makeup).connect(user).connect(waveGain).connect(ctx.destination);
    extrasDry.connect(ctx.destination);
    for (const x of objs) wire(x);
    room();
    mix(true);
    return ctx;
  };

  // MARK: Room and effects

  const fxText = () => {
    const out = (k: string, v: string) => (fxBox.querySelector<HTMLElement>(`[data-fx-out="${k}"]`)!.textContent = v);
    out('gain', `${fx.gain > 0 ? '+' : ''}${fx.gain} dB`);
    out('wet', `${Math.round(fx.wet)}%`);
    out('rt', `${fx.rt.toFixed(1)} s`);
    out('pre', `${Math.round(fx.pre)} ms`);
    fxIn.gain.value = String(fx.gain);
    fxIn.wet.value = String(fx.wet);
    fxIn.rt.value = String(fx.rt);
    fxIn.pre.value = String(fx.pre);
  };

  let rtTimer = 0;
  const room = () => {
    fxText();
    if (!ctx) return;
    const t = ctx.currentTime;
    const w = (fx.wet / 100) * 0.8;
    wet.gain.setTargetAtTime(w, t, 0.08);
    dry.gain.setTargetAtTime(1 - w * 0.5, t, 0.08);
    extrasDry.gain.setTargetAtTime(1 - w * 0.5, t, 0.08);
    preDelay.delayTime.setTargetAtTime(fx.pre / 1000, t, 0.03);
    user.gain.setTargetAtTime(10 ** (fx.gain / 20), t, 0.05);
    if (fx.rt !== builtRt) {
      clearTimeout(rtTimer);
      rtTimer = window.setTimeout(() => {
        builtRt = fx.rt;
        verb.buffer = impulse(ctx!, fx.rt);
      }, builtRt ? 120 : 0);
    }
  };

  const preset = (name: string | null) => {
    for (const b of presetBtns) b.setAttribute('aria-pressed', String(b.dataset.preset === name));
  };

  const level = (a: AnalyserNode) => {
    a.getFloatTimeDomainData(meterBuf);
    let s = 0;
    for (let i = 0; i < meterBuf.length; i++) s += meterBuf[i] * meterBuf[i];
    return s / meterBuf.length;
  };
  /** Keeps ñü.wẽævẽß at the original's loudness: both play in step all the time, so their levels can be compared live. */
  const matchLoudness = () => {
    if (!ctx || master().paused) return;
    const po = level(origMeter);
    const pw = level(waveMeter);
    if (po < 1e-6 || pw < 1e-6) return;
    origPow = origPow ? origPow * 0.98 + po * 0.02 : po;
    wavePow = wavePow ? wavePow * 0.98 + pw * 0.02 : pw;
    const k = Math.min(8, Math.max(0.25, Math.sqrt(origPow / wavePow)));
    makeup.gain.setTargetAtTime(k, ctx.currentTime, 0.4);
  };

  const mix = (now = false) => {
    if (!ctx) return;
    const t = ctx.currentTime;
    const k = now ? 0.001 : 0.12;
    origGain.gain.setTargetAtTime(mode === 'orig' ? 1 : 0, t, k);
    waveGain.gain.setTargetAtTime(mode === 'wave' ? 1 : 0, t, k);
  };

  // MARK: Placing sounds

  const clamp = (p: Pos) => {
    const d = Math.hypot(p.x, p.y, p.z);
    if (d > MAX_R) {
      p.x *= MAX_R / d;
      p.y *= MAX_R / d;
      p.z *= MAX_R / d;
    }
  };

  const place = (o: Obj) => {
    const p = o.pos;
    const r = Math.hypot(p.x, p.y);
    const deg = Math.round(((Math.atan2(p.x, p.y) * 180) / Math.PI + 360) % 360);
    o.node.setAttribute('aria-label', `${o.label}: ${r.toFixed(1)} m away, ${deg}° clockwise from ahead, ${p.z >= 0 ? '+' : ''}${p.z.toFixed(1)} m high`);
    if (o.panner && ctx) {
      const t = ctx.currentTime;
      o.panner.positionX.setTargetAtTime(p.x, t, 0.03);
      o.panner.positionY.setTargetAtTime(p.z, t, 0.03);
      o.panner.positionZ.setTargetAtTime(-p.y, t, 0.03);
    }
  };

  const select = (o: Obj) => {
    selected = o;
    for (const x of objs) x.node.setAttribute('aria-pressed', String(x === o));
    height.value = String(o.pos.z);
    heightOut.textContent = `${o.label} · ${o.pos.z >= 0 ? '+' : ''}${o.pos.z.toFixed(1)} m`;
    removeBtn.hidden = !(o.clone || o.kind !== 'stem');
  };

  // MARK: Clones and extra sounds

  const makeNode = (labelText: string) => {
    const node = template.content.firstElementChild!.cloneNode(true) as HTMLButtonElement;
    node.querySelector('span')!.textContent = labelText;
    ring.append(node);
    return node;
  };

  const startSynth = (o: Obj) => {
    if (!ctx || o.timer) return;
    const run = () => {
      if (!ctx || !o.out) return;
      const t = ctx.currentTime + 0.05;
      if (o.kind === 'fork') {
        strike(ctx, o.out, t, 221.23);
        o.timer = window.setTimeout(run, 7000);
      } else {
        // Two or three steps, one creak each, then a pause.
        const steps = 2 + Math.floor(Math.random() * 2);
        let at = t;
        for (let i = 0; i < steps; i++) {
          const s = ctx.createBufferSource();
          s.buffer = creak(ctx);
          s.connect(o.out);
          s.start(at);
          at += s.buffer.duration + 0.25 + Math.random() * 0.3;
        }
        o.timer = window.setTimeout(run, (at - t) * 1000 + 3500 + Math.random() * 3000);
      }
    };
    run();
  };

  const addObj = (o: Obj) => {
    objs.push(o);
    bind(o);
    if (ctx) wire(o);
    select(o);
  };

  const addExtra = async (kind: 'creak' | 'fork', pos?: Pos, clone = false) => {
    graph();
    await ctx!.resume();
    const e = EXTRAS[kind];
    const n = objs.filter((x) => x.kind === kind).length;
    const labelText = n ? `${e.label} ${n + 1}` : e.label;
    const o: Obj = { key: `${kind}-${++serial}`, kind, label: labelText, node: makeNode(labelText), pos: { ...(pos ?? e.pos) }, clone };
    addObj(o);
    startSynth(o);
    return o;
  };

  const removeObj = (o: Obj) => {
    if (!o.clone && o.kind === 'stem') return;
    clearTimeout(o.timer);
    o.el?.pause();
    o.panner?.disconnect();
    o.out?.disconnect();
    o.node.remove();
    objs.splice(objs.indexOf(o), 1);
    if (o.el) o.el.remove();
    syncExtras();
    select(objs[0]);
  };

  const syncExtras = () => {
    for (const b of extraBtns) b.setAttribute('aria-pressed', String(objs.some((x) => x.kind === b.dataset.extra)));
  };

  const cloneSelected = async () => {
    if (objs.filter((x) => x.clone).length >= MAX_CLONES) return;
    const s = selected;
    const offset = { x: s.pos.x + 0.6, y: s.pos.y - 0.4, z: s.pos.z + 0.3 };
    clamp(offset);
    if (s.kind !== 'stem') {
      await addExtra(s.kind, offset, true);
      return;
    }
    const src = s.el!;
    const el = src.cloneNode() as HTMLAudioElement;
    el.removeAttribute('data-stem');
    el.preload = 'auto';
    el.loop = orig.loop;
    root.append(el);
    const n = objs.filter((x) => x.stem === s.stem).length;
    const base = objs.find((x) => x.stem === s.stem && !x.clone)!.label;
    const labelText = `${base} ${n + 1}`;
    addObj({ key: `${s.stem}-${++serial}`, kind: 'stem', stem: s.stem, label: labelText, node: makeNode(labelText), pos: offset, el, clone: true });
    el.currentTime = orig.currentTime;
    if (!orig.paused) {
      graph();
      el.play().catch(() => {});
    }
  };

  // MARK: Transport

  const songEls = () => [orig, ...objs.filter((o) => o.kind === 'stem').map((o) => o.el!)];
  const master = () => orig;

  const showLabel = () => {
    const m = master();
    const t = !started ? 'Next up' : m.paused ? (m.ended ? 'Played' : 'Paused') : m.readyState < 3 ? 'Loading' : 'Now playing';
    if (label.textContent !== t) label.textContent = t;
  };

  const state = () => {
    const m = master();
    const st = !m.paused ? 'pause' : m.ended ? 'replay' : 'play';
    play.dataset.state = st;
    play.setAttribute('aria-label', { play: 'Play', pause: 'Pause', replay: 'Play again' }[st]);
    showLabel();
  };

  let dragging = false;
  let lastSync = 0;
  const bar = (t: number) => {
    seek.value = String(t);
    seek.style.setProperty('--p', `${(t / (Number(seek.max) || 1)) * 100}%`);
  };

  // MARK: Orb and render loop

  const orb: Orb | null = createOrb(canvas, MAX_R);
  if (!orb) canvas.remove();
  const DIRS: Record<string, Pos> = {
    ahead: { x: 0, y: MAX_R * 1.12, z: 0 },
    behind: { x: 0, y: -MAX_R * 1.12, z: 0 },
    above: { x: 0, y: 0, z: MAX_R * 1.1 },
    below: { x: 0, y: 0, z: -MAX_R * 1.1 },
  };
  const levels = new Map<Obj, number>();
  let swell = 0;
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(ring);

  const frame = (now: number) => {
    const m = master();
    if (!dragging) bar(m.currentTime);
    cur.textContent = mmss(m.currentTime);
    matchLoudness();
    if (now - lastSync > 500) {
      lastSync = now;
      for (const el of songEls()) if (el !== m && !m.paused && Math.abs(el.currentTime - m.currentTime) > 0.05) el.currentTime = m.currentTime;
    }
    let total = 0;
    for (const o of objs) {
      let v = 0;
      const live = o.kind === 'stem' ? mode === 'wave' && !m.paused : true;
      if (o.meter && live) {
        const db = 10 * Math.log10(level(o.meter) + 1e-12);
        v = Math.max(0, Math.min(1, (db + 62) / 44));
      }
      const smooth = (levels.get(o) ?? 0) * 0.7 + v * 0.3;
      levels.set(o, smooth);
      total += smooth;
    }
    swell = swell * 0.85 + Math.min(1, total / 3) * 0.15;
    if (orb && visible) {
      const motion = !reduce.matches;
      orb.frame(motion ? now / 1000 : 0, objs.map((o) => ({ pos: o.pos, level: motion ? levels.get(o) ?? 0 : 0 })), motion ? swell : 0);
      for (const o of objs) {
        const p = orb.project(o.pos);
        o.node.style.left = `${p.x}px`;
        o.node.style.top = `${p.y}px`;
        o.node.style.zIndex = String(1 + Math.round(p.near * 10));
        o.node.style.setProperty('--near', p.near.toFixed(3));
        o.node.style.setProperty('--lvl', reduce.matches ? '0' : (levels.get(o) ?? 0).toFixed(3));
      }
      for (const d of dirs) {
        const p = orb.project(DIRS[d.dataset.dir!]);
        d.style.left = `${p.x}px`;
        d.style.top = `${p.y}px`;
      }
    }
    showLabel();
    requestAnimationFrame(frame);
  };

  // MARK: Events

  play.addEventListener('click', async () => {
    const m = master();
    if (m.paused) {
      graph();
      await ctx!.resume();
      if (m.ended) for (const el of songEls()) el.currentTime = 0;
      for (const el of songEls()) {
        el.preload = 'auto';
        el.currentTime = m.currentTime;
      }
      started = true;
      await Promise.allSettled(songEls().map((el) => el.play()));
    } else {
      for (const el of songEls()) el.pause();
    }
  });
  for (const ev of ['play', 'pause', 'ended', 'waiting', 'playing'] as const) orig.addEventListener(ev, state);
  orig.addEventListener('ended', () => {
    if (orig.loop) return;
    for (const el of songEls()) el.pause();
  });
  orig.addEventListener('loadedmetadata', () => {
    seek.max = String(orig.duration);
    dur.textContent = mmss(orig.duration);
  });
  seek.addEventListener('input', () => {
    dragging = true;
    bar(Number(seek.value));
    cur.textContent = mmss(Number(seek.value));
  });
  seek.addEventListener('change', () => {
    dragging = false;
    for (const el of songEls()) {
      if (el.readyState === 0) el.preload = 'auto';
      el.currentTime = Number(seek.value);
    }
  });
  loopBtn.addEventListener('click', () => {
    const on = !orig.loop;
    for (const el of songEls()) el.loop = on;
    loopBtn.setAttribute('aria-pressed', String(on));
  });

  for (const b of modeBtns)
    b.addEventListener('click', () => {
      mode = b.dataset.mode as 'wave' | 'orig';
      for (const x of modeBtns) x.setAttribute('aria-pressed', String(x === b));
      root.dataset.mode = mode;
      mix();
    });

  for (const b of venueBtns)
    b.addEventListener('click', () => {
      venue = b.dataset.venue!;
      for (const x of venueBtns) x.setAttribute('aria-pressed', String(x === b));
      for (const o of objs) {
        if (o.kind === 'stem' && !o.clone) {
          Object.assign(o.pos, VENUES[venue].pos[o.stem!]);
          place(o);
        }
      }
      select(selected);
      picked.hidden = venue !== 'club';
      const v = VENUES[venue];
      Object.assign(fx, { wet: Math.round((v.wet / 0.8) * 100), rt: v.rt, pre: Math.round(v.pre * 1000) });
      preset(null);
      room();
    });

  for (const b of extraBtns)
    b.addEventListener('click', async () => {
      const kind = b.dataset.extra as 'creak' | 'fork';
      const have = objs.filter((x) => x.kind === kind);
      if (have.length) for (const o of have) removeObj(o);
      else await addExtra(kind);
      syncExtras();
    });
  cloneBtn.addEventListener('click', () => void cloneSelected());
  removeBtn.addEventListener('click', () => removeObj(selected));

  // Drag a sound anywhere in the orb; drag the orb itself to look around.
  let held: Obj | null = null;
  let orbiting: { x: number; y: number } | null = null;
  addEventListener('pointermove', (e) => {
    if (held && orb) {
      held.pos = orb.drag(e.clientX, e.clientY, held.pos);
      clamp(held.pos);
      place(held);
      select(held);
    } else if (orbiting && orb) {
      orb.orbit(e.clientX - orbiting.x, e.clientY - orbiting.y);
      orbiting = { x: e.clientX, y: e.clientY };
    }
  });
  const release = () => {
    held?.node.classList.remove('drag');
    held = null;
    orbiting = null;
  };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    orbiting = { x: e.clientX, y: e.clientY };
  });

  function bind(o: Obj) {
    o.node.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      select(o);
      held = o;
      o.node.classList.add('drag');
    });
    o.node.addEventListener('keydown', (e) => {
      const p = o.pos;
      const step = e.shiftKey ? 0.5 : 0.1;
      const k: Record<string, () => void> = {
        ArrowLeft: () => (p.x -= step),
        ArrowRight: () => (p.x += step),
        ArrowUp: () => (p.y += step),
        ArrowDown: () => (p.y -= step),
        PageUp: () => (p.z = Math.min(3, p.z + step)),
        PageDown: () => (p.z = Math.max(-3, p.z - step)),
        Delete: () => removeObj(o),
        Backspace: () => removeObj(o),
      };
      if (!k[e.key]) return;
      e.preventDefault();
      k[e.key]();
      clamp(p);
      place(o);
      if (objs.includes(o)) select(o);
    });
    o.node.addEventListener('focus', () => select(o));
  }
  for (const o of objs) bind(o);

  height.addEventListener('input', () => {
    selected.pos.z = Number(height.value);
    clamp(selected.pos);
    place(selected);
    select(selected);
  });

  for (const b of presetBtns)
    b.addEventListener('click', () => {
      Object.assign(fx, PRESETS[b.dataset.preset!]);
      preset(b.dataset.preset!);
      room();
    });
  for (const [k, el] of Object.entries(fxIn))
    el.addEventListener('input', () => {
      fx[k as keyof Fx] = Number(el.value);
      preset(null);
      room();
    });

  for (const o of objs) place(o);
  select(objs[0]);
  fxText();
  state();
  requestAnimationFrame(frame);
}
