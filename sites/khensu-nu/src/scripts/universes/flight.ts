// nu.universes web flight: one continuous 3D map from Earth's orbit to the cosmic web.
// Units are parsecs, equatorial J2000, Sun at the origin. Data built by
// khensu-specs design/nu-universes/catalog.py (HYG v4.1, UNGC, 2MRS) and NASA JPL elements.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const AU = 1 / 206_264.806;
export const LY = 0.306_601;
const OBLIQUITY = THREE.MathUtils.degToRad(23.439_28);

// facing: unit vector from the place toward the camera for its best view; absent keeps the current heading.
// radius: disc radius (pc) of galaxies, for directions. parent: the body or region it belongs to, for the place list.
// order: sort key among the Solar System's top-level entries (au from the Sun).
export type Place = { name: string; pos: THREE.Vector3; view: number; kind: string; note: string; showWithin: number; minView?: number; facing?: THREE.Vector3; radius?: number; parent?: string; order?: number };

// NASA JPL "Approximate Positions of the Planets", table 1 (1800–2050):
// a (au), e, I, L, ϖ, Ω (deg) and their rates per Julian century.
const PLANETS: [string, number[], number[], number][] = [
  ['Mercury', [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593], [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081], 0x9a9a9a],
  ['Venus', [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255], [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418], 0xe8d3a0],
  ['Earth', [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0], [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0], 0x6fa8ff],
  ['Mars', [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891], [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343], 0xd9734a],
  ['Jupiter', [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106], 0xd8b48a],
  ['Saturn', [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794], 0xe6d39b],
  ['Uranus', [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503], [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589], 0x9fe0e6],
  ['Neptune', [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574], [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664], 0x6a8cff],
];

/** Heliocentric equatorial position (pc) from JPL elements at Julian centuries T past J2000; M is mean anomaly override. */
function planetAt(el: number[], rate: number[], T: number, meanAnomaly?: number): THREE.Vector3 {
  const [a, e, I, L, wbar, node] = el.map((v, i) => v + rate[i] * T);
  const w = wbar - node;
  let M = meanAnomaly ?? ((((L - wbar) % 360) + 540) % 360) - 180;
  M = THREE.MathUtils.degToRad(M);
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 8; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const [cw, sw, cO, sO, cI, sI] = [w, w, node, node, I, I].map((d, i) => (i % 2 ? Math.sin : Math.cos)(THREE.MathUtils.degToRad(d)));
  const x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
  const y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
  const z = sw * sI * xp + cw * sI * yp;
  const ce = Math.cos(OBLIQUITY), se = Math.sin(OBLIQUITY);
  return new THREE.Vector3(x, y * ce - z * se, y * se + z * ce).multiplyScalar(AU);
}

/** Ecliptic J2000 (au) to equatorial (pc). */
function eclipticToEquatorial(x: number, y: number, z: number): THREE.Vector3 {
  const ce = Math.cos(OBLIQUITY), se = Math.sin(OBLIQUITY);
  return new THREE.Vector3(x, y * ce - z * se, y * se + z * ce).multiplyScalar(AU);
}

