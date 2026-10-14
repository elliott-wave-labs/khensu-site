// Healing sounds, generated on the device: chakra tones, singing bowls, binaural beats, noise, rain, ocean, forest
// and a creek. Each is a few lines of maths rendered into a short seamless loop or scheduled live, so there is no
// file, no download and no server. Also the room impulse every sound plays through.

import type { Generator } from '../../data/waves';

/** A room: a few early reflections, then decaying noise, slightly different in each ear. */
export function impulse(ctx: BaseAudioContext, rt: number) {
  const len = Math.ceil(Math.max(0.1, rt) * ctx.sampleRate);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const n = (Math.random() * 2 - 1) * Math.exp((-6.9 * i) / ctx.sampleRate / rt);
      lp += 0.04 * (n - lp);
      d[i] = lp;
    }
    for (let k = 1; k <= 6; k++) {
      const i = Math.floor(ctx.sampleRate * 0.007 * k * (1 + 0.13 * c));
      if (i < len) d[i] += (c ? -0.18 : 0.18) / k;
    }
  }
  return buf;
}

/** Makes a buffer loop without a seam: the last `s` seconds fade out under the first `s` seconds fading in. */
function seamless(buf: AudioBuffer, s = 0.6) {
  const n = Math.min(Math.floor(s * buf.sampleRate), Math.floor(buf.length / 2));
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    const L = d.length;
    for (let i = 0; i < n; i++) {
      const a = i / n;
      d[i] = d[i] * a + d[L - n + i] * (1 - a);
    }
  }
  // The caller trims the tail (`trimmed`) so the faded part isn't heard twice.
  return n;
}

function normalise(buf: AudioBuffer, peak = 0.5) {
  let p = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) p = Math.max(p, Math.abs(d[i]));
  }
  const g = p > 0 ? peak / p : 1;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] *= g;
  }
}

function trimmed(ctx: BaseAudioContext, buf: AudioBuffer, cut: number) {
  const out = ctx.createBuffer(buf.numberOfChannels, buf.length - cut, buf.sampleRate);
  for (let c = 0; c < buf.numberOfChannels; c++) out.copyToChannel(buf.getChannelData(c).subarray(0, buf.length - cut), c);
  return out;
}

const cache = new Map<string, AudioBuffer>();

function creek(ctx: BaseAudioContext) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 6);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < len; i++) {
    brown = brown * 0.985 + (Math.random() * 2 - 1) * 0.015;
    const swell = 0.62 + 0.38 * Math.sin((2 * Math.PI * i) / sr / 3);
    d[i] = brown * swell;
  }
  for (let n = 0; n < 22; n++) {
    const at = Math.floor(Math.random() * (len - sr * 0.04));
    const f = 500 + Math.random() * 700;
    for (let k = 0; k < sr * 0.03; k++) d[at + k] += 0.55 * Math.sin((2 * Math.PI * f * k) / sr) * Math.exp(-k / (sr * 0.007));
  }
  normalise(buf, 0.4);
  return trimmed(ctx, buf, seamless(buf, 0.5));
}

function noise(ctx: BaseAudioContext, colour: 'brown' | 'pink' | 'white') {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 10);
  const buf = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, brown = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (colour === 'white') d[i] = w;
      else if (colour === 'brown') {
        brown = (brown + 0.02 * w) / 1.02;
        d[i] = brown * 3.5;
      } else {
        // Paul Kellet's pink filter.
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    }
  }
  normalise(buf, colour === 'white' ? 0.22 : 0.42);
  return trimmed(ctx, buf, seamless(buf, 0.8));
}

function rain(ctx: BaseAudioContext) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 14);
  const buf = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    // Hiss: white noise through a gentle band.
    let hp = 0, lp = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      hp += 0.08 * (w - hp);
      const band = w - hp;
      lp += 0.35 * (band - lp);
      d[i] = lp * 0.5;
    }
    // Drops: short pings and ticks at random moments, more on the glass nearer each ear.
    const drops = 1400;
    for (let n = 0; n < drops; n++) {
      const at = Math.floor(Math.random() * (len - sr * 0.02));
      const f = 1800 + Math.random() * 4200;
      const amp = 0.08 + Math.random() * 0.35;
      const dec = sr * (0.002 + Math.random() * 0.006);
      for (let k = 0; k < sr * 0.012; k++) d[at + k] += amp * Math.sin((2 * Math.PI * f * k) / sr) * Math.exp(-k / dec);
    }
  }
  normalise(buf, 0.45);
  return trimmed(ctx, buf, seamless(buf, 0.6));
}

