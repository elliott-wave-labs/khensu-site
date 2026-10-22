// nu.eyes frames for the web: the Blender models (design/nu-eyes/blender_frames.py) recoloured by part name.
// The ÑÜ print is a second skin on the lens that renders only from the front, as a polished mirror where the tile
// is white, so it reads as a reflective logo when you look at the glasses and is invisible from behind them.

import {
  CanvasTexture,
  ClampToEdgeWrapping,
  Color,
  DoubleSide,
  FrontSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import meta from '../../data/eyes-frames.json';

export type FrameId = 'strap' | 'shade' | 'print' | 'wayfarer' | 'round';
export type FrameMeta = (typeof meta)[number];
export const FRAMES = meta as FrameMeta[];

export interface Finish { id: string; label: string; color: string; kind: 'gloss' | 'matte' | 'crystal' | 'tortoise' | 'metal' }
export interface Lens { id: string; label: string; color: string; opacity: number; mirror?: number; gradient?: boolean }
export interface Selection { frame: FrameId; finish: string; lens: string; print: boolean; strap: boolean }

export const ACETATE: Finish[] = [
  { id: 'black', label: 'gloss black', color: '#0b0b0d', kind: 'gloss' },
  { id: 'matte', label: 'matte black', color: '#151517', kind: 'matte' },
  { id: 'havana', label: 'havana', color: '#6b3a17', kind: 'tortoise' },
  { id: 'crystal', label: 'crystal', color: '#e9eef2', kind: 'crystal' },
  { id: 'bone', label: 'bone', color: '#e8dfcf', kind: 'gloss' },
  { id: 'cherry', label: 'cherry', color: '#8e1020', kind: 'gloss' },
  { id: 'white', label: 'white', color: '#f4f4f2', kind: 'matte' },
  { id: 'volt', label: 'volt', color: '#d8f02a', kind: 'matte' },
];
export const METAL: Finish[] = [
  { id: 'gold', label: 'gold', color: '#d9ad62', kind: 'metal' },
  { id: 'silver', label: 'silver', color: '#d6d8dc', kind: 'metal' },
  { id: 'gunmetal', label: 'gunmetal', color: '#4b4e55', kind: 'metal' },
  { id: 'rose', label: 'rose gold', color: '#e0a48c', kind: 'metal' },
];
export const LENSES: Lens[] = [
  { id: 'smoke', label: 'smoke', color: '#16171a', opacity: 0.84 },
  { id: 'g15', label: 'g-15 green', color: '#28361f', opacity: 0.82 },
  { id: 'brown', label: 'brown gradient', color: '#4a2a14', opacity: 0.86, gradient: true },
  { id: 'blue', label: 'blue mirror', color: '#2f6cf2', opacity: 0.9, mirror: 0.85 },
  { id: 'fire', label: 'fire mirror', color: '#ff5a14', opacity: 0.9, mirror: 0.85 },
  { id: 'rose', label: 'rose', color: '#e79aa6', opacity: 0.42 },
  { id: 'clear', label: 'clear', color: '#ffffff', opacity: 0.07 },
];

export const DEFAULTS: Record<FrameId, Selection> = {
  strap: { frame: 'strap', finish: 'matte', lens: 'fire', print: false, strap: true },
  shade: { frame: 'shade', finish: 'black', lens: 'smoke', print: false, strap: false },
  print: { frame: 'print', finish: 'black', lens: 'brown', print: true, strap: false },
  wayfarer: { frame: 'wayfarer', finish: 'havana', lens: 'g15', print: false, strap: false },
  round: { frame: 'round', finish: 'gold', lens: 'clear', print: false, strap: false },
};

export const finishesFor = (id: FrameId) => (FRAMES.find((f) => f.id === id)?.wire ? METAL : ACETATE);
export const frameMeta = (id: FrameId) => FRAMES.find((f) => f.id === id)!;

/** Tiles of the print per 5 cm of lens, as in the Blender renders: about two ÑÜ marks across each lens. */
const PRINT_REPEAT = 1.35;

const loader = new GLTFLoader();
const models = new Map<FrameId, Promise<Group>>();
const model = (id: FrameId) => {
  if (!models.has(id)) models.set(id, loader.loadAsync(`/eyes/models/${id}.glb`).then((g) => g.scene as Group));
  return models.get(id)!;
};
export const preload = (id: FrameId) => void model(id);

let printTex: Texture | null = null;
const print = () => {
  if (!printTex) {
    printTex = new TextureLoader().load('/eyes/nu-print.png');
    printTex.wrapS = printTex.wrapT = RepeatWrapping;
    printTex.repeat.set(PRINT_REPEAT, PRINT_REPEAT);
    printTex.colorSpace = SRGBColorSpace;
    printTex.anisotropy = 8;
  }
  return printTex;
};

let gradientTex: Texture | null = null;
const gradient = () => {
  if (!gradientTex) {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 128;
    const g = c.getContext('2d')!;
    const lg = g.createLinearGradient(0, 0, 0, 128);
    lg.addColorStop(0, '#fff');
    lg.addColorStop(0.35, '#eee');
    lg.addColorStop(1, '#3a3a3a');
    g.fillStyle = lg;
    g.fillRect(0, 0, 4, 128);
    gradientTex = new CanvasTexture(c);
    gradientTex.wrapS = gradientTex.wrapT = ClampToEdgeWrapping;
    // Lens UVs run about −0.5…0.5 (5 cm units, centred), so shift them onto the canvas.
    gradientTex.offset.set(0, 0.5);
  }
  return gradientTex;
};

let tortoiseTex: Texture | null = null;
const tortoise = () => {
  if (!tortoiseTex) {
    const s = 512;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d')!;
    g.fillStyle = '#7a4518';
    g.fillRect(0, 0, s, s);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const blob = (color: string, n: number, rmin: number, rmax: number, blur: number) => {
      g.filter = `blur(${blur}px)`;
      g.fillStyle = color;
      for (let i = 0; i < n; i++) {
        const x = rnd() * s, y = rnd() * s, r = rmin + rnd() * (rmax - rmin);
        for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) {
          g.beginPath();
          g.ellipse(x + dx, y + dy, r * (0.6 + rnd() * 0.8), r * (0.5 + rnd() * 0.6), rnd() * Math.PI, 0, Math.PI * 2);
          g.fill();
        }
      }
    };
    blob('#c4802f', 26, 14, 34, 10);
    blob('#2a1206', 60, 10, 42, 8);
    blob('#120803', 40, 6, 20, 5);
    blob('#e0a24a', 18, 3, 8, 3);
    tortoiseTex = new CanvasTexture(c);
    tortoiseTex.wrapS = tortoiseTex.wrapT = RepeatWrapping;
    tortoiseTex.colorSpace = SRGBColorSpace;
  }
  return tortoiseTex;
};

