// One selection shared by the viewer, the try-on and every picker on the page. The URL hash keeps it, so a link
// opens the same frame, finish and lens (#print/black/brown/p1s0).

import { DEFAULTS, FRAMES, LENSES, finishesFor, type FrameId, type Selection } from './glasses';

const listeners = new Set<(s: Selection) => void>();
let current: Selection = fromHash() ?? { ...DEFAULTS.print };

function fromHash(): Selection | null {
  const [frame, finish, lens, flags] = location.hash.slice(1).split('/');
  if (!FRAMES.some((f) => f.id === frame)) return null;
  const base = { ...DEFAULTS[frame as FrameId] };
  if (finishesFor(base.frame).some((f) => f.id === finish)) base.finish = finish;
  if (LENSES.some((l) => l.id === lens)) base.lens = lens;
  if (flags?.length === 4) {
    base.print = flags[1] === '1';
    base.strap = flags[3] === '1';
  }
  return base;
}

export const selection = () => current;

export function select(change: Partial<Selection>) {
  if (change.frame && change.frame !== current.frame) {
    // A new frame starts from its own look, unless the lens or print was chosen in the same change.
    current = { ...DEFAULTS[change.frame], ...change };
  } else {
    current = { ...current, ...change };
  }
  const h = `#${current.frame}/${current.finish}/${current.lens}/p${current.print ? 1 : 0}s${current.strap ? 1 : 0}`;
  history.replaceState(null, '', h);
  for (const fn of listeners) fn(current);
}

export function onSelect(fn: (s: Selection) => void) {
  listeners.add(fn);
  fn(current);
  return () => listeners.delete(fn);
}
