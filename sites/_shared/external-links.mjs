// Opens every link that leaves khensu.nu (and its subdomains) in a new tab, in the built HTML, so pages never
// need to remember target="_blank". Links already carrying a target are left as written.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OURS = /^(?:[a-z0-9-]+\.)*khensu\.nu$/i;

export function isExternal(href) {
  const m = /^(?:https?:)?\/\/([^/:?#]+)/i.exec(href);
  return !!m && !OURS.test(m[1]);
}

export function externalHtml(html) {
  return html.replace(/<a\b[^>]*>/gi, (tag) => {
    const href = /\shref="([^"]*)"/i.exec(tag)?.[1];
    if (!href || !isExternal(href) || /\starget=/i.test(tag)) return tag;
    const rel = /\srel="([^"]*)"/i.exec(tag);
    const withRel = rel
      ? tag.replace(rel[0], ` rel="${[...new Set([...rel[1].split(/\s+/), 'noopener', 'noreferrer'].filter(Boolean))].join(' ')}"`)
      : tag.replace(/>$/, ' rel="noopener noreferrer">');
    return withRel.replace(/>$/, ' target="_blank">');
  });
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}

export function externalLinks() {
  return {
    name: 'khensu-external-links',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        let n = 0;
        for (const file of walk(fileURLToPath(dir))) {
          const html = readFileSync(file, 'utf8');
          const out = externalHtml(html);
          if (out !== html) {
            writeFileSync(file, out);
            n++;
          }
        }
        logger.info(`external links open in a new tab on ${n} pages`);
      },
    },
  };
}
