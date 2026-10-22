// Try-on in the browser. A selfie (or the live camera, where the site allows it) goes to MediaPipe's face landmarker,
// which runs here in WebAssembly from this site's own files; no frame, photo or landmark leaves the device.
// The frame is posed from the landmarks: centred between the irises, sized by their distance (about 63 mm), turned
// with the face. A head-shaped occluder hides the arms where they go behind the head.

import {
  ACESFilmicToneMapping,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PMREMGenerator,
  Quaternion,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { buildGlasses, disposeGlasses } from './glasses';
import { onSelect, selection } from './state';

const IPD = 0.063;
const L_IRIS = 468, R_IRIS = 473, R_OUTER = 33, L_OUTER = 263, BROW = 10, CHIN = 152;

type Mode = 'idle' | 'photo' | 'live';

export function mountTryOn(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>('.tryon-stage')!;
  const photo = root.querySelector<HTMLCanvasElement>('.tryon-photo')!;
  const video = root.querySelector<HTMLVideoElement>('.tryon-video')!;
  const overlay = root.querySelector<HTMLCanvasElement>('.tryon-overlay')!;
  const status = root.querySelector<HTMLElement>('.tryon-status')!;
  const file = root.querySelector<HTMLInputElement>('.tryon-file')!;
  const liveBtn = root.querySelector<HTMLButtonElement>('.tryon-live')!;
  const saveBtn = root.querySelector<HTMLButtonElement>('.tryon-save')!;
  const fit = root.querySelector<HTMLInputElement>('.tryon-fit')!;

  let mode: Mode = 'idle';
  let W = 1, H = 1;
  let landmarker: FaceLandmarker | null = null;
  let loading: Promise<FaceLandmarker> | null = null;
  let stream: MediaStream | null = null;
  let pose: { p: Vector3; q: Quaternion; s: number } | null = null;

  const say = (t: string) => (status.textContent = t);

  // --- three.js overlay in image pixels: x right, y up (−row), z toward the camera.
  const gl = new WebGLRenderer({ canvas: overlay, antialias: true, alpha: true, preserveDrawingBuffer: true });
  gl.setPixelRatio(Math.min(devicePixelRatio, 2));
  gl.toneMapping = ACESFilmicToneMapping;
  gl.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  scene.environment = new PMREMGenerator(gl).fromScene(new RoomEnvironment(), 0.03).texture;
  const camera = new OrthographicCamera(0, 1, 0, -1, 0.1, 1e5);
  const anchor = new Group();
  anchor.visible = false;
  scene.add(anchor);

  // The head, in glasses coordinates (metres): writes depth only, so whatever is behind it disappears.
  const head = new Mesh(new SphereGeometry(1, 40, 24), new MeshBasicMaterial({ colorWrite: false }));
  head.scale.set(0.074, 0.11, 0.1);
  head.position.set(0, -0.01, -0.116);
  head.renderOrder = -1;
  anchor.add(head);

  let glasses: Group | null = null;
  let token = 0;
  onSelect(async (sel) => {
    const mine = ++token;
    const g = await buildGlasses(sel);
    if (mine !== token) return disposeGlasses(g);
    if (glasses) {
      anchor.remove(glasses);
      disposeGlasses(glasses);
    }
    glasses = g;
    anchor.add(g);
    if (mode === 'photo') render();
  });

  function size(w: number, h: number) {
    W = w;
    H = h;
    stage.style.aspectRatio = `${w} / ${h}`;
    camera.left = 0;
    camera.right = w;
    camera.top = 0;
    camera.bottom = -h;
    camera.position.set(0, 0, 4 * Math.max(w, h));
    camera.far = 8 * Math.max(w, h);
    camera.updateProjectionMatrix();
    const r = stage.getBoundingClientRect();
    gl.setSize(r.width || w, r.height || (w ? (r.width * h) / w : h), false);
  }
  new ResizeObserver(() => size(W, H)).observe(stage);

  async function getLandmarker(): Promise<FaceLandmarker> {
    if (landmarker) return landmarker;
    loading ??= (async () => {
      say('loading face tracking (on this device)…');
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const files = await FilesetResolver.forVisionTasks('/vendor/mediapipe');
      const opts = (delegate: 'GPU' | 'CPU') => ({
        baseOptions: { modelAssetPath: '/vendor/mediapipe/face_landmarker.task', delegate },
        runningMode: 'IMAGE' as const,
        numFaces: 1,
      });
      try {
        landmarker = await FaceLandmarker.createFromOptions(files, opts('GPU'));
      } catch {
        landmarker = await FaceLandmarker.createFromOptions(files, opts('CPU'));
      }
      return landmarker;
    })();
    return loading;
  }

  function solve(res: FaceLandmarkerResult) {
    const lm = res.faceLandmarks?.[0];
    if (!lm || lm.length < 478) return null;
    const P = (i: number) => new Vector3(lm[i].x * W, -lm[i].y * H, -lm[i].z * W);
    const li = P(L_IRIS), ri = P(R_IRIS);
    const x = P(L_OUTER).sub(P(R_OUTER)).normalize();
    const up = P(BROW).sub(P(CHIN));
    const z = new Vector3().crossVectors(x, up).normalize();
    const y = new Vector3().crossVectors(z, x).normalize();
    const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
    const s = (li.distanceTo(ri) / IPD) * Number(fit.value);
    // Lens plane about 14 mm in front of the cornea; lens centres sit a little below the pupils.
    const p = li.add(ri).multiplyScalar(0.5).addScaledVector(z, 0.014 * s).addScaledVector(y, -0.003 * s);
    return { p, q, s };
  }

  function apply(next: ReturnType<typeof solve>, smooth: number) {
    if (!next) {
      anchor.visible = false;
      return;
    }
    if (pose && smooth > 0) {
      pose.p.lerp(next.p, 1 - smooth);
      pose.q.slerp(next.q, 1 - smooth);
      pose.s += (next.s - pose.s) * (1 - smooth);
    } else pose = next;
    anchor.visible = true;
    anchor.position.copy(pose.p);
    anchor.quaternion.copy(pose.q);
    anchor.scale.setScalar(pose.s);
  }

  const render = () => gl.render(scene, camera);

  async function usePhoto(f: File) {
    stopLive();
    const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' });
    const max = 1600;
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    photo.width = Math.round(bmp.width * k);
    photo.height = Math.round(bmp.height * k);
    photo.getContext('2d')!.drawImage(bmp, 0, 0, photo.width, photo.height);
    bmp.close();
    mode = 'photo';
    root.dataset.mode = 'photo';
    size(photo.width, photo.height);
    const lm = await getLandmarker();
    await lm.setOptions({ runningMode: 'IMAGE' });
    pose = null;
    const res = lm.detect(photo);
    apply(solve(res), 0);
    render();
    saveBtn.disabled = false;
    say(anchor.visible ? 'drag the size slider to fit. change the frame, finish or lens above.' : 'no face found. try a straight-on photo with your eyes open.');
  }

  async function startLive() {
    if (mode === 'live') return stopLive();
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: false });
    } catch {
      say('the camera is not available on this page. take a selfie instead; it opens the front camera on your phone.');
      return;
    }
    video.srcObject = stream;
    await video.play();
    mode = 'live';
    root.dataset.mode = 'live';
    liveBtn.textContent = 'stop camera';
    size(video.videoWidth, video.videoHeight);
    const lm = await getLandmarker();
    await lm.setOptions({ runningMode: 'VIDEO' });
    pose = null;
    saveBtn.disabled = false;
    say('tracking on this device. nothing is sent anywhere.');
    let last = -1;
    const loop = () => {
      if (mode !== 'live') return;
      if (video.currentTime !== last) {
        last = video.currentTime;
        apply(solve(lm.detectForVideo(video, performance.now())), 0.45);
        render();
      }
      requestAnimationFrame(loop);
    };
    loop();
  }

  function stopLive() {
    if (stream) for (const t of stream.getTracks()) t.stop();
    stream = null;
    video.srcObject = null;
    liveBtn.textContent = 'live camera';
    if (mode === 'live') {
      mode = 'idle';
      root.dataset.mode = 'idle';
      anchor.visible = false;
    }
  }

  function save() {
    const src = mode === 'live' ? video : photo;
    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const g = out.getContext('2d')!;
    if (mode === 'live') {
      g.translate(W, 0);
      g.scale(-1, 1);
    }
    g.drawImage(src, 0, 0, W, H);
    render();
    g.drawImage(overlay, 0, 0, W, H);
    out.toBlob((b) => {
      if (!b) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = `nu-eyes-${selection().frame}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, 'image/png');
  }

  file.addEventListener('change', () => file.files?.[0] && usePhoto(file.files[0]));
  liveBtn.addEventListener('click', startLive);
  saveBtn.addEventListener('click', save);
  fit.addEventListener('input', () => {
    if (mode === 'photo' && landmarker) {
      apply(solve(landmarker.detect(photo)), 0);
      render();
    }
  });
  if (!navigator.mediaDevices?.getUserMedia) liveBtn.hidden = true;
}
