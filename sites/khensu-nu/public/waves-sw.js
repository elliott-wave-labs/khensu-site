// Offline shell for waves.khensu.nu only. Caches the app page and its scripts so Home, Library and Channels
// open without a connection; audio you keep is already sealed in IndexedDB. Registered only when the host is
// waves.khensu.nu (see src/scripts/waves/main.ts).

const CACHE = 'nu-waves-v1';
const SHELL = ['/', '/waves.webmanifest', '/icon-192.png', '/icon-512.png', '/favicon.ico', '/seal-128.webp'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Audio and catalogue stay network-first so new releases show up; everything else prefers the cache.
  const audio = /\.(mp3|m4a|mp4|ogg|opus|wav|flac|webm)(\?|$)/i.test(url.pathname) || url.pathname.includes('/catalogue.json');
  if (audio) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone();
          if (res.ok && (url.pathname.startsWith('/_astro/') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname === '/' || url.pathname.endsWith('.webp') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg'))) {
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
