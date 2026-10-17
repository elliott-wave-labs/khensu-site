// Apple SharePlay coordinator for nu.waves (waves.khensu.nu & nu.khensu.waves).
// Bridges:
// 1. Native Apple GroupActivities (SharePlay) on iOS / iPadOS / macOS / visionOS via
//    `webkit.messageHandlers.waves.postMessage({ type: 'shareplay', ... })` and `window.__wavesNative.shareplay`.
// 2. Web / Safari FaceTime & Messages SharePlay sessions (`#/t/<trackId>?shareplay=<sessionId>&t=<sec>&scene=<code>`),
//    synchronizing play/pause/seek, track selection, room venue, audio mode, Apple Speech word-pop lyrics, and
//    real-time 3D spacetime bubble™ stem movements across participants.
// 3. System MediaSession API (`navigator.mediaSession`) so iOS/macOS Control Center, Lock Screen, Dynamic Island,
//    AirPlay, and FaceTime Handoff stay locked to the current track and timecode.

import type { Pos } from '../../data/waves';
import type { Engine } from './engine';
import { capture as captureScene, decodeShare, encodeShare } from './scene';

export type SharePlayPacket = {
  sessionId: string;
  senderId: string;
  ts: number;
  kind: 'state' | 'play' | 'pause' | 'seek' | 'track' | 'move-obj' | 'venue' | 'ping';
  trackId?: string;
  pos?: number;
  playing?: boolean;
  venueId?: string;
  mode?: 'orig' | 'bed' | 'waves';
  objIndex?: number;
  objLabel?: string;
  objPos?: Pos;
  sceneCode?: string;
};

type NativeWavesHook = {
  shell?: boolean;
  shareplay?: (payload: SharePlayPacket | { type?: string; event?: string; sessionId?: string; trackId?: string; url?: string; state?: SharePlayPacket }) => void;
};

export class SharePlayCoordinator {
  active = false;
  sessionId = '';
  onChange: (() => void) | null = null;

  private senderId = `p-${Math.random().toString(36).slice(2, 8)}`;
  private chan: BroadcastChannel | null = null;
  private applyingRemote = false;
  private lastBroadcastAt = 0;

  constructor(
    private engine: Engine,
    private getOrigin: () => string,
    private toast: (msg: string) => void,
    private onRemoteTrack: (trackId: string, startSec: number, sceneCode?: string) => void,
  ) {
    this.installNativeHook();
    this.installMediaSession();
    this.joinSessionFromUrl();

    window.addEventListener('hashchange', () => this.joinSessionFromUrl());
    window.addEventListener('storage', (e) => {
      if (this.sessionId && e.key === `nu.waves.shareplay.${this.sessionId}` && e.newValue) {
        try {
          void this.handlePacket(JSON.parse(e.newValue) as SharePlayPacket);
        } catch {
          /* ignore */
        }
      }
    });
  }

  private ensureSessionId(): string {
    if (!this.sessionId) {
      this.sessionId = `sp-${Math.random().toString(36).slice(2, 8)}`;
    }
    return this.sessionId;
  }

  buildSharePlayUrl(sid = this.sessionId || this.ensureSessionId()): string {
    const t = this.engine.track;
    const trackId = t?.id || 'first-attempt';
    const pos = Math.max(0, Math.round(this.engine.position() || 0));
    const snap = captureScene(trackId, 'SharePlay 3D', this.engine.venue.id, this.engine.fx, this.engine.mode, this.engine.objs());
    const code = encodeShare(snap);
    const base = this.getOrigin().replace(/\/$/, '');
    return `${base}/${encodeURIComponent(trackId)}?shareplay=${encodeURIComponent(sid)}&t=${pos}&scene=${encodeURIComponent(code)}`;
  }

