// ñü.sounds player: the original 2008 stereo file and its separated instruments play in step, and a toggle
// crossfades between them. Each instrument runs through its own HRTF panner, placed where its node sits on the
// ring, then through the chosen venue's room. Everything renders in the browser; nothing is sent anywhere.

type Pos = { x: number; y: number; z: number }; // metres: x right, y ahead, z up
type Venue = { rt: number; wet: number; pre: number; pos: Record<string, Pos> };

const VENUES: Record<string, Venue> = {
  room: {
    rt: 0.45, wet: 0.12, pre: 0.004,
    pos: { drums: { x: 0, y: 1.3, z: 0 }, piano: { x: -1, y: 0.9, z: 0 }, synths: { x: 1.1, y: 0.5, z: 0.2 }, guitar: { x: 0.8, y: 1.1, z: 0 }, bass: { x: -0.3, y: 0.7, z: -0.2 } },
  },
  club: {
    rt: 0.9, wet: 0.2, pre: 0.012,
    pos: { drums: { x: 0, y: 2.3, z: 0.1 }, piano: { x: -1.7, y: 1.6, z: 0 }, synths: { x: 1.9, y: 0.6, z: 0.5 }, guitar: { x: 1.3, y: 2, z: 0 }, bass: { x: 0, y: 1.2, z: -0.2 } },
  },
  hall: {
    rt: 2.1, wet: 0.32, pre: 0.025,
    pos: { drums: { x: 0, y: 3.4, z: 0.6 }, piano: { x: -2.2, y: 2.8, z: 0.3 }, synths: { x: 2.4, y: 2.6, z: 1 }, guitar: { x: 1.2, y: 3, z: 0.3 }, bass: { x: -0.8, y: 3.2, z: 0.3 } },
  },
  stadium: {
    rt: 3.2, wet: 0.38, pre: 0.06,
    pos: { drums: { x: 0, y: 3.8, z: 1.2 }, piano: { x: -3, y: 2.4, z: 0.8 }, synths: { x: 3, y: -1.6, z: 1.6 }, guitar: { x: 2.6, y: 2.6, z: 0.8 }, bass: { x: 0, y: 2.8, z: 0.4 } },
  },
  festival: {
    rt: 1.4, wet: 0.24, pre: 0.03,
    pos: { drums: { x: 0, y: 2.6, z: 0.4 }, piano: { x: -2.4, y: -1.4, z: 1 }, synths: { x: 2.4, y: -1.4, z: 1.4 }, guitar: { x: 2.2, y: 1.8, z: 0.4 }, bass: { x: 0, y: 1, z: 0 } },
  },
};
const MAX_R = 4; // metres to the edge of the ring
const RING_PX = 190; // ring radius in the SVG's 400-unit box
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** A room impulse: a few early reflections, then decaying noise, slightly different in each ear. */
function impulse(ctx: BaseAudioContext, v: Venue) {
  const len = Math.ceil((v.rt + v.pre) * ctx.sampleRate);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    const p = Math.floor(v.pre * ctx.sampleRate);
    for (let i = p; i < len; i++) {
      const t = (i - p) / ctx.sampleRate;
      d[i] = (Math.random() * 2 - 1) * Math.exp((-6.9 * t) / v.rt);
    }
    for (let k = 1; k <= 6; k++) {
      const i = p + Math.floor(ctx.sampleRate * 0.007 * k * (1 + 0.13 * c));
      if (i < len) d[i] += (c ? -0.6 : 0.6) / k;
    }
  }
  return buf;
}

