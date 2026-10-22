// Directions through space, like Google Maps: milestones on the straight path between two places, travel
// times by light (real) and by spacetime bubble (a hypothetical warp drive), and rabbitholes, the wormhole
// network of nu.universes. Pure functions; the app mirrors this in Waves/Universes/Flight/Directions.swift.
import * as THREE from 'three';
import { AU, LY, GAL, SUN_R, SUN_Z, formatDistance, type Place } from './flight';

export type Opens = { kind: 'always' } | { kind: 'sky' } | { kind: 'visited'; place: string };
export type Gate = { place: string; name: string; opens: Opens; links: string[] };

// Gates sit at places. A jump runs along a link, and both ends must be open to you.
// always: open to everyone. sky: open while that galaxy is above your real horizon. visited: open once you have been to the place.
export const GATES: Gate[] = [
  { place: 'Sun', name: 'Sol', opens: { kind: 'always' }, links: ['Rigil Kentaurus', 'Milky Way'] },
  { place: 'Rigil Kentaurus', name: 'Alpha Centauri', opens: { kind: 'always' }, links: ['Sun'] },
  { place: 'Milky Way', name: 'Sagittarius A*', opens: { kind: 'always' }, links: ['Sun', 'Large Magellanic Cloud', 'Small Magellanic Cloud', 'Andromeda Galaxy · M31', 'Centaurus A', "Bode's Galaxy · M81"] },
  { place: 'Large Magellanic Cloud', name: 'LMC', opens: { kind: 'sky' }, links: ['Milky Way', 'Small Magellanic Cloud'] },
  { place: 'Small Magellanic Cloud', name: 'SMC', opens: { kind: 'sky' }, links: ['Milky Way', 'Large Magellanic Cloud'] },
  { place: 'Andromeda Galaxy · M31', name: 'Andromeda', opens: { kind: 'sky' }, links: ['Milky Way', 'Triangulum Galaxy · M33', 'M32', 'M110'] },
  { place: 'M32', name: 'M32', opens: { kind: 'visited', place: 'Andromeda Galaxy · M31' }, links: ['Andromeda Galaxy · M31'] },
  { place: 'M110', name: 'M110', opens: { kind: 'visited', place: 'Andromeda Galaxy · M31' }, links: ['Andromeda Galaxy · M31'] },
  { place: 'Triangulum Galaxy · M33', name: 'Triangulum', opens: { kind: 'sky' }, links: ['Andromeda Galaxy · M31', 'NGC 604'] },
  { place: 'NGC 604', name: 'NGC 604', opens: { kind: 'visited', place: 'Triangulum Galaxy · M33' }, links: ['Triangulum Galaxy · M33'] },
  { place: 'Centaurus A', name: 'Centaurus A', opens: { kind: 'visited', place: 'Centaurus A' }, links: ['Milky Way', 'Sombrero Galaxy · M104'] },
  { place: 'Sombrero Galaxy · M104', name: 'Sombrero', opens: { kind: 'visited', place: 'Sombrero Galaxy · M104' }, links: ['Centaurus A'] },
  { place: "Bode's Galaxy · M81", name: "Bode's", opens: { kind: 'visited', place: "Bode's Galaxy · M81" }, links: ['Milky Way', 'Cigar Galaxy · M82', 'Pinwheel Galaxy · M101'] },
  { place: 'Cigar Galaxy · M82', name: 'Cigar', opens: { kind: 'visited', place: "Bode's Galaxy · M81" }, links: ["Bode's Galaxy · M81"] },
  { place: 'Pinwheel Galaxy · M101', name: 'Pinwheel', opens: { kind: 'visited', place: 'Pinwheel Galaxy · M101' }, links: ["Bode's Galaxy · M81", 'Whirlpool Galaxy · M51'] },
  { place: 'Whirlpool Galaxy · M51', name: 'Whirlpool', opens: { kind: 'visited', place: 'Whirlpool Galaxy · M51' }, links: ['Pinwheel Galaxy · M101'] },
];

