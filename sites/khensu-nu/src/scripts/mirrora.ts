// Live canvases on /mirrora: one quon with many pointers, Hopf 3-sphere,
// a tesseract, and three time axes of the same type.
type Ctx = CanvasRenderingContext2D;

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function fit(canvas: HTMLCanvasElement): { ctx: Ctx; w: number; h: number } | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.max(1, canvas.clientWidth);
  const h = Math.max(1, canvas.clientHeight);
  const W = Math.round(w * dpr);
  const H = Math.round(h * dpr);
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function clear(ctx: Ctx, w: number, h: number) {
  ctx.fillStyle = '#03040a';
  ctx.fillRect(0, 0, w, h);
}

function rot4(p: number[], a: number, b: number, c: number) {
  let [x, y, z, w] = p;
  let cs = Math.cos(a),
    sn = Math.sin(a);
  ;[x, w] = [x * cs - w * sn, x * sn + w * cs];
  cs = Math.cos(b);
  sn = Math.sin(b);
  ;[y, w] = [y * cs - w * sn, y * sn + w * cs];
  cs = Math.cos(c);
  sn = Math.sin(c);
  ;[z, w] = [z * cs - w * sn, z * sn + w * cs];
  return [x, y, z, w];
}

function project3(x: number, y: number, z: number, w: number, d: number) {
  const k = d / Math.max(0.18, d - w);
  return [x * k, y * k, z * k] as const;
}

function to2(x: number, y: number, z: number, w: number, h: number, cam = 3.4) {
  const s = Math.min(w, h) * 0.42;
  const den = cam + z;
  return [w / 2 + (x * s) / den, h / 2 + (y * s) / den] as const;
}

function watch(el: HTMLElement, on: (v: boolean) => void) {
  const io = new IntersectionObserver(([e]) => on(e.isIntersecting), { threshold: 0.08 });
  io.observe(el);
}

