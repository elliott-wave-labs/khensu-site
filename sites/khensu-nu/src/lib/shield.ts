// Geometry and results mirror khensu-specs hardware/sunu/sunu.py and out/summary.json.
// Every drawing is rendered to SVG at build time.

export type PhoneId = 'iphone-18-pro' | 'island';
export type StyleId = 'card' | 'fill' | 'wrap' | 'wrap-xl' | 'case';
type Slim = Exclude<StyleId, 'case'>;

type Phone = {
  id: PhoneId;
  label: string;
  short: string;
  w: number;
  h: number;
  r: number;
  bump: { x0: number; y0: number; w: number; h: number; r: number; lens: number };
  magsafeY: number;
};

export const PHONES: Phone[] = [
  {
    id: 'iphone-18-pro',
    label: 'iPhone 18 Pro, long camera plateau',
    short: 'iPhone 18 Pro',
    w: 71.78, h: 149.96, r: 12.5,
    bump: { x0: 0, y0: 0, w: 71.78, h: 43.1, r: 12.5, lens: 4.68 },
    magsafeY: -5,
  },
  {
    id: 'island',
    label: 'Phone with a camera island',
    short: 'Camera island',
    w: 71.5, h: 147.6, r: 10,
    bump: { x0: 4.5, y0: 4.5, w: 38, h: 38, r: 8, lens: 3.6 },
    magsafeY: 0,
  },
];

const B = {
  wall: 1.0, skin: 0.7, base: 0.6, suction: 0.3, gap: 0.6, inset: 0.4,
  magnetOD: 56, magnetID: 46, magnetT: 0.5, coilD: 44, coilT: 0.8,
  pcbL: 34, pcbW: 14, pcbT: 1.6, antW: 8, antL: 40, usbW: 9.2,
};

export type Result = {
  footprint: [number, number];
  t: number;
  wh: number;
  cm3: number;
  tiG: number;
  proud: number;
  draft: number;
  usb: boolean;
  ring: number;
};

export const RESULTS: Record<PhoneId, Record<Slim, Result>> = {
  'iphone-18-pro': {
    card: { footprint: [56, 86], t: 5.2, wh: 4.1, cm3: 9.2, tiG: 50, proud: 0.52, draft: 0, usb: false, ring: 53 },
    fill: { footprint: [65.8, 143.0], t: 4.68, wh: 6.5, cm3: 14.43, tiG: 84, proud: 0, draft: 0, usb: true, ring: 56 },
    wrap: { footprint: [71.0, 149.2], t: 4.68, wh: 7.5, cm3: 16.6, tiG: 95, proud: 0, draft: 0, usb: true, ring: 56 },
    'wrap-xl': { footprint: [71.0, 105.9], t: 4.68, wh: 6.5, cm3: 14.48, tiG: 74, proud: 0, draft: 0, usb: true, ring: 56 },
  },
  island: {
    card: { footprint: [56, 86], t: 5.2, wh: 4.1, cm3: 9.17, tiG: 50, proud: 1.6, draft: 0, usb: false, ring: 53 },
    fill: { footprint: [65.5, 140.6], t: 3.6, wh: 4.6, cm3: 10.24, tiG: 69, proud: 0, draft: 0, usb: true, ring: 56 },
    wrap: { footprint: [70.7, 146.8], t: 3.6, wh: 5.4, cm3: 12.06, tiG: 79, proud: 0, draft: 0, usb: true, ring: 56 },
    'wrap-xl': { footprint: [70.7, 146.8], t: 6.6, wh: 13.7, cm3: 30.37, tiG: 129, proud: 3.0, draft: 1.4, usb: true, ring: 56 },
  },
};

// One product. The other CAD styles stay in hardware/sunu as engineering references only.
export const SHIELD = 'wrap' as const;
export const STYLES: { id: StyleId; name: string; line: string }[] = [
  { id: SHIELD, name: 'suñůlink.shield', line: 'The whole back, a flat plate over the camera level with the lens tops, with an opening for every lens and sensor' },
];

