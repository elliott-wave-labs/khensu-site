// nu.ink: your listening handwriting. While you drag sounds and turn your head, a path is drawn in a private
// plane on this device. At the end of a track (or when you ask), it becomes a small glyph — a score of how you
// listened, not of the music. It never leaves the device. Patent-adjacent: private path→glyph of spatial listening.

export type InkPoint = { t: number; x: number; y: number; kind: 'drag' | 'head' };
export type Ink = {
  id: string;
  trackId: string;
  title: string;
  at: number;
  points: InkPoint[];
  /** Compact SVG path `d` for the glyph. */
  d: string;
};

const MAX_POINTS = 480;

export class InkPen {
  points: InkPoint[] = [];
  private last = 0;
  private start = 0;
  trackId = '';
  title = '';

  begin(trackId: string, title: string) {
    this.trackId = trackId;
    this.title = title;
    this.points = [];
    this.start = performance.now();
    this.last = 0;
  }

  /** Call when the listener or a sound moves. x,y in about −1…1. */
  mark(x: number, y: number, kind: InkPoint['kind']) {
    if (!this.trackId) return;
    const now = performance.now();
    if (now - this.last < 40 && this.points.length) {
      const p = this.points[this.points.length - 1];
      p.x = x;
      p.y = y;
      return;
    }
    this.last = now;
    this.points.push({ t: (now - this.start) / 1000, x, y, kind });
    if (this.points.length > MAX_POINTS) this.points.splice(0, this.points.length - MAX_POINTS);
  }

  previewD(): string {
    return this.points.length >= 2 ? toPath(this.points) : '';
  }

  seal(): Ink | null {
    if (this.points.length < 4 || !this.trackId) return null;
    const d = toPath(this.points);
    const ink: Ink = {
      id: crypto.randomUUID?.() ?? `${Date.now().toString(36)}`,
      trackId: this.trackId,
      title: this.title,
      at: Date.now(),
      points: this.points.slice(),
      d,
    };
    return ink;
  }

  clear() {
    this.points = [];
    this.trackId = '';
    this.title = '';
  }
}

function toPath(pts: InkPoint[]): string {
  // Map into a 100×100 viewBox with a little padding; drag and head share one plane.
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs, -0.2);
  const maxX = Math.max(...xs, 0.2);
  const minY = Math.min(...ys, -0.2);
  const maxY = Math.max(...ys, 0.2);
  const sx = 88 / Math.max(0.2, maxX - minX);
  const sy = 88 / Math.max(0.2, maxY - minY);
  const map = (p: InkPoint) => ({
    x: 6 + (p.x - minX) * sx,
    y: 6 + (1 - (p.y - minY) / Math.max(0.2, maxY - minY)) * 88,
  });
  const first = map(pts[0]);
  let d = `M${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = map(pts[i - 1]);
    const b = map(pts[i]);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    d += ` Q${a.x.toFixed(1)} ${a.y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const last = map(pts[pts.length - 1]);
  d += ` T${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

export const inkSvg = (d: string, size = 96) =>
  `<svg class="wv-ink" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/></svg>`;
