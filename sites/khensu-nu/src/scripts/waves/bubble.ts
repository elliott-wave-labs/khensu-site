// The spacetime bubble: the orb with every sound of the playing track inside it. Drag a sound to move it, drag the
// bubble to look around, use the arrow keys (Page Up and Down for height), clone or remove the selected sound.
// Works mid-listen: every move goes straight to the engine's panners.

import { createOrb, type Orb } from '../orb';
import type { Engine, Obj } from './engine';
import type { Pos } from '../../data/waves';

const MAX_R = 4;
const DIRS: Record<string, Pos> = {
  ahead: { x: 0, y: MAX_R * 1.12, z: 0 },
  behind: { x: 0, y: -MAX_R * 1.12, z: 0 },
  above: { x: 0, y: 0, z: MAX_R * 1.1 },
  below: { x: 0, y: 0, z: -MAX_R * 1.1 },
};

type NodeEl = { root: HTMLElement; btn: HTMLButtonElement; label: HTMLElement; obj: Obj };

export class Bubble {
  private orb: Orb | null;
  private nodes = new Map<Obj, NodeEl>();
  private dirs: HTMLElement[];
  private held: Obj | null = null;
  private orbiting: { x: number; y: number } | null = null;
  private swell = 0;
  private visible = true;
  private reduce = matchMedia('(prefers-reduced-motion: reduce)');
  private idleTimer = 0;
  showFacing = false;
  onSelect: ((o: Obj | null) => void) | null = null;

