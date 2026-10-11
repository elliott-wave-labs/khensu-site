import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { csp, sri } from '../_shared/security/csp.mjs';
import { lowercaseHeadings } from '../_shared/lowercase-headings.mjs';

export default defineConfig({
  site: 'https://dev.khensu.nu',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  security: { csp: csp() },
  integrations: [sitemap({ filter: (page) => !page.includes('/404') }), sri(), lowercaseHeadings()],
});