  async startOrToggle() {
    const sid = this.ensureSessionId();
    this.joinChannel(sid);
    this.active = true;
    this.onChange?.();

    const t = this.engine.track;
    const url = this.buildSharePlayUrl(sid);
    const pkt = this.snapshotPacket('state');

    this.postNative('start', pkt, url);
    this.sendPacket(pkt);

    try {
      await navigator.clipboard?.writeText(url);
    } catch {
      /* ignore */
    }

    const title = `${t?.title ?? 'First Attempt'} · Apple SharePlay on ñü.ŵævẽš`;
    const text = `Listen together in the 3D spacetime bubble™ with synchronized word-pop lyrics on ñü.ŵævẽš`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        this.toast('Apple SharePlay session live — synced in 3D.');
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') {
          this.toast('SharePlay session active — link copied for FaceTime or iMessage.');
          return;
        }
      }
    }
    this.toast('Apple SharePlay session active — link copied for FaceTime or iMessage.');
  }

  async copySessionLink(): Promise<string> {
    const sid = this.ensureSessionId();
    if (!this.active) {
      this.joinChannel(sid);
      this.active = true;
      this.onChange?.();
    }
    const url = this.buildSharePlayUrl(sid);
    try {
      await navigator.clipboard?.writeText(url);
      this.toast('SharePlay session link copied — paste in FaceTime or iMessage to listen together.');
    } catch {
      this.toast(`SharePlay link: ${url}`);
    }
    return url;
  }

  leave() {
    if (this.chan) {
      this.chan.close();
      this.chan = null;
    }
    this.postNative('leave', this.snapshotPacket('state'), '');
    this.active = false;
    this.onChange?.();
    this.toast('Ended Apple SharePlay session.');
  }

  broadcast(kind: SharePlayPacket['kind'], extra?: Partial<SharePlayPacket>) {
    this.updateMediaSession();
    if (!this.active || this.applyingRemote) return;
    const pkt: SharePlayPacket = {
      ...this.snapshotPacket(kind),
      ...extra,
    };
    this.sendPacket(pkt);
    this.postNative('sync', pkt, this.buildSharePlayUrl());
  }

  broadcastMoveObj(objIndex: number, objPos: Pos) {
    if (!this.active || this.applyingRemote) return;
    const now = performance.now();
    if (now - this.lastBroadcastAt < 45) return;
    this.lastBroadcastAt = now;
    const obj = this.engine.objs()[objIndex];
    const pkt: SharePlayPacket = {
      ...this.snapshotPacket('move-obj'),
      objIndex,
      objLabel: obj?.label,
      objPos: { ...objPos },
    };
    this.sendPacket(pkt);
    this.postNative('sync', pkt, this.buildSharePlayUrl());
  }

  joinSessionFromUrl() {
    const hashQs = location.hash.includes('?') ? location.hash.slice(location.hash.indexOf('?') + 1) : '';
    const searchQs = location.search.replace(/^\?/, '');
    const q = new URLSearchParams([searchQs, hashQs].filter(Boolean).join('&'));
    const sid = q.get('shareplay');
    if (!sid) return;
    const cleanSid = sid === '1' ? 'live' : sid;
    if (this.sessionId !== cleanSid || !this.active) {
      this.sessionId = cleanSid;
      this.active = true;
      this.joinChannel(cleanSid);
      this.onChange?.();
      this.toast(`Joined Apple SharePlay 3D session (${cleanSid}).`);
    }
  }

  private snapshotPacket(kind: SharePlayPacket['kind']): SharePlayPacket {
    const trackId = this.engine.track?.id ?? 'first-attempt';
    const snap = captureScene(trackId, 'SharePlay 3D', this.engine.venue.id, this.engine.fx, this.engine.mode, this.engine.objs());
    return {
      sessionId: this.sessionId || this.ensureSessionId(),
      senderId: this.senderId,
      ts: Date.now(),
      kind,
      trackId,
      pos: this.engine.position(),
      playing: this.engine.playing,
      venueId: this.engine.venue.id,
      mode: this.engine.mode,
      sceneCode: encodeShare(snap),
    };
  }

  private joinChannel(sid: string) {
    if (this.chan) {
      this.chan.close();
      this.chan = null;
    }
    this.sessionId = sid;
    if (typeof BroadcastChannel !== 'undefined') {
      this.chan = new BroadcastChannel(`nu.waves.shareplay.${sid}`);
      this.chan.onmessage = (ev) => {
        if (ev.data) void this.handlePacket(ev.data as SharePlayPacket);
      };
    }
    this.sendPacket(this.snapshotPacket('ping'));
  }

  private sendPacket(pkt: SharePlayPacket) {
    if (!this.sessionId) return;
    try {
      this.chan?.postMessage(pkt);
    } catch {
      /* ignore */
    }
    try {
      localStorage.setItem(`nu.waves.shareplay.${this.sessionId}`, JSON.stringify(pkt));
    } catch {
      /* ignore */
    }
  }

  private async handlePacket(pkt: SharePlayPacket) {
    if (!pkt || pkt.senderId === this.senderId) return;
    if (pkt.sessionId && this.sessionId && pkt.sessionId !== this.sessionId) return;
    if (pkt.kind === 'ping') return;

    this.applyingRemote = true;
    try {
      if (pkt.trackId && this.engine.track?.id !== pkt.trackId) {
        this.onRemoteTrack(pkt.trackId, pkt.pos ?? 0, pkt.sceneCode);
      } else {
        if (typeof pkt.pos === 'number' && Math.abs(this.engine.position() - pkt.pos) > 0.35) {
          this.engine.seek(pkt.pos);
        }
        if (pkt.kind === 'play' || (pkt.kind === 'state' && pkt.playing && !this.engine.playing)) {
          await this.engine.play();
        } else if (pkt.kind === 'pause' || (pkt.kind === 'state' && pkt.playing === false && this.engine.playing)) {
          this.engine.pause();
        }
      }

      if (pkt.venueId && pkt.venueId !== this.engine.venue.id) {
        this.engine.setVenue(pkt.venueId);
      }
      if (pkt.mode && pkt.mode !== this.engine.mode) {
        this.engine.setMode(pkt.mode);
      }
      if (pkt.kind === 'move-obj' && typeof pkt.objIndex === 'number' && pkt.objPos) {
        const objs = this.engine.objs();
        const target = objs[pkt.objIndex] ?? objs.find((o) => o.label === pkt.objLabel);
        if (target) {
          this.engine.moveObj(target, pkt.objPos);
        }
      } else if (pkt.sceneCode) {
        const sc = decodeShare(pkt.sceneCode);
        if (sc) this.engine.applyScene(sc);
      }
      this.onChange?.();
    } finally {
      this.applyingRemote = false;
    }
  }

  private installNativeHook() {
    const w = window as unknown as { __wavesNative?: NativeWavesHook };
    w.__wavesNative = w.__wavesNative || {};
    w.__wavesNative.shareplay = (payload) => {
      if (!payload) return;
      if ('type' in payload && payload.type === 'joined') {
        this.active = true;
        this.joinChannel(this.sessionId || this.ensureSessionId());
        if (payload.trackId) this.onRemoteTrack(payload.trackId, 0);
        this.onChange?.();
        this.toast('Apple SharePlay connected via GroupActivities.');
        return;
      }
      if ('event' in payload) {
        if (payload.sessionId) this.sessionId = payload.sessionId;
        if (payload.event === 'joined') {
          this.active = true;
          this.joinChannel(this.sessionId || this.ensureSessionId());
          this.toast('Apple SharePlay connected via GroupActivities.');
        } else if (payload.event === 'left') {
          this.active = false;
        }
        if (payload.state) void this.handlePacket(payload.state);
        this.onChange?.();
      } else {
        void this.handlePacket(payload as SharePlayPacket);
      }
    };
  }

  private postNative(action: 'start' | 'sync' | 'leave', payload: SharePlayPacket, url: string) {
    try {
      const webkit = (window as unknown as { webkit?: { messageHandlers?: { waves?: { postMessage: (msg: unknown) => void } } } }).webkit;
      webkit?.messageHandlers?.waves?.postMessage({
        type: 'shareplay',
        action,
        trackId: this.engine.track?.id ?? 'first-attempt',
        url,
        title: this.engine.track?.title ?? 'First Attempt (Demo)',
        artist: this.engine.track?.artistName ?? 'khėnsu.ñü',
        payload,
      });
    } catch {
      /* ignore when outside native shell */
    }
  }

  installMediaSession() {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        void this.engine.play().then(() => this.broadcast('play'));
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.engine.pause();
        this.broadcast('pause');
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        void this.engine.prev().then(() => this.broadcast('track'));
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        void this.engine.next().then(() => this.broadcast('track'));
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (typeof details.seekTime === 'number') {
          this.engine.seek(details.seekTime);
          this.broadcast('seek', { pos: details.seekTime });
        }
      });
    } catch {
      /* ignore */
    }
  }

  updateMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const t = this.engine.track;
    if (!t) return;
    try {
      const art = t.artUrl || '/khensu/sounds/first-attempt.webp';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title,
        artist: t.artistName || 'khėnsu.ñü',
        album: t.albumTitle || 'ñü.ŵævẽš',
        artwork: [{ src: art, sizes: '512x512', type: 'image/webp' }],
      });
      navigator.mediaSession.playbackState = this.engine.playing ? 'playing' : 'paused';
    } catch {
      /* ignore */
    }
  }

  updatePositionState() {
    if (!('mediaSession' in navigator)) return;
    try {
      const dur = this.engine.duration();
      const pos = this.engine.position();
      if (Number.isFinite(dur) && dur > 0 && Number.isFinite(pos)) {
        navigator.mediaSession.setPositionState?.({
          duration: dur,
          playbackRate: 1,
          position: Math.max(0, Math.min(dur, pos)),
        });
      }
    } catch {
      /* ignore */
    }
  }
}
