// Scroll-driven scenes. Each [data-scene] element gets --p (0..1, how far the page has scrolled
// through it) and --e (an eased value per scene kind); CSS does all the drawing from those two.
// Without this script the CSS defaults show each scene in its most informative state.

const scenes = [...document.querySelectorAll<HTMLElement>('[data-scene]')];
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};

function update() {
  const vh = innerHeight;
  for (const el of scenes) {
    const kind = el.dataset.scene;
    const r = el.getBoundingClientRect();
    let p: number;
    if (reduce.matches) p = 1;
    else if (kind === 'reveal') p = clamp((vh - r.top) / (vh * 0.85));
    else p = clamp(-r.top / Math.max(1, r.height - vh));

    let e = smooth(p);
    if (kind === 'explode') e = reduce.matches ? 1 : smooth((p - 0.08) / 0.3) - smooth((p - 0.74) / 0.2);
    el.style.setProperty('--p', p.toFixed(4));
    el.style.setProperty('--e', e.toFixed(4));
  }
}

let queued = false;
const schedule = () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    update();
  });
};

if (scenes.length) {
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  reduce.addEventListener('change', update);
  document.documentElement.classList.add('scenes');
  update();
}