  constructor(
    private ring: HTMLElement,
    private engine: Engine,
    private height?: HTMLInputElement,
    private heightOut?: HTMLElement,
  ) {
    const canvas = ring.querySelector<HTMLCanvasElement>('canvas')!;
    this.orb = createOrb(canvas, MAX_R);
    if (!this.orb) canvas.remove();
    this.dirs = [...ring.querySelectorAll<HTMLElement>('[data-dir]')];
    new IntersectionObserver(([e]) => (this.visible = e.isIntersecting)).observe(ring);

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.orbiting = { x: e.clientX, y: e.clientY };
      this.idle();
    });
    addEventListener('pointermove', (e) => {
      if (this.held && this.orb) {
        engine.moveObj(this.held, this.orb.drag(e.clientX, e.clientY, this.held.pos));
        this.select(this.held, false);
      } else if (this.orbiting && this.orb) {
        this.orb.orbit(e.clientX - this.orbiting.x, e.clientY - this.orbiting.y);
        this.orbiting = { x: e.clientX, y: e.clientY };
      }
    });
    const release = () => {
      this.held && this.nodes.get(this.held)?.btn.classList.remove('drag');
      this.held = null;
      this.orbiting = null;
      this.idle();
    };
    addEventListener('pointerup', release);
    addEventListener('pointercancel', release);
    ring.addEventListener('click', (e) => {
      const el = e.target as HTMLElement;
      if (el.closest('[data-clone]')) {
        if (engine.selected) void engine.cloneObj(engine.selected);
      } else if (el.closest('[data-remove]')) {
        if (engine.selected) engine.removeObj(engine.selected);
      }
    });
    height?.addEventListener('input', () => {
      const o = engine.selected;
      if (!o || o.kind === 'direct') return;
      engine.moveObj(o, { ...o.pos, z: Number(height.value) });
      this.select(o, false);
    });
    engine.on(() => this.sync());
    this.sync();
    this.idle();
  }

  private idle() {
    clearTimeout(this.idleTimer);
    const busy = this.engine.playing || this.held || this.orbiting || this.reduce.matches;
    if (busy) {
      this.ring.dataset.idle = '0';
      return;
    }
    this.idleTimer = window.setTimeout(() => (this.ring.dataset.idle = '1'), 700);
  }

  /** Rebuilds the node buttons to match the engine's sounds. */
  sync() {
    const objs = this.engine.objs();
    for (const [o, n] of this.nodes) {
      if (!objs.includes(o)) {
        n.root.remove();
        this.nodes.delete(o);
      }
    }
    for (const o of objs) {
      if (this.nodes.has(o)) continue;
      const root = document.createElement('div');
      root.className = 'wv-bubble';
      root.innerHTML = `<button type="button" class="wv-node" aria-pressed="false"><i aria-hidden="true"></i><span></span></button><span class="wv-tools"><button type="button" data-clone>Clone</button><button type="button" data-remove>Remove</button></span>`;
      const btn = root.querySelector<HTMLButtonElement>('.wv-node')!;
      const label = btn.querySelector('span')!;
      btn.style.setProperty('--mark', o.mark);
      label.textContent = o.label;
      btn.setAttribute('aria-label', `${o.label}: drag to move, arrow keys to nudge`);
      btn.addEventListener('pointerdown', (e) => {
        if (o.kind === 'direct') return;
        e.preventDefault();
        this.held = o;
        btn.classList.add('drag');
        this.select(o);
        this.idle();
      });
      btn.addEventListener('focus', () => this.select(o, false));
      btn.addEventListener('keydown', (e) => {
        if (o.kind === 'direct') return;
        const p = { ...o.pos };
        const step = e.shiftKey ? 0.5 : 0.1;
        const k: Record<string, () => void> = {
          ArrowLeft: () => (p.x -= step),
          ArrowRight: () => (p.x += step),
          ArrowUp: () => (p.y += step),
          ArrowDown: () => (p.y -= step),
          PageUp: () => (p.z = Math.min(3, p.z + step)),
          PageDown: () => (p.z = Math.max(-3, p.z - step)),
          Delete: () => this.engine.removeObj(o),
          Backspace: () => this.engine.removeObj(o),
        };
        if (!k[e.key]) return;
        e.preventDefault();
        k[e.key]();
        if (this.engine.objs().includes(o)) {
          this.engine.moveObj(o, p);
          this.select(o, false);
        }
      });
      this.ring.appendChild(root);
      this.nodes.set(o, { root, btn, label, obj: o });
    }
    const sel = this.engine.selected && objs.includes(this.engine.selected) ? this.engine.selected : (objs[0] ?? null);
    this.paintSelection(sel);
    this.idle();
  }

  select(o: Obj | null, notify = true) {
    if (o && o !== this.engine.selected) this.engine.selected = o;
    this.paintSelection(o);
    if (notify) this.onSelect?.(o);
  }

  private paintSelection(sel: Obj | null) {
    const canRemove = this.engine.canRemove();
    for (const [o, n] of this.nodes) {
      const on = o === sel;
      n.btn.setAttribute('aria-pressed', String(on));
      n.root.querySelector<HTMLButtonElement>('[data-remove]')!.disabled = !canRemove || o.kind === 'direct';
      n.root.querySelector<HTMLButtonElement>('[data-clone]')!.disabled = o.kind === 'direct';
      n.root.classList.toggle('is-direct', o.kind === 'direct');
    }
    if (this.height && sel) {
      this.height.value = sel.pos.z.toFixed(1);
      this.height.disabled = sel.kind === 'direct';
      if (this.heightOut) this.heightOut.textContent = sel.kind === 'direct' ? `${sel.label} · in each ear` : `${sel.label} · ${sel.pos.z >= 0 ? '+' : ''}${sel.pos.z.toFixed(1)} m`;
    }
  }

  frame(now: number) {
    const objs = this.engine.objs();
    let total = 0;
    for (const o of objs) total += o.level;
    this.swell = this.swell * 0.85 + Math.min(1, total / 3) * 0.15;
    if (!this.orb || !this.visible) return;
    const motion = !this.reduce.matches;
    this.orb.facing(this.showFacing ? this.engine.pose : null);
    this.orb.frame(
      motion ? now / 1000 : 0,
      objs.filter((o) => o.kind !== 'direct').map((o) => ({ pos: o.pos, level: motion ? o.level : 0 })),
      motion ? this.swell : 0,
    );
    for (const o of objs) {
      const n = this.nodes.get(o);
      if (!n) continue;
      const p = this.orb.project(o.kind === 'direct' ? { x: 0, y: 0, z: 0.6 } : o.pos);
      n.root.style.left = `${p.x}px`;
      n.root.style.top = `${p.y}px`;
      n.root.style.zIndex = String((o === this.engine.selected ? 30 : 1) + Math.round(p.near * 10));
      n.root.style.setProperty('--near', p.near.toFixed(3));
      n.root.style.setProperty('--lvl', motion ? o.level.toFixed(3) : '0');
      n.btn.dataset.live = motion && o.level > 0.08 ? '1' : '0';
    }
    for (const d of this.dirs) {
      const p = this.orb.project(DIRS[d.dataset.dir!]);
      d.style.left = `${p.x}px`;
      d.style.top = `${p.y}px`;
    }
  }
}
