// Directions panel for nu.universes, laid out like Google Maps: From, To, how you travel, how long, the steps,
// and the fine print. Where you are, where you have been and your last place stay in this browser (localStorage).
import { AU, formatDistance, type Place } from './flight';
import { GATES, SPACECRAFT, SPACECRAFT_KMS, bubbleSteps, formatYears, gateState, rabbitholeRoute, travelYears, type Route, type Step, type Traveller } from './route';

type Flight = {
  places: Place[];
  fly: (p: Place) => void;
  jump: (p: Place) => void;
  setRoute: (legs: Route['legs']) => void;
  onArrive: (f: (p: Place) => void) => void;
  focus: () => Place | null;
};
type Mode = 'rabbithole' | 'bubble' | 'light' | 'craft';

const KEY_VISITED = 'nu.universes.visited';
const KEY_WHERE = 'nu.universes.where';
const KEY_LAST = 'nu.universes.last';

type Row = { label: string; sub: string; depth: number; place?: Place };

/** Every place as a tree: Solar System (planets with their moons, belts with their bodies), stars, then galaxies. */
function placeTree(places: Place[]): Row[] {
  const kids = new Map<string, Place[]>();
  const parentOf = (p: Place) => p.parent ?? (p.kind.startsWith('In M33') ? 'Triangulum Galaxy · M33' : undefined);
  for (const p of places) {
    const parent = parentOf(p);
    if (parent) kids.set(parent, [...(kids.get(parent) ?? []), p]);
  }
  const rows: Row[] = [];
  const add = (p: Place, depth: number) => {
    rows.push({ label: p.name, sub: p.kind, depth, place: p });
    for (const k of kids.get(p.name) ?? []) add(k, depth + 1);
  };
  const solar = places.filter((p) => !parentOf(p) && p.pos.length() < 0.05 && p.name !== 'Cosmic web');
  type Top = { order: number; place?: Place; heading?: string };
  const tops: Top[] = [
    ...solar.map((p) => ({ order: p.order ?? (p.name === 'Sun' ? 0 : p.pos.length() / AU), place: p })),
    { order: 1e4, heading: 'Near-Earth asteroids' },
    { order: 1e4 + 1, heading: 'Comets' },
  ].sort((a, b) => a.order - b.order);
  rows.push({ label: 'Solar System', sub: '', depth: -1 });
  for (const t of tops) {
    if (t.place) add(t.place, 0);
    else if (kids.has(t.heading!)) {
      rows.push({ label: t.heading!, sub: '', depth: 0 });
      for (const k of kids.get(t.heading!)!) add(k, 1);
    }
  }
  rows.push({ label: 'Stars', sub: '', depth: -1 });
  for (const p of places) if (!parentOf(p) && p.kind.startsWith('Star') && p.name !== 'Sun') add(p, 0);
  rows.push({ label: 'Milky Way and beyond', sub: '', depth: -1 });
  for (const p of places) if (!parentOf(p) && !solar.includes(p) && !p.kind.startsWith('Star')) add(p, 0);
  return rows;
}

/** A place field with a grouped, searchable list under it. */
function placeField(input: HTMLInputElement, rows: Row[], pick: (p: Place) => void) {
  const pop = document.createElement('div');
  pop.className = 'uf-pop';
  pop.hidden = true;
  pop.setAttribute('role', 'listbox');
  input.after(pop);
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  let shown: Row[] = [];
  let hi = -1;
  const render = () => {
    const q = input.value.trim().toLowerCase();
    shown = q && !rows.some((r) => r.place && r.label.toLowerCase() === q)
      ? rows.filter((r) => r.place && (r.label.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q))).slice(0, 60).map((r) => ({ ...r, depth: 0 }))
      : rows;
    hi = -1;
    pop.replaceChildren(...shown.map((r, i) => {
      if (!r.place) {
        const h = document.createElement('p');
        h.className = r.depth < 0 ? 'uf-pop-group' : 'uf-pop-head';
        h.textContent = r.label;
        return h;
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'option');
      b.style.paddingLeft = `${0.7 + Math.max(0, r.depth) * 1}rem`;
      b.innerHTML = '<b></b><small></small>';
      b.querySelector('b')!.textContent = r.label;
      b.querySelector('small')!.textContent = r.sub;
      b.addEventListener('pointerdown', (e) => e.preventDefault());
      b.addEventListener('click', () => choose(i));
      return b;
    }));
    if (!shown.some((r) => r.place)) pop.replaceChildren(Object.assign(document.createElement('p'), { className: 'uf-pop-head', textContent: 'No place by that name' }));
  };
  const choose = (i: number) => {
    const r = shown[i];
    if (!r?.place) return;
    input.value = r.place.name;
    pop.hidden = true;
    pick(r.place);
  };
  const mark = () => {
    const opts = [...pop.children];
    opts.forEach((o, j) => o.toggleAttribute('aria-selected', j === hi));
    opts[hi]?.scrollIntoView({ block: 'nearest' });
  };
  input.addEventListener('focus', () => { input.select(); render(); pop.hidden = false; });
  input.addEventListener('input', () => { render(); pop.hidden = false; });
  input.addEventListener('blur', () => { pop.hidden = true; });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      for (let j = hi + step; j >= 0 && j < shown.length; j += step) if (shown[j].place) { hi = j; break; }
      mark();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(hi >= 0 ? hi : shown.findIndex((r) => r.place));
      input.blur();
    } else if (e.key === 'Escape') {
      pop.hidden = true;
      input.blur();
    }
  });
}

