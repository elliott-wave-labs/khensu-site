import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { csp, sri } from '../_shared/security/csp.mjs';
import { lowercaseHeadings } from '../_shared/lowercase-headings.mjs';
import { externalLinks } from '../_shared/external-links.mjs';

// <ew-viewer> (model-viewer and three.js) turns textures embedded in a GLB into blob: images and
// renders a static <style> in its shadow root, allowed by the hash its build records.
const release = JSON.parse(readFileSync(new URL('./src/data/ew-viewer-release.json', import.meta.url), 'utf8'));
const policy = csp();
policy.directives = policy.directives.map((d) =>
  d.startsWith('img-src ') ? d.replace("img-src 'self'", "img-src 'self' blob:") : d.startsWith('connect-src ') ? d.replace("connect-src 'self'", "connect-src 'self' blob:") : d,
);
policy.styleDirective.hashes = release.styleHashes;

export default defineConfig({
  site: 'https://khensu.nu',
  redirects: { '/sounds': '/waves' },
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  security: { csp: policy },
  integrations: [sitemap({ filter: (page) => !page.includes('/404') }), sri(), lowercaseHeadings(), externalLinks()],
});
