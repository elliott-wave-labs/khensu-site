// Records the real nu.universes flight for its link preview: from just outside Earth's orbit, out past the
// Milky Way and into M33's Hubble mosaic, frame by frame on a virtual clock so the motion is smooth however
// slow the screenshots are. tools/og-flight.sh serves the build, runs this, and lays the card's words over it.
//
// Usage: node tools/og-flight.mjs URL OUT_DIR WIDTH HEIGHT
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(new URL('../sites/khensu-nu/package.json', import.meta.url));
const puppeteer = require('puppeteer-core');
const [url, out, w, h] = process.argv.slice(2);
const fps = 30, hold = 0.4, tail = 0.8;
mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 });
// The site CSP refuses injected styles; this page is only a recorder.
await page.setBypassCSP(true);
await page.evaluateOnNewDocument(() => {
  let t = 0;
  let queue = [];
  performance.now = () => t;
  window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (ms) => { t += ms; const run = queue; queue = []; run.forEach((cb) => cb(t)); };
});
await page.goto(url, { waitUntil: 'networkidle0' });
await page.addStyleTag({
  content: `#uf{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;border-radius:0!important;z-index:2147483647!important;margin:0!important}
  #uf .uf-top,#uf .uf-bottom,#uf .uf-focus,#uf .uf-labels{display:none!important}`,
});
await page.evaluate(() => window.dispatchEvent(new Event('resize')));
// Let the catalogues load and the first frames draw.
for (let i = 0; i < 40; i++) {
  await page.evaluate(() => window.__step(1000 / 30));
  await new Promise((r) => setTimeout(r, 50));
}
const total = Math.round((hold + 4.6 + tail) * fps);
for (let f = 0; f < total; f++) {
  if (f === Math.round(hold * fps)) {
    await page.evaluate(() => document.querySelector('[data-go="Triangulum Galaxy · M33"]').click());
  }
  await page.evaluate(() => window.__step(1000 / 30));
  await page.screenshot({ path: `${out}/${String(f).padStart(4, '0')}.png` });
}
await browser.close();
console.log(`${total} frames in ${out}`);