const MODE_TEXT: Record<Mode, string> = {
  rabbithole: 'Rabbitholes, with the spacetime bubble between them',
  bubble: 'Spacetime bubble',
  light: 'Light speed',
  craft: 'Fastest spacecraft',
};

export function startDirections(root: HTMLElement, f: Flight) {
  const panel = root.querySelector<HTMLElement>('[data-dir]')!;
  const toggle = root.querySelector<HTMLButtonElement>('[data-dir-open]')!;
  const from = panel.querySelector<HTMLInputElement>('[data-dir-from]')!;
  const to = panel.querySelector<HTMLInputElement>('[data-dir-to]')!;
  const speed = panel.querySelector<HTMLSelectElement>('[data-dir-speed]')!;
  const lat = panel.querySelector<HTMLInputElement>('[data-dir-lat]')!;
  const lon = panel.querySelector<HTMLInputElement>('[data-dir-lon]')!;
  const sky = panel.querySelector<HTMLElement>('[data-dir-sky]')!;
  const tabs = [...panel.querySelectorAll<HTMLButtonElement>('[data-mode]')];
  const time = panel.querySelector<HTMLElement>('[data-dir-time]')!;
  const sub = panel.querySelector<HTMLElement>('[data-dir-sub]')!;
  const warn = panel.querySelector<HTMLElement>('[data-dir-warn]')!;
  const notes = panel.querySelector<HTMLElement>('[data-dir-notes]')!;
  const list = panel.querySelector<HTMLOListElement>('[data-dir-steps]')!;
  const go = panel.querySelector<HTMLButtonElement>('[data-dir-go]')!;
  const fine = panel.querySelector<HTMLDetailsElement>('.uf-fine')!;
  panel.querySelector('[data-dir-craft]')!.textContent = `${SPACECRAFT_KMS} km/s`;
  const named = new Map(f.places.map((p) => [p.name, p]));
  const find = (q: string) => named.get(q.trim()) ?? f.places.find((p) => p.name.toLowerCase() === q.trim().toLowerCase());

  const visited = new Set<string>(JSON.parse(localStorage.getItem(KEY_VISITED) ?? '[]'));
  const where = JSON.parse(localStorage.getItem(KEY_WHERE) ?? 'null') as { lat: number; lon: number } | null;
  if (where) { lat.value = String(where.lat); lon.value = String(where.lon); }
  let mode: Mode = 'rabbithole';
  let route: Route | null = null;
  let playing = -1;
  let here: Place | null = null;

  const rows = placeTree(f.places);
  placeField(from, rows, () => { stop(); render(); });
  placeField(to, rows, () => { stop(); render(); });

  const traveller = (): Traveller => {
    const la = parseFloat(lat.value), lo = parseFloat(lon.value);
    const ok = Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180;
    return { lat: ok ? la : undefined, lon: ok ? lo : undefined, visited, now: new Date() };
  };

  function skyLine() {
    const who = traveller();
    const live = GATES.filter((g) => named.has(g.place));
    const open = live.filter((g) => gateState(g, named, who).open);
    sky.textContent = `${open.length} of ${live.length} rabbitholes open to you now: ${open.map((g) => g.name).join(', ')}.`;
  }

  const stepAsPlace = (s: Step): Place => s.place ?? { name: s.text, pos: s.pos, view: s.view, kind: 'Directions', note: s.detail, showWithin: 0 };
  const rateOf = (m: Mode) => (m === 'light' ? 1 : m === 'craft' ? SPACECRAFT : parseFloat(speed.value));
  const p = (t: string) => Object.assign(document.createElement('p'), { textContent: t });
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

  function render() {
    const a = find(from.value), b = find(to.value);
    skyLine();
    list.replaceChildren();
    notes.replaceChildren();
    warn.textContent = '';
    route = null;
    f.setRoute([]);
    if (!a || !b || a === b) {
      for (const t of tabs) t.querySelector('small')!.textContent = '';
      time.textContent = '';
      sub.textContent = !b ? 'Choose where to go.' : a === b ? 'You are already there.' : 'Choose where you are starting from.';
      go.disabled = true;
      return;
    }
    const who = traveller();
    const holes = rabbitholeRoute(a, b, f.places, who);
    const direct = a.pos.distanceTo(b.pos);
    const times: Record<Mode, string> = {
      rabbithole: formatYears(travelYears(holes.bubble, rateOf('bubble'))),
      bubble: formatYears(travelYears(direct, rateOf('bubble'))),
      light: formatYears(travelYears(direct, 1)),
      craft: formatYears(travelYears(direct, SPACECRAFT)),
    };
    for (const t of tabs) t.querySelector('small')!.textContent = times[t.dataset.mode as Mode];

    if (mode === 'rabbithole') {
      route = holes;
      if (holes.jumps) {
        time.textContent = cap(times.rabbithole);
        sub.textContent = `${holes.jumps} rabbithole jump${holes.jumps > 1 ? 's' : ''}${holes.bubble > 0 ? ` and ${formatDistance(holes.bubble)} by bubble` : ''} · ${formatDistance(direct)} as the crow flies`;
      } else {
        time.textContent = cap(times.bubble);
        sub.textContent = `No open rabbithole shortens this trip, so it is all by bubble · ${formatDistance(direct)}`;
      }
      const closed = holes.notes.filter((n) => n.includes('rabbithole:'));
      if (closed.length) warn.textContent = `${closed.length} closer rabbithole${closed.length > 1 ? 's are' : ' is'} shut right now. See the fine print.`;
      for (const n of holes.notes) notes.append(p(n));
    } else {
      route = { steps: bubbleSteps(a, b, f.places), legs: [{ from: a.pos, to: b.pos, jump: false }], bubble: direct, direct, jumps: 0, notes: [] };
      time.textContent = cap(times[mode]);
      sub.textContent = `${MODE_TEXT[mode]} · ${formatDistance(direct)}`;
    }
    const rate = rateOf(mode === 'rabbithole' ? 'bubble' : mode);
    route.steps.forEach((s, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      if (s.jump) btn.className = 'is-jump';
      if (i === route!.steps.length - 1) btn.classList.add('is-end');
      const when = i === 0 ? 'Start here' : s.jump ? 'Rabbithole jump · instant' : `${formatDistance(s.along)} in · ${formatYears(travelYears(s.along, rate))}`;
      btn.innerHTML = '<i aria-hidden="true"></i><b></b><span></span><small></small>';
      btn.querySelector('i')!.textContent = String(i + 1);
      btn.querySelector('b')!.textContent = s.text;
      btn.querySelector('span')!.textContent = when;
      btn.querySelector('small')!.textContent = s.detail;
      btn.addEventListener('click', () => { stop(); show(i); });
      li.append(btn);
      list.append(li);
    });
    f.setRoute(route.legs);
    go.disabled = false;
  }

  function show(i: number) {
    if (!route) return;
    const s = route.steps[i];
    list.querySelectorAll('button').forEach((b, j) => b.toggleAttribute('aria-current', j === i));
    list.children[i]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (s.jump) f.jump(stepAsPlace(s));
    else f.fly(stepAsPlace(s));
  }

  function stop() {
    playing = -1;
    go.textContent = 'Start';
  }

  f.onArrive((pl) => {
    if (f.places.includes(pl)) {
      here = pl;
      localStorage.setItem(KEY_LAST, pl.name);
      if (!visited.has(pl.name)) {
        visited.add(pl.name);
        localStorage.setItem(KEY_VISITED, JSON.stringify([...visited]));
        if (!panel.hidden) skyLine();
      }
    }
    if (playing < 0 || !route) return;
    if (++playing >= route.steps.length) {
      stop();
      from.value = pl.name;
      to.value = '';
      render();
      return;
    }
    const next = playing;
    setTimeout(() => { if (playing === next) show(next); }, route.steps[next].jump ? 600 : 1100);
  });

  go.addEventListener('click', () => {
    if (playing >= 0) { stop(); return; }
    if (!route) return;
    playing = 0;
    go.textContent = 'Stop';
    show(0);
  });

  // Where you are now: the last place you arrived at (this visit, then any visit), else Earth.
  const current = () => here?.name ?? (named.has(localStorage.getItem(KEY_LAST) ?? '') ? localStorage.getItem(KEY_LAST)! : 'Earth');
  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-pressed', String(!panel.hidden));
    root.classList.toggle('has-dir', !panel.hidden);
    if (!panel.hidden) {
      if (!from.value) from.value = current();
      render();
      if (!to.value) to.focus();
    } else {
      stop();
      f.setRoute([]);
    }
  });
  panel.querySelector('[data-dir-close]')!.addEventListener('click', () => toggle.click());
  panel.querySelector('[data-dir-swap]')!.addEventListener('click', () => { [from.value, to.value] = [to.value, from.value]; stop(); render(); });
  for (const t of tabs) t.addEventListener('click', () => {
    mode = t.dataset.mode as Mode;
    tabs.forEach((x) => x.setAttribute('aria-pressed', String(x === t)));
    stop();
    render();
  });
  for (const el of [from, to]) el.addEventListener('change', () => { if (find(el.value)) { stop(); render(); } });
  speed.addEventListener('change', render);
  for (const el of [lat, lon]) el.addEventListener('change', () => {
    const w = traveller();
    if (w.lat !== undefined && w.lon !== undefined) localStorage.setItem(KEY_WHERE, JSON.stringify({ lat: w.lat, lon: w.lon }));
    else if (!lat.value && !lon.value) localStorage.removeItem(KEY_WHERE);
    render();
  });
  warn.addEventListener('click', () => { fine.open = true; fine.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
  // Rabbitholes that open with the sky change as Earth turns.
  setInterval(() => { if (!panel.hidden && playing < 0) render(); }, 60_000);
}