function dragRotate(canvas: HTMLCanvasElement, state: { ax: number; ay: number }) {
  let px = 0,
    py = 0,
    down = false;
  const start = (x: number, y: number) => {
    down = true;
    px = x;
    py = y;
  };
  const move = (x: number, y: number) => {
    if (!down) return;
    state.ay += (x - px) * 0.008;
    state.ax += (y - py) * 0.008;
    px = x;
    py = y;
  };
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    start(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', (e) => move(e.clientX, e.clientY));
  canvas.addEventListener('pointerup', () => {
    down = false;
  });
}

// ---------- pointers: one object, many names ----------
const NAMES = ['you', 'elliott', 'tardigrade', 'this page', 'a star', 'a rock', 'the quon'];

function pointers(canvas: HTMLCanvasElement) {
  const spin = { t: 0 };
  let live = true;
  watch(canvas, (v) => {
    live = v;
  });
  const tick = (now: number) => {
    const f = fit(canvas);
    if (f && (live || reduce)) {
      const { ctx, w, h } = f;
      clear(ctx, w, h);
      const t = reduce ? 0.4 : now / 1000;
      const cx = w * 0.5,
        cy = h * 0.52,
        r = Math.min(w, h) * 0.34;
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, r * 1.15);
      g.addColorStop(0, 'rgba(200, 240, 255, 0.95)');
      g.addColorStop(0.18, 'rgba(90, 190, 255, 0.55)');
      g.addColorStop(1, 'rgba(3, 4, 10, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8f6ff';
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '600 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(232,246,255,0.7)';
      ctx.fillText('quon', cx, cy + 22);
      NAMES.forEach((name, i) => {
        const a = t * 0.35 + (i / NAMES.length) * Math.PI * 2;
        const rr = r * (0.72 + 0.08 * Math.sin(t * 0.8 + i));
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr * 0.62;
        ctx.strokeStyle = 'rgba(160, 210, 255, 0.35)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = '#9fd8ff';
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d7e7ff';
        ctx.font = '500 12px Inter, system-ui, sans-serif';
        ctx.fillText(name, x, y - 10);
      });
    }
    if (!reduce) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---------- 3-sphere: Hopf fibres, stereographic ----------
function sphere(canvas: HTMLCanvasElement) {
  const FIB = 36,
    SEG = 72;
  const fibres: number[][][] = [];
  for (let i = 0; i < FIB; i++) {
    const eta = 0.18 + (Math.PI / 2 - 0.36) * ((i * 0.6180339887) % 1);
    const delta = i * 2.399963;
    const c = Math.cos(eta),
      s = Math.sin(eta);
    const pts: number[][] = [];
    for (let j = 0; j <= SEG; j++) {
      const t = (j / SEG) * Math.PI * 2;
      pts.push([c * Math.cos(t), c * Math.sin(t), s * Math.cos(delta + t), s * Math.sin(delta + t)]);
    }
    fibres.push(pts);
  }
  const rot = { ax: 0.2, ay: 0.4, az: 0.15 };
  dragRotate(canvas, rot);
  let live = true;
  watch(canvas, (v) => {
    live = v;
  });
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (live && !reduce) {
      rot.ay += dt * 0.35;
      rot.ax += dt * 0.18;
      rot.az += dt * 0.12;
    }
    const f = fit(canvas);
    if (f && (live || reduce)) {
      const { ctx, w, h } = f;
      clear(ctx, w, h);
      fibres.forEach((pts, i) => {
        const hue = ((i / FIB) * 280 + 190) % 360;
        ctx.strokeStyle = `hsla(${hue}, 80%, 68%, 0.72)`;
        ctx.lineWidth = 1.05;
        ctx.beginPath();
        pts.forEach((p, k) => {
          const q = rot4(p, rot.ay, rot.ax, rot.az);
          const [x, y, z] = project3(q[0], q[1], q[2], q[3], 2.4);
          const [X, Y] = to2(x, y, z, w, h, 3.6);
          if (k === 0) ctx.moveTo(X, Y);
          else ctx.lineTo(X, Y);
        });
        ctx.stroke();
      });
    }
    if (!reduce) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---------- tesseract ----------
function tesseract(canvas: HTMLCanvasElement) {
  const verts: number[][] = [];
  for (let i = 0; i < 16; i++) {
    verts.push([
      i & 1 ? 1 : -1,
      i & 2 ? 1 : -1,
      i & 4 ? 1 : -1,
      i & 8 ? 1 : -1,
    ]);
  }
  const edges: [number, number][] = [];
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      let d = 0;
      for (let k = 0; k < 4; k++) if (verts[i][k] !== verts[j][k]) d++;
      if (d === 1) edges.push([i, j]);
    }
  }
  const rot = { ax: 0.4, ay: 0.55, az: 0.2 };
  dragRotate(canvas, rot);
  let live = true;
  watch(canvas, (v) => {
    live = v;
  });
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (live && !reduce) {
      rot.ay += dt * 0.4;
      rot.ax += dt * 0.22;
      rot.az += dt * 0.16;
    }
    const f = fit(canvas);
    if (f && (live || reduce)) {
      const { ctx, w, h } = f;
      clear(ctx, w, h);
      const pts = verts.map((p) => {
        const q = rot4(p, rot.ay, rot.ax, rot.az);
        const [x, y, z] = project3(q[0] * 0.72, q[1] * 0.72, q[2] * 0.72, q[3] * 0.72, 2.6);
        return to2(x, y, z, w, h, 3.8);
      });
      ctx.lineWidth = 1.35;
      edges.forEach(([a, b]) => {
        const wa = verts[a][3],
          wb = verts[b][3];
        const inner = wa + wb < 0;
        ctx.strokeStyle = inner ? 'rgba(255, 196, 130, 0.55)' : 'rgba(170, 220, 255, 0.85)';
        ctx.beginPath();
        ctx.moveTo(pts[a][0], pts[a][1]);
        ctx.lineTo(pts[b][0], pts[b][1]);
        ctx.stroke();
      });
      pts.forEach(([x, y], i) => {
        ctx.fillStyle = verts[i][3] > 0 ? '#e8f6ff' : '#ffc482';
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    if (!reduce) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---------- three time axes, one now ----------
function times(canvas: HTMLCanvasElement) {
  let live = true;
  watch(canvas, (v) => {
    live = v;
  });
  const tick = (now: number) => {
    const f = fit(canvas);
    if (f && (live || reduce)) {
      const { ctx, w, h } = f;
      clear(ctx, w, h);
      const t = reduce ? 1.2 : now / 1000;
      const cx = w * 0.5,
        cy = h * 0.52;
      const L = Math.min(w, h) * 0.38;
      const axes = [
        { a: 0, label: 't', col: '#9fd8ff' },
        { a: (2 * Math.PI) / 3, label: 'τ', col: '#ffc482' },
        { a: (4 * Math.PI) / 3, label: 'σ', col: '#c9b6ff' },
      ];
      ctx.lineWidth = 1.2;
      axes.forEach((ax) => {
        const x = Math.cos(ax.a) * L,
          y = Math.sin(ax.a) * L * 0.62;
        ctx.strokeStyle = ax.col;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(cx - x, cy - y);
        ctx.lineTo(cx + x, cy + y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = ax.col;
        ctx.font = '600 14px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ax.label, cx + x * 1.12, cy + y * 1.12);
        for (const s of [-0.62, 0.62]) {
          const px = cx + x * s,
            py = cy + y * s;
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = ax.col;
          ctx.strokeRect(px - 10, py - 10, 20, 20);
          ctx.globalAlpha = 1;
        }
      });
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.6);
      ctx.strokeStyle = `rgba(232,246,255,${0.45 + pulse * 0.4})`;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(cx - 16, cy - 16, 32, 32);
      ctx.fillStyle = '#e8f6ff';
      ctx.font = '500 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('one now', cx, cy + 4);
    }
    if (!reduce) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function startMirrora(root: HTMLElement) {
  const q = (id: string) => root.querySelector<HTMLCanvasElement>(id);
  const p = q('#mr-pointers');
  const s = q('#mr-sphere');
  const t = q('#mr-tesseract');
  const m = q('#mr-time');
  if (p) pointers(p);
  if (s) sphere(s);
  if (t) tesseract(t);
  if (m) times(m);
}
