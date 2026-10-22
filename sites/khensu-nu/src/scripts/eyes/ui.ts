// Pickers: frame, finish, lens, print and strap. Every control is a real button or checkbox; changing one never
// scrolls the page.

import { finishesFor, preload, type FrameId } from './glasses';
import { onSelect, select } from './state';

export function mountPickers(root: ParentNode = document) {
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-frame]')) {
    b.addEventListener('pointerenter', () => preload(b.dataset.frame as FrameId), { once: true });
    b.addEventListener('click', () => select({ frame: b.dataset.frame as FrameId }));
  }
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-finish]')) {
    b.addEventListener('click', () => select({ finish: b.dataset.finish }));
  }
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-lens]')) {
    b.addEventListener('click', () => select({ lens: b.dataset.lens }));
  }
  for (const c of root.querySelectorAll<HTMLInputElement>('[data-toggle]')) {
    c.addEventListener('change', () => select({ [c.dataset.toggle!]: c.checked }));
  }
  // Gallery cards pick the frame, then follow their link to the try-on.
  for (const a of root.querySelectorAll<HTMLAnchorElement>('[data-pick]')) {
    a.addEventListener('click', () => select({ frame: a.dataset.pick as FrameId }));
  }

  onSelect((s) => {
    const metal = finishesFor(s.frame)[0].kind === 'metal';
    for (const b of root.querySelectorAll<HTMLElement>('[data-frame]')) b.setAttribute('aria-pressed', String(b.dataset.frame === s.frame));
    for (const g of root.querySelectorAll<HTMLElement>('[data-finishes]')) g.hidden = (g.dataset.finishes === 'metal') !== metal;
    for (const b of root.querySelectorAll<HTMLElement>('[data-finish]')) b.setAttribute('aria-pressed', String(b.dataset.finish === s.finish));
    for (const b of root.querySelectorAll<HTMLElement>('[data-lens]')) b.setAttribute('aria-pressed', String(b.dataset.lens === s.lens));
    for (const c of root.querySelectorAll<HTMLInputElement>('[data-toggle]')) {
      c.checked = Boolean(s[c.dataset.toggle as 'print' | 'strap']);
      if (c.dataset.toggle === 'strap') c.closest('label')!.hidden = s.frame !== 'strap';
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-frame-name]')) {
      el.textContent = document.querySelector<HTMLElement>(`[data-frame="${s.frame}"]`)?.dataset.label ?? s.frame;
    }
  });
}
