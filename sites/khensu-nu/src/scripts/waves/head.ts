// Head tracking: where your head points decides where the sounds are. Three sources, all on the device:
// the phone's motion sensors (turn the phone as you would your head), the camera (a face detector built into the
// browser, where it exists; frames never leave the device), and AirPods through the nu.waves app, which hands
// the pose to this page. The pose goes to the Web Audio listener and nowhere else (nu-audio.md A6).

export type HeadSource = 'off' | 'device' | 'camera' | 'airpods';
/** Radians. Yaw positive turns right, pitch positive looks up, roll positive drops the right ear. */
export type Pose = { yaw: number; pitch: number; roll: number };

type Listener = (pose: Pose, source: HeadSource) => void;

const TAU = Math.PI * 2;
const wrap = (a: number) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

declare global {
  interface Window {
    __wavesNative?: {
      head?: (yaw: number, pitch: number, roll: number) => void;
      [k: string]: unknown;
    };
    webkit?: { messageHandlers?: Record<string, { postMessage: (m: unknown) => void }> };
  }
  interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
    webkitCompassHeading?: number;
  }
  // Shape Detection API (Chromium).
  class FaceDetector {
    constructor(opts?: { fastMode?: boolean; maxDetectedFaces?: number });
    detect(src: ImageBitmapSource): Promise<{ boundingBox: DOMRectReadOnly; landmarks?: { type: string; locations: { x: number; y: number }[] }[] }[]>;
  }
}

export const nativeBridge = () => window.webkit?.messageHandlers?.waves ?? null;
export const hasNative = () => !!nativeBridge();
export const hasDeviceMotion = () => typeof DeviceOrientationEvent !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
export const hasCamera = () => typeof FaceDetector !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

export class HeadTracker {
  source: HeadSource = 'off';
  /** Raw pose from the source, before smoothing. */
  raw: Pose = { yaw: 0, pitch: 0, roll: 0 };
  /** Smoothed pose, updated each frame. */
  pose: Pose = { yaw: 0, pitch: 0, roll: 0 };
  status = '';
  private zero: Pose = { yaw: 0, pitch: 0, roll: 0 };
  private listeners = new Set<Listener>();
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private cameraTimer = 0;
  private onOrient = (e: DeviceOrientationEvent) => {
    const ios = e as DeviceOrientationEventiOS;
    const heading = typeof ios.webkitCompassHeading === 'number' ? ios.webkitCompassHeading : e.alpha == null ? null : 360 - e.alpha;
    if (heading == null) return;
    // Beta is the tilt of the phone toward or away from you; a small share of it reads as looking up or down.
    const pitch = e.beta == null ? 0 : ((e.beta - 90) * Math.PI) / 180;
    this.setRaw({ yaw: (heading * Math.PI) / 180, pitch: Math.max(-0.6, Math.min(0.6, pitch * 0.35)), roll: 0 });
  };

  constructor() {
    window.__wavesNative = window.__wavesNative ?? {};
    window.__wavesNative.head = (yaw, pitch, roll) => {
      if (this.source === 'airpods') this.setRaw({ yaw, pitch, roll });
    };
  }