function finishMaterial(f: Finish): Material {
  switch (f.kind) {
    case 'metal':
      return new MeshStandardMaterial({ color: f.color, metalness: 1, roughness: 0.2 });
    case 'matte':
      return new MeshPhysicalMaterial({ color: f.color, roughness: 0.6 });
    case 'crystal':
      return new MeshPhysicalMaterial({ color: f.color, roughness: 0.06, clearcoat: 1, transparent: true, opacity: 0.38, depthWrite: false });
    case 'tortoise':
      return new MeshPhysicalMaterial({ map: tortoise(), roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.04 });
    default:
      return new MeshPhysicalMaterial({ color: f.color, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.03 });
  }
}

function lensMaterial(l: Lens): Material {
  return new MeshPhysicalMaterial({
    color: l.color,
    metalness: l.mirror ?? 0,
    roughness: l.mirror ? 0.06 : 0.03,
    clearcoat: 1,
    transparent: true,
    opacity: l.opacity,
    alphaMap: l.gradient ? gradient() : null,
    envMapIntensity: l.mirror ? 1.6 : 1.1,
    side: DoubleSide,
    depthWrite: false,
  });
}

function printMaterial(gold: boolean): Material {
  return new MeshStandardMaterial({
    color: new Color(gold ? '#f2cf8a' : '#f4f6fa'),
    map: print(),
    metalness: 1,
    roughness: 0.05,
    envMapIntensity: 2.2,
    transparent: true,
    side: FrontSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4,
  });
}

/** A fresh, recoloured copy of a frame, ready to add to any scene (origin between the lens centres, metres). */
export async function buildGlasses(sel: Selection): Promise<Group> {
  const src = await model(sel.frame);
  const finishes = finishesFor(sel.frame);
  const finish = finishes.find((f) => f.id === sel.finish) ?? finishes[0];
  const lens = LENSES.find((l) => l.id === sel.lens) ?? LENSES[0];
  const meta = frameMeta(sel.frame);
  const frameMat = finishMaterial(finish);
  const accent = meta.wire ? frameMat : new MeshStandardMaterial({ color: '#d8dadf', metalness: 1, roughness: 0.18 });
  const fabric = new MeshPhysicalMaterial({ color: '#111113', roughness: 0.78, sheen: 1, sheenColor: new Color('#3a3a40') });
  const pads = new MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.1, transparent: true, opacity: 0.35 });

  const root = new Group();
  root.name = `nu.eyes:${sel.frame}`;
  const copy = src.clone(true);
  const extras: Object3D[] = [];
  copy.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const n = o.name.toLowerCase();
    if (n.startsWith('lens')) {
      o.material = lensMaterial(lens);
      o.renderOrder = 2;
      if (sel.print) {
        const skin = new Mesh(o.geometry, printMaterial(finish.id === 'gold' || finish.id === 'rose'));
        skin.renderOrder = 3;
        skin.position.copy(o.position);
        skin.quaternion.copy(o.quaternion);
        skin.scale.copy(o.scale);
        extras.push(skin);
        o.parent?.add(skin);
      }
    } else if (n.startsWith('frame') || n.startsWith('temples')) {
      o.material = frameMat;
      if (n.startsWith('temples')) o.visible = !(meta.strap && sel.strap);
    } else if (n.startsWith('metal')) o.material = accent;
    else if (n.startsWith('strap')) {
      o.material = fabric;
      o.visible = sel.strap;
    } else if (n.startsWith('pads')) o.material = pads;
  });
  root.add(copy);
  root.userData.extras = extras;
  return root;
}

export function disposeGlasses(g: Object3D) {
  g.traverse((o) => {
    if (o instanceof Mesh) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) m.dispose();
    }
  });
}