const C = {
  phone: '#1a1a20',
  phoneLine: 'rgba(255,255,255,0.28)',
  bump: 'rgba(255,255,255,0.12)',
  shell: 'rgba(139,123,255,0.16)',
  accent: '#8b7bff',
  caseFill: 'rgba(255,255,255,0.14)',
  dim: 'rgba(255,255,255,0.55)',
  faint: 'rgba(255,255,255,0.4)',
  bg: '#0b0b0e',
  green: '#4fd1a5',
  blue: '#6aa6ff',
  yellow: '#f2c94c',
  pink: '#ff7ab8',
  orange: '#ff9f43',
  text: '#f2f2f5',
};

type Rect = { cx: number; cy: number; w: number; h: number; r: number };

const bumpRect = (p: Phone): Rect => ({
  cx: -p.w / 2 + p.bump.x0 + p.bump.w / 2,
  cy: p.h / 2 - p.bump.y0 - p.bump.h / 2,
  w: p.bump.w, h: p.bump.h, r: p.bump.r,
});
const bumpBottom = (p: Phone) => p.h / 2 - p.bump.y0 - p.bump.h;
// Fill and wrap carry a plate over the camera: one unbroken metal face a Qi2 coil can't see through.
const plate = (s: StyleId) => s === 'fill' || s === 'wrap';
const cardCenterY = (p: Phone) => Math.min(p.magsafeY, bumpBottom(p) - B.gap - 43 - 1);

function outline(p: Phone, s: StyleId): Rect[] {
  const bb = bumpBottom(p) - B.gap;
  const b = bumpRect(p);
  const cut: Rect = { cx: b.cx, cy: b.cy, w: b.w + 2 * B.gap, h: b.h + 2 * B.gap, r: b.r + B.gap };
  if (s === 'card') return [{ cx: 0, cy: cardCenterY(p), w: 56, h: 86, r: 8 }];
  if (s === 'fill') {
    const bot = -p.h / 2 + 4;
    return [{ cx: 0, cy: (bb + bot) / 2, w: p.w - 6, h: bb - bot, r: p.r - 3 }];
  }
  if (s === 'case') return [{ cx: 0, cy: 0, w: p.w + 3.2, h: p.h + 3.2, r: p.r + 1.6 }, { ...cut, w: b.w + 1.6, h: b.h + 1.6, r: b.r + 0.8 }];
  if (s === 'wrap') return [{ cx: 0, cy: 0, w: p.w - 2 * B.inset, h: p.h - 2 * B.inset, r: p.r - B.inset }];
  if (p.bump.w + 2 * B.gap >= p.w - 2 * B.inset - 2 * B.wall) {
    const bot = -p.h / 2 + B.inset;
    return [{ cx: 0, cy: (bb + bot) / 2, w: p.w - 2 * B.inset, h: bb - bot, r: 1 }];
  }
  return [{ cx: 0, cy: 0, w: p.w - 2 * B.inset, h: p.h - 2 * B.inset, r: p.r - B.inset }, cut];
}

function rr(r: Rect, sx: (x: number) => number, sy: (y: number) => number, k: number): string {
  const rad = Math.min(r.r, r.w / 2, r.h / 2) * k;
  const x0 = sx(r.cx - r.w / 2), x1 = sx(r.cx + r.w / 2);
  const y0 = sy(r.cy + r.h / 2), y1 = sy(r.cy - r.h / 2);
  const f = (n: number) => n.toFixed(1);
  return `M${f(x0 + rad)},${f(y0)} H${f(x1 - rad)} A${f(rad)},${f(rad)} 0 0 1 ${f(x1)},${f(y0 + rad)} V${f(y1 - rad)} A${f(rad)},${f(rad)} 0 0 1 ${f(x1 - rad)},${f(y1)} H${f(x0 + rad)} A${f(rad)},${f(rad)} 0 0 1 ${f(x0)},${f(y1 - rad)} V${f(y0 + rad)} A${f(rad)},${f(rad)} 0 0 1 ${f(x0 + rad)},${f(y0)} Z`;
}

