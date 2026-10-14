// nu.scene: a mid-listen layout of every sound, the room and ñü.ÊQ, saved on this device and recalled
// without touching the audio samples. Moving a sound is a few numbers; a scene is those numbers named.
// An artist can ship a default scene later; today you save your own. Nothing leaves the device unless
// you copy a compact share code yourself.

import type { Pos } from '../../data/waves';
import type { Fx, Mode, Obj } from './engine';

export type SceneOrbit = { rate: number; radius: number; phase: number };
export type SceneObj = { key: string; label: string; pos: Pos; gone?: boolean; orbit?: SceneOrbit | null };
export type Scene = {
  id: string;
  name: string;
  /** Catalogue or local track id this scene belongs to; empty means “any current track”. */
  trackId: string;
  venue: string;
  fx: Fx;
  mode: Mode;
  objs: SceneObj[];
  created: number;
  updated: number;
};

export const capture = (
  trackId: string,
  name: string,
  venue: string,
  fx: Fx,
  mode: Mode,
  objs: Obj[],
  id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}`,
): Scene => ({
  id,
  name: name.trim() || 'untitled scene',
  trackId,
  venue,
  fx: { ...fx },
  mode,
  objs: objs.map((o) => ({
    key: o.key,
    label: o.label,
    pos: { ...o.pos },
    gone: o.gone || undefined,
    orbit: o.orbit ? { rate: o.orbit.rate, radius: o.orbit.radius, phase: o.orbit.phase } : null,
  })),
  created: Date.now(),
  updated: Date.now(),
});

/** Compact share payload (no id): about 200–800 bytes of JSON, then base64url. */
export function encodeShare(s: Scene): string {
  const bare = { n: s.name, t: s.trackId, v: s.venue, f: s.fx, m: s.mode, o: s.objs.map((x) => [x.key, +x.pos.x.toFixed(3), +x.pos.y.toFixed(3), +x.pos.z.toFixed(3), x.gone ? 1 : 0, x.orbit ? [+x.orbit.rate.toFixed(3), +x.orbit.radius.toFixed(3), +x.orbit.phase.toFixed(3)] : 0]) };
  const json = JSON.stringify(bare);
  const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64;
}

export function decodeShare(code: string): Scene | null {
  try {
    const pad = code.length % 4 === 0 ? '' : '='.repeat(4 - (code.length % 4));
    const json = decodeURIComponent(escape(atob(code.replace(/-/g, '+').replace(/_/g, '/') + pad)));
    const bare = JSON.parse(json) as {
      n: string;
      t: string;
      v: string;
      f: Fx;
      m: Mode;
      o: [string, number, number, number, number, 0 | [number, number, number]][];
    };
    return {
      id: crypto.randomUUID?.() ?? `${Date.now().toString(36)}`,
      name: bare.n || 'shared scene',
      trackId: bare.t || '',
      venue: bare.v,
      fx: bare.f,
      mode: bare.m,
      objs: bare.o.map(([key, x, y, z, gone, orb]) => ({
        key,
        label: key,
        pos: { x, y, z },
        gone: gone ? true : undefined,
        orbit: Array.isArray(orb) ? { rate: orb[0], radius: orb[1], phase: orb[2] } : null,
      })),
      created: Date.now(),
      updated: Date.now(),
    };
  } catch {
    return null;
  }
}