/** Heliocentric equatorial position (pc) from osculating elements: a (au), e, i, node, argument of perihelion, mean anomaly (deg). */
function keplerAt(a: number, e: number, i: number, node: number, peri: number, M: number): THREE.Vector3 {
  const r = THREE.MathUtils.degToRad;
  const m = r(((M % 360) + 540) % 360 - 180);
  let E = e > 0.8 ? Math.PI * Math.sign(m || 1) : m;
  for (let k = 0; k < 30; k++) E -= (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const [cw, sw, cO, sO, cI, sI] = [Math.cos(r(peri)), Math.sin(r(peri)), Math.cos(r(node)), Math.sin(r(node)), Math.cos(r(i)), Math.sin(r(i))];
  return eclipticToEquatorial(
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    sw * sI * xp + cw * sI * yp);
}

// Major moons: parent, name, orbit radius (km), period (days, negative for retrograde), note. Orbit sizes and periods
// are measured; where each moon is along its orbit today is approximate, and the place card says so.
const MOONS: [string, string, number, number, string][] = [
  ['Earth', 'Moon', 384_400, 27.322, 'Visited by 12 people, 1969–1972. Artemis is going back.'],
  ['Mars', 'Phobos', 9_376, 0.3189, 'Spirals slowly inward; in about 50 million years it breaks up into a ring.'],
  ['Mars', 'Deimos', 23_463, 1.263, 'The smaller, outer moon of Mars.'],
  ['Jupiter', 'Io', 421_700, 1.769, 'The most volcanic world known.'],
  ['Jupiter', 'Europa', 671_034, 3.551, 'An ocean under the ice. Europa Clipper arrives in 2030.'],
  ['Jupiter', 'Ganymede', 1_070_412, 7.155, 'The largest moon in the Solar System, bigger than Mercury.'],
  ['Jupiter', 'Callisto', 1_882_709, 16.689, 'The most cratered surface known.'],
  ['Saturn', 'Mimas', 185_539, 0.942, 'One giant crater, Herschel, makes it look like the Death Star.'],
  ['Saturn', 'Enceladus', 237_948, 1.37, 'Geysers of ocean water from its south pole feed Saturn\'s E ring.'],
  ['Saturn', 'Tethys', 294_619, 1.888, 'Almost pure water ice.'],
  ['Saturn', 'Dione', 377_396, 2.737, 'Bright ice cliffs on its trailing side.'],
  ['Saturn', 'Rhea', 527_108, 4.518, 'Saturn\'s second-largest moon.'],
  ['Saturn', 'Titan', 1_221_870, 15.945, 'Thick air and methane lakes. Huygens landed in 2005; Dragonfly follows.'],
  ['Saturn', 'Iapetus', 3_560_820, 79.32, 'One side as dark as coal, the other as bright as snow.'],
  ['Uranus', 'Miranda', 129_390, 1.413, 'Cliffs up to 20 km high.'],
  ['Uranus', 'Ariel', 191_020, 2.52, 'The brightest of Uranus\'s moons.'],
  ['Uranus', 'Umbriel', 266_000, 4.144, 'The darkest of Uranus\'s large moons.'],
  ['Uranus', 'Titania', 435_910, 8.706, 'The largest moon of Uranus.'],
  ['Uranus', 'Oberon', 583_520, 13.463, 'The outermost large moon of Uranus.'],
  ['Neptune', 'Triton', 354_759, -5.877, 'Orbits backwards: a captured Kuiper belt world, with nitrogen geysers.'],
  ['Neptune', 'Nereid', 5_513_818, 360.1, 'One of the most eccentric moon orbits known.'],
  ['Pluto', 'Charon', 19_591, 6.387, 'Half Pluto\'s size; the two orbit a point between them.'],
];

/** A moon's position: on a circle of its true radius around the parent, phase from its period. */
function moonAt(parent: THREE.Vector3, name: string, km: number, days: number, jdNow: number): THREE.Vector3 {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const th = THREE.MathUtils.degToRad(h + (360 * (jdNow - 2_451_545)) / days);
  const r = km / 149_597_870.7;
  return parent.clone().add(eclipticToEquatorial(r * Math.cos(th), r * Math.sin(th), 0));
}

// IAU galactic → equatorial (J2000) rotation, rows are the galactic axes in equatorial coordinates.
export const GAL = new THREE.Matrix3().set(
  -0.0548755604, 0.4941094279, -0.867666149,
  -0.8734370902, -0.44482963, -0.1980763734,
  -0.4838350155, 0.7469822445, 0.4559837762,
);
export const SUN_R = 8178; // pc, GRAVITY Collaboration 2019
export const SUN_Z = 20.8;
function galactocentric(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x + SUN_R, y, z - SUN_Z).applyMatrix3(GAL);
}

function bvToRGB(bv: number): [number, number, number] {
  const t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
  const k = t / 100;
  const r = k <= 66 ? 1 : Math.min(1, 1.292936 * Math.pow(k - 60, -0.1332047592));
  const g = k <= 66 ? Math.min(1, Math.max(0, 0.390081579 * Math.log(k) - 0.631841444)) : Math.min(1, 1.129890861 * Math.pow(k - 60, -0.0755148492));
  const b = k >= 66 ? 1 : k <= 19 ? 0 : Math.min(1, Math.max(0, 0.543206789 * Math.log(k - 10) - 1.196254089));
  return [r, g, b];
}

const POINT_VS = /* glsl */ `
  attribute float absMag;
  attribute float diam;
  attribute vec3 tint;
  uniform float uFocal;
  uniform float uLimit;
  uniform float uGain;
  uniform float uExposure;
  varying vec3 vTint;
  varying float vAlpha;
  #include <common>
  #include <logdepthbuf_pars_vertex>
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float d = max(length(mv.xyz), 1e-9);
    float m = absMag + 5.0 * log(d / 10.0) / log(10.0);
    float flux = pow(10.0, -0.4 * (m - uLimit - uExposure)) * uGain;
    float disc = diam / d * uFocal;
    float fs = pow(flux, 0.25) * 2.2;
    float s = max(fs, disc);
    gl_PointSize = clamp(s, 0.0, 220.0);
    // Light is conserved: a source spread over a larger disc gets dimmer per pixel.
    vAlpha = clamp(flux, 0.0, 1.0) * smoothstep(0.0, 1.2, s) * min(1.0, (fs * fs) / (s * s) * 4.0);
    vTint = tint;
    gl_Position = projectionMatrix * mv;
    #include <logdepthbuf_vertex>
  }
`;
const POINT_FS = /* glsl */ `
  varying vec3 vTint;
  varying float vAlpha;
  #include <logdepthbuf_pars_fragment>
  void main() {
    #include <logdepthbuf_fragment>
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c) * 4.0;
    float core = (exp(-r2 * 6.0) + 0.25 * exp(-r2 * 1.5)) * (1.0 - smoothstep(0.55, 1.0, r2));
    if (core * vAlpha < 0.004) discard;
    gl_FragColor = vec4(vTint * core * vAlpha, 1.0);
  }
`;