function ocean(ctx: BaseAudioContext) {
  const sr = ctx.sampleRate;
  const period = 11;
  const len = Math.floor(sr * period * 2);
  const buf = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let brown = 0, lp = 0;
    const phase = c * 0.35;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const w = Math.random() * 2 - 1;
      brown = (brown + 0.02 * w) / 1.02;
      lp += 0.12 * (w - lp);
      // Two overlapping waves: a slow swell and a faster break of foam on top of it.
      const swell = Math.max(0, Math.sin((2 * Math.PI * t) / period + phase)) ** 2;
      const foam = Math.max(0, Math.sin((2 * Math.PI * t) / period + phase + 0.9)) ** 6;
      d[i] = brown * 3 * (0.25 + 0.75 * swell) + lp * 0.35 * foam;
    }
  }
  normalise(buf, 0.45);
  return trimmed(ctx, buf, seamless(buf, 1.2));
}

function forest(ctx: BaseAudioContext) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 18);
  const buf = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0, lp2 = 0;
    const phase = c * 1.3;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const w = Math.random() * 2 - 1;
      lp += 0.05 * (w - lp);
      lp2 += 0.01 * (lp - lp2);
      const wind = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / 9 + phase)) * (0.6 + 0.4 * Math.sin((2 * Math.PI * t) / 4.3 + phase * 2));
      d[i] = (lp - lp2) * 1.6 * wind;
    }
    // A few birds: short frequency sweeps.
    for (let n = 0; n < 7; n++) {
      const at = Math.floor(Math.random() * (len - sr * 0.5));
      const f0 = 2400 + Math.random() * 1800;
      const f1 = f0 * (0.7 + Math.random() * 0.7);
      const chirps = 2 + Math.floor(Math.random() * 3);
      for (let ch = 0; ch < chirps; ch++) {
        const start = at + Math.floor(ch * sr * 0.14);
        const n0 = Math.floor(sr * 0.08);
        for (let k = 0; k < n0; k++) {
          const u = k / n0;
          const f = f0 + (f1 - f0) * u;
          d[start + k] += 0.07 * Math.sin(2 * Math.PI * f * (k / sr)) * Math.sin(Math.PI * u);
        }
      }
    }
  }
  normalise(buf, 0.4);
  return trimmed(ctx, buf, seamless(buf, 1));
}

function loopBuffer(ctx: BaseAudioContext, key: string, make: () => AudioBuffer) {
  let b = cache.get(key);
  if (!b || b.sampleRate !== ctx.sampleRate) {
    b = make();
    cache.set(key, b);
  }
  return b;
}

/** Hold, then fade. The attack stretches to the crossfade when one tone hands off to the next. */
export function strike(ctx: AudioContext, out: AudioNode, t: number, f: number, hold: number, fade: number, attack: number) {
  const voice = (freq: number, amp: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    const end = t + hold + fade;
    const rise = t + Math.max(0.02, Math.min(attack, hold));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, rise);
    g.gain.setValueAtTime(amp, t + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, Math.max(rise + 0.02, end));
    o.connect(g).connect(out);
    o.start(t);
    o.stop(end + 0.05);
    return o;
  };
  const a = voice(f, 0.2);
  const b = voice(f + 0.6, 0.035);
  const clang = ctx.createOscillator();
  const cg = ctx.createGain();
  clang.frequency.value = f * 6.27;
  cg.gain.setValueAtTime(0.04, t);
  cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  clang.connect(cg).connect(out);
  clang.start(t);
  clang.stop(t + 0.35);
  return [a, b, clang];
}

/** One strike of a singing bowl: inharmonic partials, each a detuned pair so it slowly beats, with a long ring. */
function bowlStrike(ctx: AudioContext, out: AudioNode, t: number, f: number, vel: number) {
  const partials = [
    [1, 1, 14],
    [2.71, 0.42, 9],
    [5.07, 0.18, 6],
    [7.9, 0.08, 4],
  ];
  const nodes: OscillatorNode[] = [];
  for (const [ratio, amp, decay] of partials) {
    for (const det of [-0.45, 0.45]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f * ratio + det * ratio;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp * 0.12 * vel, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay * (0.8 + vel * 0.4));
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + decay * 1.3);
      nodes.push(o);
    }
  }
  // The mallet: a short burst of filtered noise.
  const n = ctx.createBufferSource();
  n.buffer = loopBuffer(ctx, 'tick', () => {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.004));
    return b;
  });
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = f * 2.5;
  bp.Q.value = 2;
  const ng = ctx.createGain();
  ng.gain.value = 0.25 * vel;
  n.connect(bp).connect(ng).connect(out);
  n.start(t);
  return nodes;
}

