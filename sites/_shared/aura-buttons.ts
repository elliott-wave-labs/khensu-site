const rand = (min: number, max: number) => min + Math.random() * (max - min);

function tune(el: HTMLElement) {
  if (el.dataset.aura) return;
  el.dataset.aura = '1';
  el.style.setProperty('--aura-dur', `${rand(10, 22).toFixed(1)}s`);
  el.style.setProperty('--aura-delay', `${(-rand(0, 22)).toFixed(1)}s`);
  el.style.setProperty('--hue-dur', `${rand(16, 34).toFixed(1)}s`);
  el.style.setProperty('--hue-delay', `${(-rand(0, 34)).toFixed(1)}s`);
  el.style.setProperty('--aura-hue', `${Math.round(rand(-35, 35))}deg`);
}

document.querySelectorAll<HTMLElement>('.btn.primary').forEach(tune);