/** Where you are on Earth and what you have visited; both stay on the device. */
export type Traveller = { lat?: number; lon?: number; visited: Set<string>; now: Date };

const GALT = GAL.clone().transpose();
const RAD = Math.PI / 180;

/** Right ascension (hours) and declination (deg) of a direction from the Sun. */
export function raDec(v: THREE.Vector3): [number, number] {
  const n = v.clone().normalize();
  return [(((Math.atan2(n.y, n.x) / RAD) + 360) % 360) / 15, Math.asin(n.z) / RAD];
}

/** Galactic longitude and latitude (deg) of a direction. */
export function galactic(v: THREE.Vector3): [number, number] {
  const g = v.clone().normalize().applyMatrix3(GALT);
  return [((Math.atan2(g.y, g.x) / RAD) + 360) % 360, Math.asin(g.z) / RAD];
}

/** Altitude (deg) of a place above the horizon at latitude/longitude (deg, east positive) and time. */
export function altitude(pos: THREE.Vector3, lat: number, lon: number, t: Date): number {
  const [ra, dec] = raDec(pos);
  const jd = t.getTime() / 86_400_000 + 2_440_587.5;
  const lst = (280.46061837 + 360.98564736629 * (jd - 2_451_545) + lon) % 360;
  const h = (lst - ra * 15) * RAD;
  return Math.asin(Math.sin(lat * RAD) * Math.sin(dec * RAD) + Math.cos(lat * RAD) * Math.cos(dec * RAD) * Math.cos(h)) / RAD;
}

/** Next time within a day that the place rises; null if it never rises at this latitude. */
export function nextRise(pos: THREE.Vector3, lat: number, lon: number, from: Date): Date | null {
  for (let m = 10; m <= 1440; m += 10) {
    const t = new Date(from.getTime() + m * 60_000);
    if (altitude(pos, lat, lon, t) > 0) return t;
  }
  return null;
}

export type GateState = { open: boolean; why: string };

