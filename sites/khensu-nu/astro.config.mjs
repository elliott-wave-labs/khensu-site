import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { csp, sri } from '../_shared/security/csp.mjs';
import { lowercaseHeadings } from '../_shared/lowercase-headings.mjs';
import { externalLinks } from '../_shared/external-links.mjs';

// <ew-viewer> (model-viewer and three.js) turns textures embedded in a GLB into blob: images and
// renders a static <style> in its shadow root, allowed by the hash its build records.
const release = JSON.parse(readFileSync(new URL('./src/data/ew-viewer-release.json', import.meta.url), 'utf8'));
// nu.eyes try-on runs MediaPipe's face landmarker in WebAssembly from /vendor/mediapipe.
// nu.waves catalogues too large for a site publish (mobygratis stems) live in their own bucket.
const WAVES_MEDIA = 'https://storage.googleapis.com/khensu-waves-media/';
const policy = csp({ wasm: true });
policy.directives = policy.directives.map((d) =>
  d.startsWith('img-src ') ? d.replace("img-src 'self'", "img-src 'self' blob:") : d.startsWith('connect-src ') ? d.replace("connect-src 'self'", `connect-src 'self' blob: ${WAVES_MEDIA}`) : d,
);
policy.styleDirective.hashes = release.styleHashes;
// nu.waves plays the files you add (blob: object URLs from the sealed library), inside the nu.waves app the music on
// the device, served by the app over its own nu-local: scheme, and the hosted catalogue from the media bucket.
policy.directives.push(`media-src 'self' blob: nu-local: ${WAVES_MEDIA}`);

export default defineConfig({
  site: 'https://khensu.nu',
  // Old /sounds path is a real page (sounds.astro) so crawlers get the same OG/Indra
  // meta as waves.khensu.nu before the browser refresh. Product pages stay under dist/
  // for subdomain rewrites on the LB.
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  security: { csp: policy },
  integrations: [
    sitemap({ filter: (page) => !page.includes('/404') && !page.includes('/sounds') }),
    sri(),
    lowercaseHeadings(),
    externalLinks(),
  ],
});