function internals(p: Phone, s: Slim) {
  const o = outline(p, s)[0];
  const ymin = o.cy - o.h / 2 + B.wall;
  const xmin = o.cx - o.w / 2 + B.wall;
  const innerW = o.w - 2 * B.wall;
  const ring = RESULTS[p.id][s].ring;
  const pcbL = Math.min(B.pcbL, innerW - 2);
  return {
    ringOD: ring,
    ringID: ring - (B.magnetOD - B.magnetID),
    magsafe: { x: 0, y: p.magsafeY },
    antenna: { cx: 0, cy: ymin + B.antW / 2 + 0.5, w: Math.min(B.antL, innerW - 2), h: B.antW, r: 1 },
    pcb: { cx: xmin + pcbL / 2 + 1, cy: ymin + B.antW + 1.5 + B.pcbW / 2, w: pcbL, h: B.pcbW, r: 1 },
    usb: RESULTS[p.id][s].usb ? { cx: 0, cy: o.cy - o.h / 2 + 1.5, w: B.usbW, h: 3, r: 1.2 } : null,
    inner: { cx: o.cx, cy: o.cy, w: innerW, h: o.h - 2 * B.wall, r: Math.max(0.5, o.r - B.wall) },
  };
}

/** Back view of the phone with the shell, to scale. */
export function backView(p: Phone, s: StyleId, scale: number, withInternals: boolean): string {
  const pad = 10;
  const W = (p.w + 3.2) * scale + pad * 2;
  const H = (p.h + 3.2) * scale + pad * 2;
  const sx = (x: number) => W / 2 + x * scale;
  const sy = (y: number) => H / 2 - y * scale;
  const body: Rect = { cx: 0, cy: 0, w: p.w, h: p.h, r: p.r };
  const shell = outline(p, s).map((r) => rr(r, sx, sy, scale)).join(' ');
  const id = `h-${p.id}-${s}-${scale}`.replace(/\./g, '');
  const parts: string[] = [
    `<defs><pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${C.green}" stroke-width="1.4" opacity="0.55"/></pattern></defs>`,
  ];
  if (s === 'case') {
    parts.push(`<path d="${shell}" fill="${C.caseFill}" fill-rule="evenodd" stroke="${C.dim}"/>`);
    parts.push(`<path d="${rr(body, sx, sy, scale)}" fill="none" stroke="${C.phoneLine}" stroke-dasharray="3 3"/>`);
    parts.push(`<path d="${rr(bumpRect(p), sx, sy, scale)}" fill="${C.bump}" stroke="${C.phoneLine}"/>`);
  } else {
    parts.push(`<path d="${rr(body, sx, sy, scale)}" fill="${C.phone}" stroke="${C.phoneLine}"/>`);
    parts.push(`<path d="${rr(bumpRect(p), sx, sy, scale)}" fill="${C.bump}" stroke="${C.phoneLine}"/>`);
    parts.push(`<path d="${shell}" fill="${C.shell}" fill-rule="evenodd" stroke="${C.accent}" stroke-width="1.6"/>`);
  }
  if (s !== 'case' && withInternals) {
    const n = internals(p, s);
    const mx = sx(n.magsafe.x), my = sy(n.magsafe.y);
    parts.push(
      `<g class="internals">`,
      `<path d="${rr(n.inner, sx, sy, scale)}" fill="url(#${id})"/>`,
      `<circle cx="${mx}" cy="${my}" r="${((n.ringOD / 2 + 1) * scale).toFixed(1)}" fill="${C.bg}"/>`,
      `<circle cx="${mx}" cy="${my}" r="${(((n.ringOD + n.ringID) / 4) * scale).toFixed(1)}" fill="none" stroke="${C.dim}" stroke-width="${(((n.ringOD - n.ringID) / 2) * scale).toFixed(1)}" opacity="0.5"/>`,
      plate(s) ? '' : `<circle cx="${mx}" cy="${my}" r="${((B.coilD / 2) * scale).toFixed(1)}" fill="none" stroke="${C.yellow}" stroke-width="1.4" stroke-dasharray="4 3"/>`,
      `<path d="${rr(n.pcb, sx, sy, scale)}" fill="${C.blue}" opacity="0.75"/>`,
      `<path d="${rr(n.antenna, sx, sy, scale)}" fill="none" stroke="${C.pink}" stroke-width="1.4" stroke-dasharray="2 2"/>`,
      n.usb ? `<path d="${rr(n.usb, sx, sy, scale)}" fill="${C.text}"/>` : '',
      `</g>`,
    );
  }
  return `<svg viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" width="${W.toFixed(0)}" height="${H.toFixed(0)}" role="img" aria-label="${STYLES.find((x) => x.id === s)!.name} on the ${p.short}, back view to scale">${parts.join('')}</svg>`;
}

