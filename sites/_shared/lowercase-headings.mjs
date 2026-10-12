// Lowercases headings, nav labels, eyebrows and taglines in the built HTML (khensu house style).
// CSS text-transform can't be used: it would turn webË into webë and iPhone into iphone. Here only plainly
// Capitalized words are lowercased; words with their own casing (webË, iPhone, GDPR, ML-KEM, MagSafe, ñüFi),
// the pronoun I and proper nouns in KEEP stay as written. Code inside headings is never touched.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const KEEP = new Set(`
Store Pay USDC Circle Wikimedia Archive Forbes WSJ Commons
Store Pay USDC Circle Wikimedia Archive Forbes WSJ Commons
Apple Google Epic Stripe Mac Siri Android Linux Windows Chromium Bluetooth Raspberry Pi Tor Signal Telegram Instagram
Patreon Substack Spotify Twitch Kimberley Paraíba Earth Moon Mars Europe European America American California Texas
Brazil Canada Québec Japan Korea Australia Zealand India Singapore Africa Switzerland Swiss Virginia Colorado Utah
Liquid Glass Neural Engine Face Touch Pro Max Air Ultra Ceramic Shield Secure Enclave Qi2 Morse Rogers Rust Swift
SwiftUI Go Wasm Elliott Wave Kickstarter Bitcoin Ethereum Monero Zcash Venmo Cash Chime Grammy Oscar Christmas
Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September
October November December English Unicode Fi Fî Bî Føňt IETF
`.split(/\s+/).filter(Boolean));

const WORD = /(?<![\p{L}\p{N}])[\p{L}][\p{L}\p{M}\p{N}'’-]*/gu;

export function lowerWord(w) {
  if (w === 'I' || w.startsWith('I’') || w.startsWith("I'")) return w;
  const first = w[0];
  const rest = w.slice(1);
  if (first === first.toLowerCase() || /\p{N}/u.test(w)) return w;
  if (rest !== rest.toLowerCase()) return w;
  if (KEEP.has(w.replace(/['’]s$/, ''))) return w;
  return w.toLowerCase();
}

export function lowerText(text) {
  return text.replace(WORD, lowerWord);
}

function lowerInner(html) {
  let skip = 0;
  return html
    .split(/(<[^>]+>)/)
    .map((part) => {
      if (part.startsWith('<')) {
        if (/^<(code|kbd|samp|script|style)\b/i.test(part)) skip++;
        else if (/^<\/(code|kbd|samp|script|style)>/i.test(part)) skip = Math.max(0, skip - 1);
        return part;
      }
      return skip ? part : lowerText(part);
    })
    .join('');
}

export function lowerHtml(html) {
  return html
    .replace(/(<(h[1-6])\b[^>]*>)([\s\S]*?)(<\/\2>)/gi, (_, open, _t, inner, close) => open + lowerInner(inner) + close)
    .replace(/(<nav\b[^>]*>)([\s\S]*?)(<\/nav>)/gi, (_, open, inner, close) => open + lowerInner(inner) + close)
    .replace(
      /(<(p|span|div|a)\b[^>]*class="[^"]*\b(tag|eyebrow|label)\b[^"]*"[^>]*>)([\s\S]*?)(<\/\2>)/gi,
      (_, open, _t, _c, inner, close) => open + lowerInner(inner) + close,
    );
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}

export function lowercaseHeadings() {
  return {
    name: 'khensu-lowercase-headings',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        let n = 0;
        for (const file of walk(fileURLToPath(dir))) {
          const html = readFileSync(file, 'utf8');
          const out = lowerHtml(html);
          if (out !== html) {
            writeFileSync(file, out);
            n++;
          }
        }
        logger.info(`lowercased headings in ${n} pages`);
      },
    },
  };
}