const root = document.querySelector<HTMLElement>('[data-spatial]');
if (root) {
  const orig = root.querySelector<HTMLAudioElement>('[data-orig]')!;
  const stems = [...root.querySelectorAll<HTMLAudioElement>('[data-stem]')];
  const play = root.querySelector<HTMLButtonElement>('[data-play]')!;
  const seek = root.querySelector<HTMLInputElement>('[data-seek]')!;
  const loopBtn = root.querySelector<HTMLButtonElement>('[data-loop]')!;
  const cur = root.querySelector<HTMLElement>('[data-cur]')!;
  const dur = root.querySelector<HTMLElement>('[data-dur]')!;
  const label = root.querySelector<HTMLElement>('[data-label]')!;
  const modeBtns = [...root.querySelectorAll<HTMLButtonElement>('[data-mode]')];
  const venueBtns = [...root.querySelectorAll<HTMLButtonElement>('[data-venue]')];
  const ring = root.querySelector<HTMLElement>('[data-ring]')!;
  const nodes = [...ring.querySelectorAll<HTMLButtonElement>('[data-node]')];
  const height = root.querySelector<HTMLInputElement>('[data-height]')!;
  const heightOut = root.querySelector<HTMLElement>('[data-height-out]')!;
  const picked = root.querySelector<HTMLElement>('[data-picked]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let mode: 'wave' | 'orig' = 'wave';
  let venue = 'club';
  let started = false;
  let selected = nodes[0];
  const pos: Record<string, Pos> = structuredClone(VENUES[venue].pos);

  let ctx: AudioContext | null = null;
  let origGain: GainNode, waveGain: GainNode, dry: GainNode, wet: GainNode, verb: ConvolverNode;
  const panners: Record<string, PannerNode> = {};
  const meters: Record<string, AnalyserNode> = {};
  const meterBuf = new Float32Array(1024);

  const graph = () => {
    if (ctx) return ctx;
    ctx = new AudioContext({ latencyHint: 'playback' });
    origGain = ctx.createGain();
    waveGain = ctx.createGain();
    dry = ctx.createGain();
    wet = ctx.createGain();
    verb = ctx.createConvolver();
    ctx.createMediaElementSource(orig).connect(origGain).connect(ctx.destination);
    waveGain.connect(dry).connect(ctx.destination);
    waveGain.connect(verb).connect(wet).connect(ctx.destination);
    for (const el of stems) {
      const name = el.dataset.stem!;
      const p = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 1.5, rolloffFactor: 0.7 });
      const m = ctx.createAnalyser();
      m.fftSize = 1024;
      const src = ctx.createMediaElementSource(el);
      src.connect(p).connect(waveGain);
      src.connect(m);
      panners[name] = p;
      meters[name] = m;
    }
    room();
    for (const n of nodes) place(n.dataset.node!);
    mix(true);
    return ctx;
  };

  const room = () => {
    const v = VENUES[venue];
    if (!ctx) return;
    verb.buffer = impulse(ctx, v);
    const t = ctx.currentTime;
    wet.gain.setTargetAtTime(v.wet, t, 0.1);
    dry.gain.setTargetAtTime(1 - v.wet * 0.5, t, 0.1);
  };

  const mix = (now = false) => {
    if (!ctx) return;
    const t = ctx.currentTime;
    const k = now ? 0.001 : 0.12;
    origGain.gain.setTargetAtTime(mode === 'orig' ? 1 : 0, t, k);
    waveGain.gain.setTargetAtTime(mode === 'wave' ? 1 : 0, t, k);
  };

  const place = (name: string) => {
    const p = pos[name];
    const n = nodes.find((x) => x.dataset.node === name)!;
    const s = RING_PX / MAX_R;
    n.style.left = `${((200 + p.x * s) / 400) * 100}%`;
    n.style.top = `${((200 - p.y * s) / 400) * 100}%`;
    n.style.setProperty('--z', String(p.z));
    const r = Math.hypot(p.x, p.y);
    const deg = Math.round(((Math.atan2(p.x, p.y) * 180) / Math.PI + 360) % 360);
    n.setAttribute('aria-label', `${n.dataset.label}: ${r.toFixed(1)} m away, ${deg}° clockwise from ahead, ${p.z >= 0 ? '+' : ''}${p.z.toFixed(1)} m high`);
    const pn = panners[name];
    if (pn && ctx) {
      const t = ctx.currentTime;
      pn.positionX.setTargetAtTime(p.x, t, 0.03);
      pn.positionY.setTargetAtTime(p.z, t, 0.03);
      pn.positionZ.setTargetAtTime(-p.y, t, 0.03);
    }
  };

  const select = (n: HTMLButtonElement) => {
    selected = n;
    for (const x of nodes) x.setAttribute('aria-pressed', String(x === n));
    height.value = String(pos[n.dataset.node!].z);
    heightOut.textContent = `${n.dataset.label} · ${Number(height.value) >= 0 ? '+' : ''}${Number(height.value).toFixed(1)} m`;
  };

  const all = () => [orig, ...stems];
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

  let raf = 0;
  let dragging = false;
  let lastSync = 0;
  const bar = (t: number) => {
    seek.value = String(t);
    seek.style.setProperty('--p', `${(t / (Number(seek.max) || 1)) * 100}%`);
  };
  const tick = (now: number) => {
    const m = master();
    if (!dragging) bar(m.currentTime);
    cur.textContent = mmss(m.currentTime);
    if (now - lastSync > 500) {
      lastSync = now;
      for (const el of stems) if (Math.abs(el.currentTime - m.currentTime) > 0.05) el.currentTime = m.currentTime;
    }
    for (const n of nodes) {
      const a = meters[n.dataset.node!];
      let v = 0;
      if (a && mode === 'wave' && !m.paused) {
        a.getFloatTimeDomainData(meterBuf);
        let s = 0;
        for (let i = 0; i < meterBuf.length; i++) s += meterBuf[i] * meterBuf[i];
        const db = 10 * Math.log10(s / meterBuf.length + 1e-12);
        v = Math.max(0, Math.min(1, (db + 62) / 44));
      }
      n.style.setProperty('--lvl', reduce.matches ? '0' : v.toFixed(3));
    }
    showLabel();
    raf = requestAnimationFrame(tick);
  };

  play.addEventListener('click', async () => {
    const m = master();
    if (m.paused) {
      graph();
      await ctx!.resume();
      if (m.ended) for (const el of all()) el.currentTime = 0;
      for (const el of all()) {
        el.preload = 'auto';
        el.currentTime = m.currentTime;
      }
      started = true;
      await Promise.allSettled(all().map((el) => el.play()));
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    } else {
      for (const el of all()) el.pause();
    }
  });
  for (const ev of ['play', 'pause', 'ended', 'waiting', 'playing'] as const) orig.addEventListener(ev, state);
  orig.addEventListener('ended', () => {
    for (const el of stems) el.pause();
    if (orig.loop) return;
    cancelAnimationFrame(raf);
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
    for (const el of all()) {
      if (el.readyState === 0) el.preload = 'auto';
      el.currentTime = Number(seek.value);
    }
  });
  loopBtn.addEventListener('click', () => {
    const on = !orig.loop;
    for (const el of all()) el.loop = on;
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
      Object.assign(pos, structuredClone(VENUES[venue].pos));
      for (const n of nodes) place(n.dataset.node!);
      select(selected);
      picked.hidden = venue !== 'club';
      room();
    });

  // Drag a node anywhere on the ring: distance from the centre is how far away it plays, up to 4 m.
  let held: HTMLButtonElement | null = null;
  addEventListener('pointermove', (e) => {
    if (!held) return;
    const r = ring.getBoundingClientRect();
    const s = (r.width / 400) * (RING_PX / MAX_R);
    let x = (e.clientX - (r.left + r.width / 2)) / s;
    let y = -(e.clientY - (r.top + r.height / 2)) / s;
    const d = Math.hypot(x, y);
    if (d > MAX_R) {
      x *= MAX_R / d;
      y *= MAX_R / d;
    }
    const p = pos[held.dataset.node!];
    p.x = x;
    p.y = y;
    place(held.dataset.node!);
  });
  const release = () => {
    held?.classList.remove('drag');
    held = null;
  };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  for (const n of nodes) {
    n.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      select(n);
      held = n;
      n.classList.add('drag');
    });
    n.addEventListener('keydown', (e) => {
      const p = pos[n.dataset.node!];
      const step = e.shiftKey ? 0.5 : 0.1;
      const k: Record<string, () => void> = {
        ArrowLeft: () => (p.x -= step),
        ArrowRight: () => (p.x += step),
        ArrowUp: () => (p.y += step),
        ArrowDown: () => (p.y -= step),
        PageUp: () => (p.z = Math.min(3, p.z + step)),
        PageDown: () => (p.z = Math.max(-1.5, p.z - step)),
      };
      if (!k[e.key]) return;
      e.preventDefault();
      k[e.key]();
      const d = Math.hypot(p.x, p.y);
      if (d > MAX_R) {
        p.x *= MAX_R / d;
        p.y *= MAX_R / d;
      }
      place(n.dataset.node!);
      select(n);
    });
    n.addEventListener('focus', () => select(n));
  }
  height.addEventListener('input', () => {
    pos[selected.dataset.node!].z = Number(height.value);
    place(selected.dataset.node!);
    select(selected);
  });

  for (const n of nodes) place(n.dataset.node!);
  select(nodes[0]);
  state();
}
