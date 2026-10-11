// ñü.sounds player. The audio element plays untouched (no Web Audio), so Safari hands the 5.1 mix to AirPods
// for spatial rendering. The lights follow per-channel levels measured offline, five frames a second.

type Levels = { fps: number; frames: string[] };

const root = document.querySelector<HTMLElement>('[data-spatial]');
const data = document.getElementById('sp-levels');
if (root && data) {
  const { fps, frames } = JSON.parse(data.textContent || '{}') as Levels;
  const audio = root.querySelector<HTMLAudioElement>('[data-audio]')!;
  const play = root.querySelector<HTMLButtonElement>('[data-play]')!;
  const seek = root.querySelector<HTMLInputElement>('[data-seek]')!;
  const loopBtn = root.querySelector<HTMLButtonElement>('[data-loop]')!;
  const cur = root.querySelector<HTMLElement>('[data-cur]')!;
  const dur = root.querySelector<HTMLElement>('[data-dur]')!;
  const lights = [...root.querySelectorAll<SVGElement>('[data-ch]')].map((el) => ({ el, ch: Number(el.dataset.ch) }));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const level = (i: number, ch: number) => (frames[i] ? (frames[i].charCodeAt(ch) - 48) / 74 : 0);
  let raf = 0;
  let dragging = false;

  const paint = () => {
    const f = audio.currentTime * fps;
    const i = Math.floor(f);
    const k = f - i;
    for (const { el, ch } of lights) {
      const v = audio.paused ? 0 : level(i, ch) * (1 - k) + level(i + 1, ch) * k;
      el.style.opacity = String(0.15 + 0.85 * v);
      el.style.transform = reduce.matches ? '' : `scale(${0.6 + 0.7 * v})`;
    }
    if (!dragging) bar(audio.currentTime);
    cur.textContent = mmss(audio.currentTime);
  };
  const bar = (t: number) => {
    seek.value = String(t);
    seek.style.setProperty('--p', `${(t / (Number(seek.max) || 1)) * 100}%`);
  };
  const tick = () => {
    paint();
    raf = requestAnimationFrame(tick);
  };
  const state = () => {
    const on = !audio.paused;
    const st = on ? 'pause' : audio.ended ? 'replay' : 'play';
    play.dataset.state = st;
    play.setAttribute('aria-label', { play: 'Play', pause: 'Pause', replay: 'Play again' }[st]);
    cancelAnimationFrame(raf);
    if (on) tick();
    else paint();
  };

  loopBtn.addEventListener('click', () => {
    audio.loop = !audio.loop;
    loopBtn.setAttribute('aria-pressed', String(audio.loop));
  });
  play.addEventListener('click', () => {
    if (audio.paused) {
      if (audio.ended) audio.currentTime = 0;
      audio.preload = 'auto';
      audio.play().catch(() => {});
    } else audio.pause();
  });
  audio.addEventListener('play', state);
  audio.addEventListener('pause', state);
  audio.addEventListener('ended', state);
  audio.addEventListener('loadedmetadata', () => {
    seek.max = String(audio.duration);
    dur.textContent = mmss(audio.duration);
  });
  seek.addEventListener('input', () => {
    dragging = true;
    bar(Number(seek.value));
    cur.textContent = mmss(Number(seek.value));
  });
  seek.addEventListener('change', () => {
    dragging = false;
    if (audio.readyState === 0) audio.preload = 'auto';
    audio.currentTime = Number(seek.value);
    paint();
  });
}
