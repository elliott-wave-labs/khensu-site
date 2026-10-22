// Head tracking for ñü.mobility (Immersive Mobility): where your head points, and where you are inside
// the bubble, decide where the sounds are — the sounds themselves stay put. Three sources, all on the
// device: the phone's motion sensors (turn the phone as you would your head), the camera (a face detector
// built into the browser, where it exists; frames never leave the device, and your face's place and size
// in the frame become your xyz in the bubble), and AirPods through the nu.waves app, which hands the pose
// and a bounded lean estimate to this page. The pose goes to the Web Audio listener and nowhere else
// (nu-audio.md A6). When ñü.mobility is off the engine ignores all of this — see engine.setMobility.

export type HeadSource = 'off' | 'device' | 'camera' | 'airpods';
/** A place in the bubble, metres: x right, y ahead, z up. */
export type Place = { x: number; y: number; z: number };
/** Radians. Yaw positive turns right, pitch positive looks up, roll positive drops the right ear.
 *  `pos` is the listener's place in the bubble (ñü.mobility xyz), same axes. */
export type Pose = { yaw: number; pitch: number; roll: number; pos: Place };

export const neutralPose = (): Pose => ({ yaw: 0, pitch: 0, roll: 0, pos: { x: 0, y: 0, z: 0 } });

type Listener = (pose: Pose, source: HeadSource) => void;

const TAU = Math.PI * 2;
const wrap = (a: number) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

declare global {
  interface Window {
    __wavesNative?: {
      /** yaw, pitch, roll (radians), then the listener's xyz in metres when the app can estimate it. */
      head?: (yaw: number, pitch: number, roll: number, x?: number, y?: number, z?: number) => void;
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
  raw: Pose = neutralPose();
  /** Smoothed pose, updated each frame. */
  pose: Pose = neutralPose();
  status = '';
  private zero: Pose = neutralPose();
  /** Face width (frame fraction) at recentre, for the camera's move-toward / move-away axis. */
  private zeroFaceW = 0;
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
    this.setRaw({ yaw: (heading * Math.PI) / 180, pitch: Math.max(-0.6, Math.min(0.6, pitch * 0.35)), roll: 0, pos: this.raw.pos });
  };

  constructor() {
    window.__wavesNative = window.__wavesNative ?? {};
    window.__wavesNative.head = (yaw, pitch, roll, x, y, z) => {
      if (this.source !== 'airpods') return;
      const pos = x != null && y != null && z != null ? { x, y, z } : this.raw.pos;
      this.setRaw({ yaw, pitch, roll, pos });
    };
  }

  on(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private setRaw(p: Pose) {
    this.raw = p;
  }

  /** Makes the current direction "ahead" and the current place the bubble's centre.
   *  Every source reports its place already centred (camera: frame centre and recentre face size;
   *  AirPods: the app's lean estimate around zero), so only the direction needs a new zero here. */
  recentre() {
    this.zero = { ...this.raw, pos: { x: 0, y: 0, z: 0 } };
    this.zeroFaceW = 0;
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
            // ñü.mobility xyz from the face itself: lean sideways → x, duck or rise → z, and move
            // toward or away from the camera (the face grows or shrinks) → y, ahead into the bubble.
            // Zeroed at recentre; bounded so a face at the frame's edge is a step, not a teleport.
            const faceW = box.width / w;
            if (!this.zeroFaceW) this.zeroFaceW = faceW;
            const clamp1 = (n: number, m: number) => Math.max(-m, Math.min(m, n));
            const pos: Place = {
              x: clamp1(-((cx - w / 2) / (w / 2)) * 1.1, 1.4),
              y: clamp1((faceW / Math.max(0.05, this.zeroFaceW) - 1) * 1.8, 1.6),
              z: clamp1(-((cy - h / 2) / (h / 2)) * 0.7, 0.9),
            };
            this.setRaw({ yaw, pitch, roll: 0, pos });
          } else if (++lost > 20) {
            this.setRaw(neutralPose());
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
    this.raw = neutralPose();
    this.zero = neutralPose();
    this.pose = neutralPose();
    this.zeroFaceW = 0;
  }

  /** Call once per animation frame: smooths the pose toward the source and tells listeners. */
  frame() {
    const k = this.source === 'airpods' ? 0.35 : 0.14;
    const target: Pose =
      this.source === 'off'
        ? neutralPose()
        : {
            yaw: wrap(this.raw.yaw - this.zero.yaw),
            pitch: this.raw.pitch - this.zero.pitch,
            roll: this.raw.roll - this.zero.roll,
            pos: {
              x: this.raw.pos.x - this.zero.pos.x,
              y: this.raw.pos.y - this.zero.pos.y,
              z: this.raw.pos.z - this.zero.pos.z,
            },
          };
    const kp = Math.min(1, k * 0.7);
    this.pose = {
      yaw: wrap(this.pose.yaw + wrap(target.yaw - this.pose.yaw) * k),
      pitch: this.pose.pitch + (target.pitch - this.pose.pitch) * k,
      roll: this.pose.roll + (target.roll - this.pose.roll) * k,
      pos: {
        x: this.pose.pos.x + (target.pos.x - this.pose.pos.x) * kp,
        y: this.pose.pos.y + (target.pos.y - this.pose.pos.y) * kp,
        z: this.pose.pos.z + (target.pos.z - this.pose.pos.z) * kp,
      },
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
