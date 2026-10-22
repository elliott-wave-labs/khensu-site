// The hero viewer: the selected frame turning slowly under studio light. Drag sideways to turn it; vertical
// swipes and the wheel scroll the page.

import {
  ACESFilmicToneMapping,
  Group,
  PMREMGenerator,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildGlasses, disposeGlasses } from './glasses';
import { onSelect } from './state';

export function mountViewer(canvas: HTMLCanvasElement) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  gl.setPixelRatio(Math.min(devicePixelRatio, 2));
  gl.toneMapping = ACESFilmicToneMapping;
  gl.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  scene.environment = new PMREMGenerator(gl).fromScene(new RoomEnvironment(), 0.03).texture;
  const camera = new PerspectiveCamera(26, 1, 0.01, 10);
  camera.position.set(0, 0.035, 0.52);
  camera.lookAt(0, 0, -0.02);

  const pivot = new Group();
  pivot.rotation.set(0.12, -0.55, 0);
  scene.add(pivot);
  let glasses: Group | null = null;
  let token = 0;

  onSelect(async (sel) => {
    const mine = ++token;
    const g = await buildGlasses(sel);
    if (mine !== token) return disposeGlasses(g);
    if (glasses) {
      pivot.remove(glasses);
      disposeGlasses(glasses);
    }
    glasses = g;
    // The strap reaches round the back of the head; pull the camera back so it fits.
    g.position.z = sel.frame === 'strap' && sel.strap ? 0.05 : 0.02;
    pivot.add(g);
    canvas.closest('.eyes-stage')?.classList.add('ready');
    if (still) render();
  });

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    gl.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1 ? 34 : 26;
    camera.updateProjectionMatrix();
    render();
  };
  new ResizeObserver(resize).observe(canvas);

  // Horizontal drag turns the frame; the page keeps vertical scrolling (touch-action: pan-y in CSS).
  let dragging = false, lastX = 0, spin = still ? 0 : 0.0035, touched = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    pivot.rotation.y += (e.clientX - lastX) * 0.01;
    lastX = e.clientX;
    touched = performance.now();
    render();
  });
  const up = () => (dragging = false);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  function render() {
    gl.render(scene, camera);
  }

  let visible = false;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !still) requestAnimationFrame(tick);
  }).observe(canvas);
  function tick() {
    if (!visible) return;
    if (!dragging && performance.now() - touched > 2500) pivot.rotation.y += spin;
    render();
    requestAnimationFrame(tick);
  }
}