export function gateState(g: Gate, byName: Map<string, Place>, who: Traveller): GateState {
  if (g.opens.kind === 'always') return { open: true, why: 'Always open' };
  if (g.opens.kind === 'visited') {
    const need = g.opens.place;
    return who.visited.has(need) ? { open: true, why: `Open: you have been to ${need}` } : { open: false, why: `Opens once you have been to ${need}` };
  }
  const p = byName.get(g.place);
  if (!p) return { open: false, why: 'Not on the map' };
  if (who.lat === undefined || who.lon === undefined) return { open: false, why: `Opens while ${g.name} is above your horizon. Add your location (it stays on this device).` };
  const alt = altitude(p.pos, who.lat, who.lon, who.now);
  if (alt > 0) return { open: true, why: `Open: ${g.name} is ${alt.toFixed(0)}° above your horizon` };
  const rise = nextRise(p.pos, who.lat, who.lon, who.now);
  return { open: false, why: rise ? `Opens when ${g.name} rises at ${rise.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : `${g.name} never rises at your latitude` };
}

export type Step = { text: string; detail: string; pos: THREE.Vector3; view: number; along: number; jump?: boolean; place?: Place };
export type Leg = { from: THREE.Vector3; to: THREE.Vector3; jump: boolean };
export type Route = { steps: Step[]; legs: Leg[]; bubble: number; direct: number; jumps: number; notes: string[] };

/** Heading as you set off: sky direction and galactic direction. */
function heading(dir: THREE.Vector3): string {
  const [ra, dec] = raDec(dir), [l, b] = galactic(dir);
  const h = Math.floor(ra), m = Math.round((ra - h) * 60);
  return `RA ${h}h ${String(m).padStart(2, '0')}m, Dec ${dec >= 0 ? '+' : '−'}${Math.abs(dec).toFixed(1)}° · galactic l ${l.toFixed(1)}°, b ${b >= 0 ? '+' : '−'}${Math.abs(b).toFixed(1)}°`;
}

/** Inside the Milky Way's disc: within 15 kpc of the centre and 1 kpc of the plane. */
function inDisc(p: THREE.Vector3): boolean {
  const g = p.clone().applyMatrix3(GALT);
  return Math.hypot(g.x - SUN_R, g.y) < 15_000 && Math.abs(g.z + SUN_Z) < 1_000;
}

const orbit = (name: string, au: number, note: string): [number, string, string, string] =>
  [au * AU, `Cross ${name}’s orbit`, note, `Cross ${name}’s orbit`];
const SUN_SHELLS: [number, string, string, string][] = [
  orbit('Mercury', 0.387, 'The innermost planet, 58 million km from the Sun.'),
  orbit('Venus', 0.723, 'The hottest planet, under clouds of sulphuric acid.'),
  orbit('Earth', 1, 'Home: 150 million km from the Sun, 8 light-minutes.'),
  orbit('Mars', 1.524, 'The red planet, 12.7 light-minutes from the Sun.'),
  [2.2 * AU, 'Enter the asteroid belt', 'Millions of rocks, but so spread out that spacecraft cross without dodging.', 'Leave the asteroid belt'],
  [3.3 * AU, 'Leave the asteroid belt', 'Next is Jupiter, more than twice as massive as all the other planets together.', 'Enter the asteroid belt'],
  orbit('Jupiter', 5.203, 'The largest planet; its gravity shapes the asteroid belt.'),
  orbit('Saturn', 9.537, 'The ringed planet, 80 light-minutes from the Sun.'),
  orbit('Uranus', 19.19, 'The ice giant that rolls on its side.'),
  [30.07 * AU, 'Cross Neptune’s orbit into the Kuiper belt', 'The last planet. Beyond it, the icy Kuiper belt, home of Pluto.', 'Cross Neptune’s orbit'],
  [50 * AU, 'Leave the Kuiper belt', 'Past the main belt of icy worlds; scattered objects like Eris and Sedna roam beyond.', 'Enter the Kuiper belt'],
  [120 * AU, 'Cross the heliopause', 'The solar wind ends and interstellar space begins (Voyager 1, 2012).', 'Cross the heliopause into the Sun’s wind'],
  [2_000 * AU, 'Enter the Oort cloud', 'The inner edge of the Sun’s shell of comets, roughly 2,000 AU out. Nobody has seen it directly; long-period comets show it is there.', 'Leave the Oort cloud'],
  [100_000 * AU, 'Leave the Oort cloud', 'The outer edge of the Sun’s comets, about 1.6 light-years out.', 'Enter the Oort cloud'],
  [150, 'Leave the Local Bubble', 'The hot cavity, about 1,000 light-years across, blown by supernovae around the Sun.', 'Enter the Local Bubble'],
];

/** Milestones on the straight path from a to b. */
export function bubbleSteps(a: Place, b: Place, places: Place[]): Step[] {
  const d = a.pos.distanceTo(b.pos);
  if (d === 0) return [];
  const dir = b.pos.clone().sub(a.pos).normalize();
  const at = (s: number) => a.pos.clone().addScaledVector(dir, s);
  // Sample in log distance from both ends, so an AU-scale shell is found on a megaparsec trip.
  const ss = new Set<number>([0, d]);
  for (let k = 0; k <= 600; k++) {
    const s = 1e-7 * Math.pow(d / 1e-7, k / 600);
    if (s < d) { ss.add(s); ss.add(d - s); }
  }
  const s = [...ss].sort((x, y) => x - y);
  const ra = a.pos.length(), rb = b.pos.length();
  const steps: Step[] = [{ text: `Leave ${a.name}`, detail: `Head toward ${heading(dir)}`, pos: a.pos.clone(), view: a.view, along: 0, place: a }];
  for (let i = 1; i < s.length; i++) {
    const p0 = at(s[i - 1]), p1 = at(s[i]);
    const r0 = p0.length(), r1 = p1.length();
    for (const [r, out, note, inText] of SUN_SHELLS) {
      if ((r0 - r) * (r1 - r) < 0 && Math.abs(ra - r) > 0.05 * r && Math.abs(rb - r) > 0.05 * r) {
        const outward = r1 > r0;
        steps.push({ text: outward ? out : inText, detail: note, pos: p1, view: Math.max(r * 2, 1e-4), along: s[i] });
      }
    }
    const d0 = inDisc(p0), d1 = inDisc(p1);
    if (d0 !== d1) {
      steps.push({ text: d0 ? 'Leave the Milky Way’s disc' : 'Enter the Milky Way’s disc', detail: d0 ? 'Out of the stars and gas of our galaxy, into intergalactic space.' : 'Into the stars and gas of our galaxy.', pos: p1, view: 30_000, along: s[i] });
    }
    for (const g of places) {
      if (!g.radius || g === a || g === b || g.name === 'Milky Way') continue;
      const in0 = p0.distanceTo(g.pos) < g.radius, in1 = p1.distanceTo(g.pos) < g.radius;
      if (in0 !== in1) steps.push({ text: `${in1 ? 'Enter' : 'Leave'} ${g.name}`, detail: g.note, pos: p1, view: g.view, along: s[i], place: g });
    }
  }
  // Pass close to galaxies on the way: within three of their radii, without entering.
  for (const g of places) {
    if (!g.radius || g === a || g === b || g.name === 'Milky Way') continue;
    const t = THREE.MathUtils.clamp(g.pos.clone().sub(a.pos).dot(dir), 0, d);
    const miss = at(t).distanceTo(g.pos);
    if (t > 0 && t < d && miss > g.radius && miss < g.radius * 3) {
      steps.push({ text: `Pass ${g.name}`, detail: `${formatDistance(miss)} off your path. ${g.note}`, pos: g.pos.clone(), view: g.view, along: t, place: g });
    }
  }
  steps.push({ text: `Arrive at ${b.name}`, detail: b.note, pos: b.pos.clone(), view: b.view, along: d, place: b });
  return steps.sort((x, y) => x.along - y.along);
}

/** The best rabbithole route: least bubble travel through open gates, fewest jumps on ties. */
export function rabbitholeRoute(a: Place, b: Place, places: Place[], who: Traveller): Route {
  const byName = new Map(places.map((p) => [p.name, p]));
  const gates = GATES.filter((g) => byName.has(g.place));
  const state = new Map(gates.map((g) => [g.place, gateState(g, byName, who)]));
  const direct = a.pos.distanceTo(b.pos);
  const paths = (useOpen: boolean) => {
    // Breadth-first from every gate, through gates that are open (or all of them, to explain what is closed).
    const ok = (g: Gate) => !useOpen || state.get(g.place)!.open;
    const best: { cost: number; path: Gate[] } = { cost: direct, path: [] };
    for (const g0 of gates.filter(ok)) {
      const prev = new Map<string, Gate | null>([[g0.place, null]]);
      const queue = [g0];
      while (queue.length) {
        const g = queue.shift()!;
        for (const n of g.links) {
          const gn = gates.find((x) => x.place === n);
          if (gn && ok(gn) && !prev.has(n)) { prev.set(n, g); queue.push(gn); }
        }
      }
      for (const [end] of prev) {
        if (end === g0.place) continue;
        const cost = a.pos.distanceTo(byName.get(g0.place)!.pos) + byName.get(end)!.pos.distanceTo(b.pos);
        const path: Gate[] = [];
        for (let n: string | undefined = end; n; n = prev.get(n)?.place) path.unshift(gates.find((x) => x.place === n)!);
        if (cost < best.cost * 0.999 || (Math.abs(cost - best.cost) < best.cost * 1e-3 && best.path.length > 0 && path.length < best.path.length)) {
          best.cost = cost;
          best.path = path;
        }
      }
    }
    return best;
  };
  const open = paths(true), ideal = paths(false);
  const notes: string[] = [];
  for (const g of ideal.path) {
    const st = state.get(g.place)!;
    if (!st.open) notes.push(`${g.name} rabbithole: ${st.why}`);
  }
  if (!open.path.length) {
    const steps = bubbleSteps(a, b, places);
    return { steps, legs: [{ from: a.pos, to: b.pos, jump: false }], bubble: direct, direct, jumps: 0, notes: notes.length ? notes : ['No open rabbithole shortens this trip.'] };
  }
  const steps: Step[] = [], legs: Leg[] = [];
  const first = byName.get(open.path[0].place)!, last = byName.get(open.path[open.path.length - 1].place)!;
  let along = 0;
  if (first !== a && a.pos.distanceTo(first.pos) > 0) {
    for (const s of bubbleSteps(a, first, places)) steps.push({ ...s, along: s.along, text: s.place === first ? `Reach the ${open.path[0].name} rabbithole` : s.text });
    legs.push({ from: a.pos, to: first.pos, jump: false });
    along = a.pos.distanceTo(first.pos);
  } else {
    steps.push({ text: `Enter the ${open.path[0].name} rabbithole`, detail: state.get(open.path[0].place)!.why, pos: first.pos.clone(), view: first.view, along: 0, place: first });
  }
  for (let i = 1; i < open.path.length; i++) {
    const g0 = byName.get(open.path[i - 1].place)!, g1 = byName.get(open.path[i].place)!;
    steps.push({ text: g1 === b ? `Jump to ${open.path[i].name}: you have arrived` : `Jump to ${open.path[i].name}`, detail: `${formatDistance(g0.pos.distanceTo(g1.pos))} in no time. ${state.get(open.path[i].place)!.why}.`, pos: g1.pos.clone(), view: g1.view, along, jump: true, place: g1 });
    legs.push({ from: g0.pos, to: g1.pos, jump: true });
  }
  if (last !== b && last.pos.distanceTo(b.pos) > 0) {
    for (const s of bubbleSteps(last, b, places).slice(1)) steps.push({ ...s, along: along + s.along });
    legs.push({ from: last.pos, to: b.pos, jump: false });
  }
  return { steps, legs, bubble: open.cost, direct, jumps: open.path.length - 1, notes };
}

/** A duration in years, in words. */
export function formatYears(y: number): string {
  const s = y * 365.25 * 86_400;
  if (s === 0) return 'instant';
  if (s < 1) return 'under a second';
  if (s < 60) return `${Math.round(s)} s`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  if (s < 86_400) return `${(s / 3600).toFixed(s < 36_000 ? 1 : 0)} h`;
  if (y < 1) { const d = Math.round(s / 86_400); return `${d} day${d === 1 ? '' : 's'}`; }
  if (y < 1000) return `${y < 10 ? y.toFixed(1) : Math.round(y).toLocaleString()} years`;
  if (y < 1e6) return `${(y / 1e3).toFixed(y < 1e4 ? 1 : 0)} thousand years`;
  if (y < 1e9) return `${(y / 1e6).toFixed(y < 1e7 ? 2 : 1)} million years`;
  return `${(y / 1e9).toFixed(2)} billion years`;
}

/** Years to cover pc at a multiple of light speed. */
export const travelYears = (pc: number, timesC: number) => pc / LY / timesC;

/** Parker Solar Probe's record, 191.7 km/s on 24 December 2024: the fastest any spacecraft has gone. */
export const SPACECRAFT_KMS = 191.7;
export const SPACECRAFT = SPACECRAFT_KMS / 299_792.458;