function pointMaterial(limit: number, gain = 1, exposure = 1) {
  const m = new THREE.ShaderMaterial({
    vertexShader: POINT_VS, fragmentShader: POINT_FS,
    uniforms: { uFocal: { value: 800 }, uLimit: { value: limit }, uGain: { value: gain }, uExposure: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  m.userData.exposure = exposure;
  return m;
}

function pointCloud(pos: Float32Array, absMag: Float32Array, tint: Float32Array, diam: Float32Array, mat: THREE.ShaderMaterial) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('absMag', new THREE.BufferAttribute(absMag, 1));
  g.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
  g.setAttribute('diam', new THREE.BufferAttribute(diam, 1));
  g.computeBoundingSphere();
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false;
  return p;
}


/** Disc axes for a galaxy at `pos`: major axis at position angle `pa` (north through east), tilted by `inc` from face-on. */
function discBasis(pos: THREE.Vector3, paDeg: number, incDeg: number) {
  const n = pos.clone().normalize();
  const east = new THREE.Vector3(0, 0, 1).cross(n).normalize();
  const north = n.clone().cross(east).normalize();
  const pa = THREE.MathUtils.degToRad(paDeg), inc = THREE.MathUtils.degToRad(incDeg);
  const major = north.clone().multiplyScalar(Math.cos(pa)).addScaledVector(east, Math.sin(pa));
  const minorSky = north.clone().multiplyScalar(-Math.sin(pa)).addScaledVector(east, Math.cos(pa));
  const minor = minorSky.multiplyScalar(Math.cos(inc)).addScaledVector(n, Math.sin(inc)).normalize();
  return { major, minor, normal: major.clone().cross(minor).normalize() };
}

/** Mostly face-on to a disc, tipped 35° toward the Sun so the view keeps our side of it. */
function facing(normal: THREE.Vector3, pos: THREE.Vector3) {
  const home = pos.lengthSq() > 0 ? pos.clone().negate().normalize() : new THREE.Vector3(0, 0, 1);
  const n = normal.dot(home) < 0 ? normal.clone().negate() : normal.clone();
  const t = THREE.MathUtils.degToRad(35);
  return n.multiplyScalar(Math.cos(t)).addScaledVector(home, Math.sin(t)).normalize();
}

// Published position angles (deg); others are unknown here and use a stable guess.
const PA: Record<string, number> = { MESSIER031: 38, MESSIER033: 23, LMC: 170, SMC: 45, MESSIER081: 157, MESSIER082: 65, MESSIER101: 39, NGC5194: 163, NGC4594: 90, NGC0253: 52, NGC5128: 35 };

const FRIENDLY: Record<string, [string, string]> = {
  MESSIER031: ['Andromeda Galaxy · M31', 'The nearest large spiral. Heading for the Milky Way.'],
  MESSIER033: ['Triangulum Galaxy · M33', 'Third-largest in the Local Group. Hubble mosaic heic1901.'],
  LMC: ['Large Magellanic Cloud', 'Satellite of the Milky Way.'],
  SMC: ['Small Magellanic Cloud', 'Satellite of the Milky Way.'],
  MESSIER032: ['M32', 'Compact satellite of Andromeda.'],
  NGC0205: ['M110', 'Satellite of Andromeda.'],
  MESSIER081: ["Bode's Galaxy · M81", 'Grand-design spiral in Ursa Major.'],
  MESSIER082: ['Cigar Galaxy · M82', 'Starburst galaxy beside M81.'],
  MESSIER101: ['Pinwheel Galaxy · M101', 'Face-on spiral, 65,000 pc of disc.'],
  NGC5194: ['Whirlpool Galaxy · M51', 'Spiral interacting with NGC 5195.'],
  NGC4594: ['Sombrero Galaxy · M104', 'Edge-on, with a bright bulge and dust lane.'],
  NGC5128: ['Centaurus A', 'Radio galaxy with a supermassive black hole jet.'],
  NGC0253: ['Sculptor Galaxy', 'Starburst spiral.'],
};

export function formatDistance(pc: number): string {
  const ly = pc / LY, au = pc / AU;
  if (au < 1000) return `${au < 10 ? au.toFixed(2) : Math.round(au).toLocaleString()} AU`;
  if (ly < 1000) return `${ly < 10 ? ly.toFixed(2) : Math.round(ly).toLocaleString()} light-years`;
  if (ly < 1e6) return `${(ly / 1e3).toFixed(ly < 1e4 ? 2 : 1)} thousand light-years`;
  if (ly < 1e9) return `${(ly / 1e6).toFixed(ly < 1e7 ? 2 : 1)} million light-years`;
  return `${(ly / 1e9).toFixed(2)} billion light-years`;
}

export async function startFlight(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const labels = root.querySelector<HTMLElement>('[data-labels]')!;
  const readout = root.querySelector<HTMLElement>('[data-readout]')!;
  const focusOut = root.querySelector<HTMLElement>('[data-focus]')!;
  const search = root.querySelector<HTMLInputElement>('[data-search]')!;
  const list = root.querySelector<HTMLDataListElement>('datalist')!;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x010208);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 1e-9, 1e11);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.zoomSpeed = 1.4;
  controls.minDistance = 2e-9;
  controls.maxDistance = 4e9;
  controls.screenSpacePanning = true;
  camera.up.set(0, 0, 1);

  const places: Place[] = [];
  const mats: THREE.ShaderMaterial[] = [];

  // Sun and planets, positioned for today.
  const T = (Date.now() / 86_400_000 + 2_440_587.5 - 2_451_545) / 36_525;
  const sunMat = pointMaterial(6, 1, 0);
  mats.push(sunMat);
  scene.add(pointCloud(new Float32Array([0, 0, 0]), new Float32Array([4.83]), new Float32Array([1, 0.95, 0.85]), new Float32Array([0.0000465 * 2]), sunMat));
  places.push({ name: 'Sun', pos: new THREE.Vector3(), view: 50 * AU, kind: 'Star · G2V', note: 'Our star. Everything here is measured from it.', showWithin: 2e5 });
  const planetMat = pointMaterial(6, 1, 0);
  mats.push(planetMat);
  {
    const n = PLANETS.length, pos = new Float32Array(n * 3), mag = new Float32Array(n), tint = new Float32Array(n * 3), diam = new Float32Array(n);
    PLANETS.forEach(([name, el, rate, color], i) => {
      const p = planetAt(el, rate, T);
      pos.set([p.x, p.y, p.z], i * 3);
      mag[i] = 27; // reflected light is faint; planets are drawn by their discs and labels
      const c = new THREE.Color(color);
      tint.set([c.r, c.g, c.b], i * 3);
      diam[i] = 3e-7;
      const a = el[0];
      places.push({ name, pos: p, view: a * 0.6 * AU, kind: 'Planet', note: `${a.toFixed(2)} AU from the Sun · position for today, NASA JPL elements`, showWithin: a * 80 * AU, order: a });
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 256; k++) pts.push(planetAt(el, rate, T, -180 + (360 * k) / 256));
      const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 }));
      orbit.frustumCulled = false;
      scene.add(orbit);
    });
    const pl = pointCloud(pos, mag, tint, diam, planetMat);
    scene.add(pl);
  }

  // Load the catalogues.
  const [starsBuf, starNames, local, survey, mosaic] = await Promise.all([
    fetch('/universes/data/stars.bin').then((r) => r.arrayBuffer()),
    fetch('/universes/data/stars.json').then((r) => r.json() as Promise<[number, string][]>),
    fetch('/universes/data/local.json').then((r) => r.json() as Promise<[string, number, number, number, number, number, number, number][]>),
    fetch('/universes/data/survey.bin').then((r) => r.arrayBuffer()),
    new THREE.TextureLoader().loadAsync('/universes/m33-4000.webp'),
  ]);

  // Small bodies from NASA/JPL's Small-Body Database (design/nu-universes/small_bodies.py), then the moons.
  {
    const [sb, belt] = await Promise.all([
      fetch('/universes/data/bodies.json').then((r) => r.json() as Promise<{ epoch: number; bodies: [string, string, number, number, number, number, number, number, string][] }>),
      fetch('/universes/data/belt.bin').then((r) => r.arrayBuffer()),
    ]);
    const jd = Date.now() / 86_400_000 + 2_440_587.5, dt = jd - sb.epoch;
    const advance = (a: number, M: number) => M + (0.985_607_668_6 / a ** 1.5) * dt;
    const earth = places.find((p) => p.name === 'Earth')!.pos;
    const toward = (au: number) => earth.clone().normalize().multiplyScalar(au * AU);
    places.push({ name: 'Asteroid belt', pos: toward(2.7), view: 9 * AU, kind: 'Region · 2.2–3.3 AU', note: 'Between Mars and Jupiter. The dots are 4,000 real asteroids and 800 of Jupiter\'s Trojans, placed for today from NASA JPL orbits.', showWithin: 400 * AU, order: 2.7 });
    places.push({ name: 'Kuiper belt', pos: toward(42), view: 110 * AU, kind: 'Region · 30–50 AU', note: 'The icy belt beyond Neptune, home of Pluto. The dots are 1,500 real objects from NASA JPL.', showWithin: 4000 * AU, order: 42 });
    const f = new Float32Array(belt), n = f.length / 7;
    const pos = new Float32Array(n * 3), mag = new Float32Array(n).fill(33.5), tint = new Float32Array(n * 3), diam = new Float32Array(n).fill(1e-7);
    const colours = [[0.55, 0.5, 0.42], [0.62, 0.5, 0.36], [0.42, 0.55, 0.7]];
    for (let i = 0; i < n; i++) {
      const [a, e, inc, node, peri, M, cls] = f.subarray(i * 7, i * 7 + 7);
      const p = keplerAt(a, e, inc, node, peri, advance(a, M));
      pos.set([p.x, p.y, p.z], i * 3);
      tint.set(colours[cls] ?? colours[0], i * 3);
    }
    const m = pointMaterial(6, 1, 0);
    mats.push(m);
    scene.add(pointCloud(pos, mag, tint, diam, m));

    const parentOf = (kind: string) => kind.includes('near-Earth') ? 'Near-Earth asteroids' : kind === 'Comet' ? 'Comets'
      : kind.includes('asteroid belt') || kind === 'Asteroid' ? 'Asteroid belt' : 'Kuiper belt';
    const bp = new Float32Array(sb.bodies.length * 3), bt = new Float32Array(sb.bodies.length * 3);
    sb.bodies.forEach(([name, kind, a, e, inc, node, peri, M, note], i) => {
      const p = keplerAt(a, e, inc, node, peri, advance(a, M));
      bp.set([p.x, p.y, p.z], i * 3);
      bt.set(kind === 'Comet' ? [0.6, 0.85, 1] : [0.85, 0.8, 0.7], i * 3);
      const r = p.length() / AU;
      places.push({ name, pos: p, view: Math.max(0.02, r * 0.15) * AU, kind, note: `${note} ${r.toFixed(2)} AU from the Sun today · NASA JPL elements`, showWithin: Math.max(0.4, r * 0.6) * AU, parent: parentOf(kind) });
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 256; k++) pts.push(keplerAt(a, e, inc, node, peri, -180 + (360 * k) / 256));
      const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: kind === 'Comet' ? 0x7dc4ff : 0xb8a888, transparent: true, opacity: 0.16 }));
      orbit.frustumCulled = false;
      scene.add(orbit);
    });
    const bm = pointMaterial(6, 1, 0);
    mats.push(bm);
    scene.add(pointCloud(bp, new Float32Array(sb.bodies.length).fill(31), bt, new Float32Array(sb.bodies.length).fill(2e-7), bm));

    const mp: number[] = [];
    for (const [parent, name, km, days, note] of MOONS) {
      const host = places.find((p) => p.name === parent);
      if (!host) continue;
      const p = moonAt(host.pos, name, km, days, jd);
      mp.push(p.x, p.y, p.z);
      const r = km / 149_597_870.7 * AU;
      places.push({ name, pos: p, view: Math.max(r * 0.8, 2e-10), kind: `Moon of ${parent}`, note: `${note} Orbits ${km.toLocaleString()} km from ${parent} every ${Math.abs(days) < 2 ? `${(Math.abs(days) * 24).toFixed(1)} hours` : `${Math.abs(days).toFixed(1)} days`}; where it is along that orbit today is approximate.`, showWithin: r * 60, minView: 0, parent });
    }
    const mm = pointMaterial(6, 1, 0);
    mats.push(mm);
    scene.add(pointCloud(new Float32Array(mp), new Float32Array(mp.length / 3).fill(31), new Float32Array(mp.length).fill(0.8), new Float32Array(mp.length / 3).fill(1e-7), mm));
  }

  {
    const f = new Float32Array(starsBuf), n = f.length / 5;
    const pos = new Float32Array(n * 3), mag = new Float32Array(n), tint = new Float32Array(n * 3), diam = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos.set([f[i * 5], f[i * 5 + 1], f[i * 5 + 2]], i * 3);
      mag[i] = f[i * 5 + 3];
      tint.set(bvToRGB(f[i * 5 + 4]), i * 3);
      diam[i] = 0.0000465 * 2;
    }
    const m = pointMaterial(7.5, 1, 0.35);
    mats.push(m);
    scene.add(pointCloud(pos, mag, tint, diam, m));
    const want = new Set(['Sirius', 'Rigil Kentaurus', 'Proxima Centauri', "Barnard's Star", 'Vega', 'Arcturus', 'Betelgeuse', 'Rigel', 'Polaris', 'Deneb', 'Antares', 'Aldebaran', 'Canopus', 'Altair', 'Spica', 'Procyon', 'Capella', 'Fomalhaut', 'Regulus', 'Mirach']);
    for (const [i, name] of starNames) {
      if (!want.has(name)) continue;
      const p = new THREE.Vector3(f[i * 5], f[i * 5 + 1], f[i * 5 + 2]);
      const d = p.length();
      places.push({ name, pos: p, view: Math.max(0.05, d * 0.05), kind: 'Star', note: `${formatDistance(d)} from the Sun · HYG v4.1 (Hipparcos)`, showWithin: Math.max(40, d * 6), minView: 0.02 });
    }
  }

  // The Milky Way: a model, because nobody has photographed it from outside.
  {
    const n = 90_000, pos = new Float32Array(n * 3), mag = new Float32Array(n), tint = new Float32Array(n * 3), diam = new Float32Array(n);
    let seed = 42;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
    const pitch = Math.tan(THREE.MathUtils.degToRad(12));
    for (let i = 0; i < n; i++) {
      let x: number, y: number, z: number, warm: number;
      const kind = rnd();
      if (kind < 0.12) { // bar, 27° to the Sun–centre line
        const l = gauss() * 1800, w = gauss() * 600, a = THREE.MathUtils.degToRad(27);
        x = l * Math.cos(a) - w * Math.sin(a); y = l * Math.sin(a) + w * Math.cos(a); z = gauss() * 350; warm = 1;
      } else if (kind < 0.62) { // four logarithmic arms
        const arm = Math.floor(rnd() * 4), r = 3000 + 12000 * Math.pow(rnd(), 1.3);
        const th = arm * Math.PI / 2 + Math.log(r / 3000) / pitch + gauss() * 0.12;
        x = -r * Math.cos(th) + gauss() * 250; y = -r * Math.sin(th) + gauss() * 250; z = gauss() * 120; warm = 0;
      } else { // smooth exponential disc, scale length 2.6 kpc
        const r = -2600 * Math.log(1 - rnd() * 0.995), th = rnd() * Math.PI * 2;
        x = r * Math.cos(th); y = r * Math.sin(th); z = gauss() * 300; warm = 0.6;
      }
      if (Math.hypot(x + SUN_R, y, z) < 600) { i--; continue; } // the real stars cover the Sun's neighbourhood
      const p = galactocentric(x, y, z);
      pos.set([p.x, p.y, p.z], i * 3);
      mag[i] = -8.4 + gauss() * 0.6; // 90,000 particles summing to M_B ≈ -20.8
      const c = warm ? [1, 0.82, 0.6] : [0.7, 0.8, 1];
      tint.set(c, i * 3);
      diam[i] = 120;
    }
    const m = pointMaterial(7.5, 0.5, 0.35);
    m.userData.inside = 0.05; // from inside, the model is a faint band; the real stars carry the neighbourhood
    mats.push(m);
    scene.add(pointCloud(pos, mag, tint, diam, m));
    places.push({ name: 'Milky Way', minView: 800, pos: galactocentric(0, 0, 0), view: 60_000, kind: 'Our galaxy · model', note: 'Model, not a photo: bar, four arms, exponential disc. Sun 8.18 kpc from the centre (GRAVITY 2019).', showWithin: 6e6, radius: 15_000,
      facing: facing(new THREE.Vector3(0, 0, 1).applyMatrix3(GAL), galactocentric(0, 0, 0)) });
  }

  // Nearby galaxies, measured distances (UNGC).
  let m33: THREE.Vector3 | null = null;
  {
    const rows = local.filter((r) => r[0] !== 'Milky Way');
    const n = rows.length, pos = new Float32Array(n * 3), mag = new Float32Array(n), tint = new Float32Array(n * 3), diam = new Float32Array(n);
    rows.forEach(([name, x, y, z, d, inc, bmag, tt], i) => {
      pos.set([x, y, z], i * 3);
      mag[i] = bmag;
      tint.set(tt <= 0 ? [1, 0.85, 0.65] : tt >= 9 ? [0.65, 0.78, 1] : [0.9, 0.9, 1], i * 3);
      diam[i] = d || 1000;
      const p = new THREE.Vector3(x, y, z);
      if (name === 'MESSIER033') m33 = p;
      const f = FRIENDLY[name];
      if (f || bmag < -19.5) {
        let h = 0;
        for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
        const { normal } = discBasis(p, PA[name] ?? h, inc || 45);
        places.push({ name: f?.[0] ?? name, pos: p, view: name === 'MESSIER033' ? 7000 : Math.max(d * 2.2, 3000), kind: 'Galaxy', note: `${f?.[1] ? f[1] + ' ' : ''}${formatDistance(p.length())} away · ${(d / 1000).toFixed(1)} kpc across · UNGC`, showWithin: Math.max(d * 300, 2e6), minView: 800, facing: facing(normal, p), radius: d / 2 });
      }
    });
    const m = pointMaterial(12, 1, 0.45);
    mats.push(m);
    scene.add(pointCloud(pos, mag, tint, diam, m));

    // Close up, the bright galaxies become particle discs at their catalogue size and inclination.
    const models = rows.filter(([name, , , , d, , bmag]) => d > 0 && (FRIENDLY[name] || bmag < -19.5));
    const per = 6000, total = models.length * per;
    const mp = new Float32Array(total * 3), mm = new Float32Array(total), mt = new Float32Array(total * 3), md = new Float32Array(total);
    let seed = 7;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
    let k = 0;
    for (const [name, x, y, z, d, inc, bmag, tt] of models) {
      const c = new THREE.Vector3(x, y, z);
      let h = 0;
      for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
      const { major, minor, normal } = discBasis(c, PA[name] ?? h, inc || 45);
      const R = d / 2, hR = R / 3.2, each = bmag + 2.5 * Math.log10(per);
      for (let j = 0; j < per; j++, k++) {
        let a: number, b: number, w: number, warm: number;
        if (tt <= 0) { // elliptical: a soft 3D ball
          a = gauss() * R * 0.5; b = gauss() * R * 0.5; w = gauss() * R * 0.42; warm = 1;
        } else if (tt >= 9) { // irregular: clumps
          const cl = Math.floor(rnd() * 9), ca = cl * 2.4, cr = R * 0.5 * Math.sqrt((cl + 1) / 9);
          a = cr * Math.cos(ca) + gauss() * R * 0.18; b = cr * Math.sin(ca) + gauss() * R * 0.18; w = gauss() * R * 0.05; warm = 0;
        } else { // spiral: bulge, two arms, exponential disc
          const r0 = rnd();
          if (r0 < 0.15) { a = gauss() * hR * 0.4; b = gauss() * hR * 0.4; w = gauss() * hR * 0.3; warm = 1; }
          else {
            const r = -hR * Math.log(1 - rnd() * 0.97), arm = r0 < 0.6 ? Math.floor(rnd() * 2) : -1;
            const th = arm < 0 ? rnd() * Math.PI * 2 : arm * Math.PI + Math.log(Math.max(r, hR * 0.2) / (hR * 0.2)) / 0.32 + gauss() * 0.18;
            a = r * Math.cos(th); b = r * Math.sin(th); w = gauss() * hR * 0.06; warm = arm < 0 ? 0.5 : 0;
          }
        }
        if (name === 'MESSIER033' && Math.abs(a) < 2150 && Math.abs(b) < 1210) { j--; k--; continue; } // the Hubble mosaic covers this
        const p = c.clone().addScaledVector(major, a).addScaledVector(minor, b).addScaledVector(normal, w);
        mp.set([p.x, p.y, p.z], k * 3);
        mm[k] = each + gauss() * 0.5;
        mt.set(warm === 1 ? [1, 0.84, 0.64] : warm ? [0.92, 0.9, 1] : [0.66, 0.78, 1], k * 3);
        md[k] = R * 0.008;
      }
    }
    const gm = pointMaterial(12, 0.04, 0.3);
    mats.push(gm);
    scene.add(pointCloud(mp, mm, mt, md, gm));
  }

  // 2MASS Redshift Survey: the cosmic web.
  {
    const f = new Float32Array(survey), n = f.length / 4;
    const pos = new Float32Array(n * 3), mag = new Float32Array(n), tint = new Float32Array(n * 3), diam = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos.set([f[i * 4], f[i * 4 + 1], f[i * 4 + 2]], i * 3);
      mag[i] = f[i * 4 + 3] + 3.0; // Ks → roughly B for the glow; colour is not claimed
      tint.set([0.95, 0.8, 0.62], i * 3);
      diam[i] = 25_000;
    }
    const m = pointMaterial(12, 0.3, 0.55);
    mats.push(m);
    scene.add(pointCloud(pos, mag, tint, diam, m));
    places.push({ name: 'Cosmic web', pos: new THREE.Vector3(), view: 4.5e8, kind: '2MASS Redshift Survey', note: '43,415 galaxies placed by redshift (H0 = 70). Dark wedges are where our own galaxy blocks the view.', showWithin: 0 });
  }

  // M33 with its real Hubble mosaic, at its real distance, tilt (54°) and position angle (23°).
  if (m33) {
    const { major, minor, normal } = discBasis(m33 as THREE.Vector3, 23, 54);
    const width = 14_000 * LY; // mosaic span
    mosaic.colorSpace = THREE.SRGBColorSpace;
    mosaic.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 2251 / 4000),
      new THREE.MeshBasicMaterial({ map: mosaic, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    plane.matrixAutoUpdate = false;
    plane.matrix.makeBasis(major, minor, normal).setPosition(m33 as THREE.Vector3);
    plane.frustumCulled = false;
    scene.add(plane);
    const h = width * 2251 / 4000, face = facing(normal, m33 as THREE.Vector3);
    for (const [name, u, v, size, note] of [
      ['NGC 604', 0.92, 0.05, 1500, 'Giant H II region · ~1,500 ly across · >200 hot massive young stars · 40× the visible Orion Nebula.'],
      ['NGC 595', 0.49, 0.96, 800, 'Diffuse H II region · among the four brightest in the Hubble survey.'],
    ] as const) {
      const pos = (m33 as THREE.Vector3).clone().addScaledVector(major, (u - 0.5) * width).addScaledVector(minor, (0.5 - v) * h);
      places.push({ name, pos, view: size * LY * 3, kind: 'In M33 · Hubble mosaic', note, showWithin: 30_000, minView: 0, facing: face });
    }
  }

  // Places for search.
  for (const p of places) {
    const o = document.createElement('option');
    o.value = p.name;
    list.append(o);
  }

  // Labels.
  const tags = places.map((p) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'uf-tag';
    el.textContent = p.name;
    el.addEventListener('click', () => fly(p));
    labels.append(el);
    return el;
  });

  // Flight: target and distance travel together in log space, zooming out over long hops like Google Earth.
  let flight: { from: THREE.Vector3; to: THREE.Vector3; d0: number; d1: number; dir: THREE.Vector3; dir1: THREE.Vector3; t: number; dur: number; hop: number } | null = null;
  let focus: Place | null = null;
  function fly(p: Place) {
    focus = p;
    const from = controls.target.clone(), d0 = camera.position.distanceTo(controls.target);
    const dir = camera.position.clone().sub(controls.target).normalize();
    const gap = from.distanceTo(p.pos);
    const hop = Math.max(0, Math.log(Math.max(gap * 0.8, 1e-12)) - (Math.log(d0) + Math.log(p.view)) / 2);
    flight = { from, to: p.pos.clone(), d0, d1: p.view, dir, dir1: (p.facing ?? dir).clone(), t: 0, dur: 1.6 + Math.min(3, hop * 0.25), hop };
    focusOut.innerHTML = `<b>${p.name}</b><span>${p.kind}</span><small>${p.note}</small>`;
  }
  search.addEventListener('change', () => {
    const p = places.find((x) => x.name.toLowerCase() === search.value.trim().toLowerCase());
    if (p) { fly(p); search.blur(); }
  });
  root.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) => b.addEventListener('click', () => {
    const p = places.find((x) => x.name === b.dataset.go);
    if (p) fly(p);
  }));
  controls.addEventListener('start', () => { flight = null; });

  // Arrivals feed directions (visited places open rabbitholes) and route playback.
  const arrivals: ((p: Place) => void)[] = [];
  const arrived = (p: Place) => arrivals.forEach((f) => f(p));
  // A rabbithole jump: no flight, the view is simply somewhere else.
  function jump(p: Place) {
    fly(p);
    flight = null;
    const dir = p.facing ?? camera.position.clone().sub(controls.target).normalize();
    controls.target.copy(p.pos);
    camera.position.copy(p.pos).addScaledVector(dir, p.view);
    root.classList.remove('is-jump');
    void root.offsetWidth;
    root.classList.add('is-jump');
    arrived(p);
  }

  // Route overlay: bubble legs in cyan, rabbithole jumps in pink.
  const route = new THREE.Group();
  scene.add(route);
  function setRoute(legs: { from: THREE.Vector3; to: THREE.Vector3; jump: boolean }[]) {
    for (const o of [...route.children] as THREE.Line[]) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
      route.remove(o);
    }
    for (const l of legs) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([l.from, l.to]),
        new THREE.LineBasicMaterial({ color: l.jump ? 0xff7ad9 : 0x7dd7ff, transparent: true, opacity: 0.85, depthWrite: false }));
      line.frustumCulled = false;
      route.add(line);
    }
  }

  // Start just outside Earth's orbit, looking at the Sun.
  const earth = places.find((p) => p.name === 'Earth')!;
  controls.target.set(0, 0, 0);
  camera.position.copy(earth.pos).multiplyScalar(2.5).add(new THREE.Vector3(0, 0, 1.2 * AU));
  focus = places[0];
  focusOut.innerHTML = `<b>Sun</b><span>${places[0].kind}</span><small>${places[0].note} Scroll out to leave the Solar System.</small>`;
  const linked = new URLSearchParams(location.search).get('place')?.toLowerCase();
  const start = linked && places.find((p) => p.name.toLowerCase() === linked || p.name.toLowerCase().startsWith(linked));
  if (start) {
    fly(start);
    flight = null;
    const dir = start.facing ?? camera.position.clone().sub(controls.target).normalize();
    controls.target.copy(start.pos);
    camera.position.copy(start.pos).addScaledVector(dir, start.view);
  }

  function resize() {
    const w = root.clientWidth, h = root.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const focal = (h * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    mats.forEach((m) => { m.uniforms.uFocal.value = focal; });
  }
  new ResizeObserver(resize).observe(root);
  resize();

  const clock = new THREE.Clock();
  const v = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    if (flight) {
      flight.t = Math.min(1, flight.t + dt / flight.dur);
      const s = flight.t * flight.t * (3 - 2 * flight.t);
      const logD = THREE.MathUtils.lerp(Math.log(flight.d0), Math.log(flight.d1), s) + flight.hop * Math.sin(Math.PI * s);
      const u = flight.hop > 0 ? Math.min(1, Math.max(0, (s - 0.15) / 0.7)) : s;
      controls.target.lerpVectors(flight.from, flight.to, u * u * (3 - 2 * u));
      v.lerpVectors(flight.dir, flight.dir1, s);
      if (v.lengthSq() < 1e-6) v.copy(flight.dir1);
      camera.position.copy(controls.target).addScaledVector(v.normalize(), Math.exp(logD));
      if (flight.t >= 1) {
        flight = null;
        if (focus) arrived(focus);
      }
    }
    controls.update();
    const dist = camera.position.distanceTo(controls.target);
    controls.panSpeed = 1;
    camera.near = Math.max(1e-10, dist * 1e-4);
    camera.far = Math.max(1e10, dist * 1e3);
    camera.updateProjectionMatrix();
    const zoom = Math.log10(Math.max(1, dist / 1e-3));
    const out = THREE.MathUtils.smoothstep(camera.position.length(), 1500, 12000);
    mats.forEach((m) => {
      m.uniforms.uExposure.value = zoom * m.userData.exposure;
      if (m.userData.inside !== undefined) m.uniforms.uGain.value = 0.5 * THREE.MathUtils.lerp(m.userData.inside, 1, out);
    });
    renderer.render(scene, camera);

    readout.textContent = `${formatDistance(camera.position.length())} from the Sun · view ${formatDistance(dist)} wide`;
    const w = root.clientWidth, h = root.clientHeight;
    places.forEach((p, i) => {
      const el = tags[i];
      const d = camera.position.distanceTo(p.pos);
      const show = p.showWithin > 0 && d < p.showWithin && d > p.view * 0.02 && dist > (p.minView ?? 0);
      v.copy(p.pos).project(camera);
      if (!show || v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) { el.hidden = true; return; }
      el.hidden = false;
      el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
    });
  });

  return { places, fly, jump, setRoute, onArrive: (f: (p: Place) => void) => arrivals.push(f), focus: () => focus };
}