export type Voice = {
  /** Mono or stereo output. Stereo voices (`direct`) go straight to the ears and never through a panner. */
  out: GainNode;
  channels: 1 | 2;
  start(): void;
  stop(): void;
  /** Seconds this voice plays before it ends on its own; undefined means it loops until stopped. */
  length?: number;
  /** For chakra tones: hold and fade, and the attack when handing off. */
  retune?(hold: number, fade: number, attack: number): void;
};

export async function clipBuffer(ctx: BaseAudioContext, url: string): Promise<AudioBuffer> {
  const have = cache.get(url);
  if (have) return have;
  const res = await fetch(url);
  const buf = await ctx.decodeAudioData(await res.arrayBuffer());
  cache.set(url, buf);
  return buf;
}

export function createVoice(ctx: AudioContext, gen: Generator, opts: { loop: boolean; attack?: number; clip?: AudioBuffer }): Voice {
  const out = ctx.createGain();
  const sources: AudioScheduledSourceNode[] = [];
  let timer = 0;
  let running = false;
  const stopAll = () => {
    running = false;
    clearTimeout(timer);
    for (const s of sources) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    sources.length = 0;
  };
  const looped = (key: string, make: () => AudioBuffer) => {
    const s = ctx.createBufferSource();
    s.buffer = loopBuffer(ctx, key, make);
    s.loop = true;
    s.connect(out);
    return s;
  };

  switch (gen.type) {
    case 'tone': {
      let hold = gen.hold;
      let fade = gen.fade;
      let attack = opts.attack ?? 0.04;
      const v: Voice = {
        out,
        channels: 1,
        length: hold + fade,
        start() {
          running = true;
          sources.push(...strike(ctx, out, ctx.currentTime + 0.02, gen.hz, hold, fade, attack));
          if (opts.loop) timer = window.setTimeout(() => running && v.start(), (hold + fade) * 1000 + 40);
        },
        stop: stopAll,
        retune(h, f, a) {
          hold = h;
          fade = f;
          attack = a;
          v.length = h + f;
        },
      };
      return v;
    }
    case 'bowl': {
      const v: Voice = {
        out,
        channels: 1,
        start() {
          running = true;
          const hit = () => {
            if (!running) return;
            sources.push(...bowlStrike(ctx, out, ctx.currentTime + 0.02, gen.hz, 0.7 + Math.random() * 0.3));
            timer = window.setTimeout(hit, 11_000 + Math.random() * 5_000);
          };
          hit();
        },
        stop: stopAll,
      };
      return v;
    }
    case 'binaural': {
      // Two pure tones, one per ear. The beat is the difference, heard only inside the head, so this voice is
      // stereo and bypasses the room.
      const merger = ctx.createChannelMerger(2);
      merger.connect(out);
      const v: Voice = {
        out,
        channels: 2,
        start() {
          running = true;
          for (const [hz, ch] of [
            [gen.carrier, 0],
            [gen.carrier + gen.beat, 1],
          ] as const) {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = hz;
            g.gain.value = 0.16;
            o.connect(g).connect(merger, 0, ch);
            o.start();
            sources.push(o);
          }
        },
        stop: stopAll,
      };
      return v;
    }
    case 'noise': {
      const v: Voice = {
        out,
        channels: 2,
        start() {
          running = true;
          const s = looped(`noise-${gen.colour}`, () => noise(ctx, gen.colour));
          s.start();
          sources.push(s);
        },
        stop: stopAll,
      };
      return v;
    }
    case 'rain':
    case 'ocean':
    case 'forest': {
      const make = gen.type === 'rain' ? () => rain(ctx) : gen.type === 'ocean' ? () => ocean(ctx) : () => forest(ctx);
      const v: Voice = {
        out,
        channels: 2,
        start() {
          running = true;
          const s = looped(gen.type, make);
          s.start();
          sources.push(s);
        },
        stop: stopAll,
      };
      return v;
    }
    case 'creek': {
      const v: Voice = {
        out,
        channels: 1,
        start() {
          running = true;
          const s = looped('creek', () => creek(ctx));
          s.start();
          sources.push(s);
        },
        stop: stopAll,
      };
      return v;
    }
    case 'clip': {
      const buf = opts.clip;
      const v: Voice = {
        out,
        channels: 1,
        length: buf?.duration,
        start() {
          if (!buf) return;
          running = true;
          const s = ctx.createBufferSource();
          s.buffer = buf;
          s.loop = opts.loop;
          s.connect(out);
          s.start();
          sources.push(s);
        },
        stop: stopAll,
      };
      return v;
    }
  }
}