  on(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private setRaw(p: Pose) {
    this.raw = p;
  }

  /** Makes the current direction "ahead". */
  recentre() {
    this.zero = { ...this.raw };
  }

  async start(source: HeadSource): Promise<boolean> {
    await this.stop();
    this.source = source;
    this.status = '';
    if (source === 'off') return true;
    if (source === 'device') {
      try {
        const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> };
        if (typeof DOE.requestPermission === 'function') {
          const r = await DOE.requestPermission();
          if (r !== 'granted') {
            this.status = 'Motion access was declined.';
            this.source = 'off';
            return false;
          }
        }
      } catch {
        this.status = 'Motion access needs a tap first.';
        this.source = 'off';
        return false;
      }
      addEventListener('deviceorientation', this.onOrient, true);
      this.status = 'Turn the phone as you would your head. Recentre to set “ahead”.';
      // Zero once the first reading arrives.
      const once = () => {
        this.recentre();
        removeEventListener('deviceorientation', once, true);
      };
      addEventListener('deviceorientation', once, true);
      return true;
    }
    if (source === 'camera') {
      if (!hasCamera()) {
        this.status = 'This browser has no built-in face detector.';
        this.source = 'off';
        return false;
      }
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 }, audio: false });
      } catch {
        this.status = 'Camera access was declined.';
        this.source = 'off';
        return false;
      }
      const v = document.createElement('video');
      v.muted = true;
      v.playsInline = true;
      v.srcObject = this.stream;
      await v.play().catch(() => {});
      this.video = v;
      const det = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      let lost = 0;
      const tick = async () => {
        if (this.source !== 'camera' || !this.video) return;
        try {
          const faces = await det.detect(this.video);
          const f = faces[0];
          if (f) {
            lost = 0;
            const w = this.video.videoWidth || 320;
            const h = this.video.videoHeight || 240;
            const box = f.boundingBox;
            const cx = box.x + box.width / 2;
            const cy = box.y + box.height / 2;
            // Facing from the landmarks when the detector gives them (eyes and nose or mouth); otherwise from
            // where the face sits in the frame, so leaning left or right still looks around.
            const eyes = f.landmarks?.filter((l) => l.type === 'eye') ?? [];
            const nose = f.landmarks?.find((l) => l.type === 'nose') ?? f.landmarks?.find((l) => l.type === 'mouth');
            let yaw: number;
            if (eyes.length === 2 && nose) {
              const ex = (eyes[0].locations[0].x + eyes[1].locations[0].x) / 2;
              const ew = Math.abs(eyes[0].locations[0].x - eyes[1].locations[0].x) || 1;
              const nx = nose.locations[0].x;
              // The camera mirrors you: nose to the frame's right means you turned left.
              yaw = -Math.asin(Math.max(-1, Math.min(1, ((nx - ex) / ew) * 1.6)));
            } else {
              yaw = -((cx - w / 2) / (w / 2)) * 0.9;
            }
            const pitch = -((cy - h / 2) / (h / 2)) * 0.5;
            this.setRaw({ yaw, pitch, roll: 0 });
          } else if (++lost > 20) {
            this.setRaw({ yaw: 0, pitch: 0, roll: 0 });
          }
        } catch {
          /* a frame can fail to decode; try the next one */
        }
        this.cameraTimer = window.setTimeout(tick, 66);
      };
      this.status = 'Face tracking runs in this browser. Frames never leave the device.';
      void tick();
      return true;
    }
    if (source === 'airpods') {
      const bridge = nativeBridge();
      if (!bridge) {
        this.status = 'AirPods head tracking needs the nu.waves app.';
        this.source = 'off';
        return false;
      }
      bridge.postMessage({ type: 'head', on: true });
      this.status = 'Head tracking from your AirPods, through the nu.waves app.';
      return true;
    }
    return false;
  }

  async stop() {
    removeEventListener('deviceorientation', this.onOrient, true);
    clearTimeout(this.cameraTimer);
    if (this.source === 'airpods') nativeBridge()?.postMessage({ type: 'head', on: false });
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    this.source = 'off';
    this.raw = { yaw: 0, pitch: 0, roll: 0 };
    this.zero = { yaw: 0, pitch: 0, roll: 0 };
    this.pose = { yaw: 0, pitch: 0, roll: 0 };
  }

  /** Call once per animation frame: smooths the pose toward the source and tells listeners. */
  frame() {
    const k = this.source === 'airpods' ? 0.35 : 0.14;
    const target: Pose = this.source === 'off' ? { yaw: 0, pitch: 0, roll: 0 } : { yaw: wrap(this.raw.yaw - this.zero.yaw), pitch: this.raw.pitch - this.zero.pitch, roll: this.raw.roll - this.zero.roll };
    this.pose = {
      yaw: wrap(this.pose.yaw + wrap(target.yaw - this.pose.yaw) * k),
      pitch: this.pose.pitch + (target.pitch - this.pose.pitch) * k,
      roll: this.pose.roll + (target.roll - this.pose.roll) * k,
    };
    for (const l of this.listeners) l(this.pose, this.source);
  }
}

/** Forward and up vectors for the Web Audio listener (x right, y up, z toward you). */
export function listenerVectors(p: Pose) {
  const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
  const cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
  const cr = Math.cos(p.roll), sr = Math.sin(p.roll);
  // forward0 = (0, 0, -1); pitch about x, then yaw about y.
  const f = { x: 0, y: sp, z: -cp };
  const forward = { x: f.x * cy - f.z * sy, y: f.y, z: f.x * sy + f.z * cy };
  // up0 = (0, 1, 0); roll about z, pitch about x, yaw about y.
  const u1 = { x: -sr, y: cr, z: 0 };
  const u2 = { x: u1.x, y: u1.y * cp - u1.z * sp, z: u1.y * sp + u1.z * cp };
  const up = { x: u2.x * cy - u2.z * sy, y: u2.y, z: u2.x * sy + u2.z * cy };
  return { forward, up };
}
