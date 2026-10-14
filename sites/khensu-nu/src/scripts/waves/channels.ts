// Live channels are programmes pinned to the clock. There is no server deciding what plays: every device computes
// the same position from the same epoch, so everyone who tunes in hears the same moment, and nobody can seek.

import type { Channel, ProgrammeItem } from '../../data/waves';

export type OnAir = {
  item: ProgrammeItem;
  index: number;
  /** Seconds into the item. */
  offset: number;
  /** Seconds until the next item starts. */
  remaining: number;
  /** Wall-clock ms when this item started. */
  startedAt: number;
  next: ProgrammeItem;
};

export function programmeLength(ch: Channel) {
  return (ch.programme ?? []).reduce((s, it) => s + it.dur, 0);
}

export function onAir(ch: Channel, now = Date.now()): OnAir | null {
  const items = ch.programme ?? [];
  const total = programmeLength(ch);
  if (!items.length || !total || ch.epoch == null) return null;
  let t = ((now - ch.epoch) / 1000) % total;
  if (t < 0) t += total;
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (t < acc + it.dur) {
      const offset = t - acc;
      return {
        item: it,
        index: i,
        offset,
        remaining: it.dur - offset,
        startedAt: now - offset * 1000,
        next: items[(i + 1) % items.length],
      };
    }
    acc += it.dur;
  }
  return null;
}

/** The next few items with their start times, for the channel page's schedule. */
export function upcoming(ch: Channel, count = 6, now = Date.now()): { item: ProgrammeItem; at: number }[] {
  const air = onAir(ch, now);
  const items = ch.programme ?? [];
  if (!air) return [];
  const out: { item: ProgrammeItem; at: number }[] = [];
  let at = air.startedAt + air.item.dur * 1000;
  for (let k = 1; k <= count; k++) {
    const it = items[(air.index + k) % items.length];
    out.push({ item: it, at });
    at += it.dur * 1000;
  }
  return out;
}