/** Long section through the magnet centre, height exaggerated for legibility. */
export function sectionView(p: Phone, s: Slim): string {
  const o = outline(p, s)[0];
  const r = RESULTS[p.id][s];
  const n = internals(p, s);
  const T = r.t;
  const kx = 3.4, kz = 14, padX = 20, padTop = 18;
  const y0 = o.cy - o.h / 2, y1 = o.cy + o.h / 2;
  const W = (y1 - y0) * kx + padX * 2;
  const H = (Math.max(T, p.bump.lens) + 1.8) * kz + padTop + 58;
  const X = (y: number) => padX + (y - y0) * kx;
  const Z = (z: number) => padTop + (Math.max(T, p.bump.lens) - z) * kz;
  const box = (ya: number, yb: number, za: number, zb: number, fill: string, op = 1) =>
    `<rect x="${X(ya).toFixed(1)}" y="${Z(zb).toFixed(1)}" width="${Math.max(0, (yb - ya) * kx).toFixed(1)}" height="${Math.max(0, (zb - za) * kz).toFixed(1)}" fill="${fill}" opacity="${op}"/>`;
  const zb = B.suction + B.base;
  const top = T - B.skin;
  const coilZ = top - B.coilT;
  const hasCoil = coilZ >= zb + B.magnetT + 0.1 && !plate(s);
  const zoneA = n.magsafe.y - (n.ringOD / 2 + 1);
  const zoneB = n.magsafe.y + (n.ringOD / 2 + 1);
  const stacked = coilZ - (zb + B.magnetT) - 0.2;
  const yi0 = y0 + B.wall, yi1 = y1 - B.wall;
  // Under a plate the camera sits in a pocket, so the cells stop short of it.
  const yc = plate(s) ? Math.min(yi1, bumpBottom(p) - B.gap - B.wall) : yi1;
  const pcbA = n.pcb.cy - B.pcbW / 2, pcbB = n.pcb.cy + B.pcbW / 2;
  const antB = n.antenna.cy + B.antW / 2;
  const batFrom = Math.max(pcbB + 1, antB + 1);
  const ringA = (n.ringOD + n.ringID) / 4;
  const ringW = (n.ringOD - n.ringID) / 2;
  const t = (x: number, y: number, s2: string, anchor = 'start') =>
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="10" fill="${C.faint}" text-anchor="${anchor}">${s2}</text>`;
  const parts = [
    `<line x1="${X(y0) - 12}" x2="${X(y1) + 12}" y1="${Z(0)}" y2="${Z(0)}" stroke="${C.phoneLine}"/>`,
    t(X(y0) - 12, Z(0) + 14, 'phone back glass'),
    `<line x1="${X(y0) - 12}" x2="${X(y1) + 12}" y1="${Z(p.bump.lens)}" y2="${Z(p.bump.lens)}" stroke="${C.faint}" stroke-dasharray="4 4"/>`,
    t(X(y1) + 12, Z(p.bump.lens) - 4, `lens ring tops ${p.bump.lens} mm`, 'end'),
    box(y0, y1, 0, B.suction, 'rgba(255,255,255,0.3)', 0.6),
    box(yi0, yi1, B.suction, zb, 'rgba(255,255,255,0.18)', 0.6),
    box(y0, yi0, B.suction, T, C.dim, 0.85),
    box(yi1, y1, B.suction, T, C.dim, 0.85),
    box(y0, y1, top, T, C.dim, 0.85),
    box(n.antenna.cy - B.antW / 2, antB, zb, top, C.pink, 0.25),
    n.pcb.cx - B.pcbL / 2 <= 0 ? box(pcbA, pcbB, zb, zb + B.pcbT, C.blue, 0.8) : '',
    box(Math.max(batFrom, yi0 + 0.5), Math.min(zoneA, yc - 0.5), zb + 0.05, top - 0.05, C.green, 0.45),
    box(Math.max(zoneB, batFrom), yc - 0.5, zb + 0.05, top - 0.05, C.green, 0.45),
    plate(s) ? box(bumpBottom(p), Math.min(y1, p.h / 2 - p.bump.y0), 0, top - 0.3, C.bump, 1) : '',
    plate(s) ? t((X(Math.max(y0, bumpBottom(p))) + X(Math.min(y1, p.h / 2 - p.bump.y0))) / 2, Z(top / 2) + 4, 'camera, under the plate', 'middle') : '',
    box(n.magsafe.y - ringA - ringW / 2, n.magsafe.y - ringA + ringW / 2, zb, zb + B.magnetT, C.text, 0.8),
    box(n.magsafe.y + ringA - ringW / 2, n.magsafe.y + ringA + ringW / 2, zb, zb + B.magnetT, C.text, 0.8),
    stacked >= 0.8 ? box(Math.max(zoneA, yi0 + 0.5), Math.min(zoneB, yi1 - 0.5), zb + B.magnetT + 0.1, zb + B.magnetT + 0.1 + stacked, C.green, 0.45) : '',
    hasCoil ? box(n.magsafe.y - B.coilD / 2, n.magsafe.y + B.coilD / 2, coilZ, top, C.yellow, 0.75) : '',
    `<line x1="${X(yi0).toFixed(1)}" x2="${X(yi1).toFixed(1)}" y1="${(Z(top) + 1).toFixed(1)}" y2="${(Z(top) + 1).toFixed(1)}" stroke="${C.orange}" stroke-width="2"/>`,
    t(X(y0), H - 28, 'bottom edge'),
    t(X(y1), H - 28, 'toward camera', 'end'),
    t((X(y0) + X(y1)) / 2, H - 8, `${(y1 - y0).toFixed(0)} mm long, ${T} mm thick (height drawn ${(kz / kx).toFixed(1)}× for legibility)`, 'middle'),
  ];
  return `<svg viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" width="${W.toFixed(0)}" height="${H.toFixed(0)}" role="img" aria-label="Section through the magnet centre">${parts.join('')}</svg>`;
}

export const LEGEND: { label: string; color: string; dashed: boolean }[] = [
  { label: 'Shield outline', color: C.accent, dashed: false },
  { label: 'Battery cells', color: C.green, dashed: false },
  { label: 'Magnet ring', color: C.dim, dashed: false },
  { label: 'Board and radios', color: C.blue, dashed: false },
  { label: 'Heat spreader: 25 µm graphite under the whole skin, into the titanium back', color: C.orange, dashed: false },
  { label: 'HaLow antenna window (no metal)', color: C.pink, dashed: true },
  { label: 'USB-C: charges from a wall charger or power bank', color: C.text, dashed: false },
];
