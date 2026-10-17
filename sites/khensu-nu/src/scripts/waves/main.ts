// Boots nu.waves on the page. The service worker (offline shell) is only registered on waves.khensu.nu, where the
// app is its own installable site; on khensu.nu/waves the page works the same without it.

import { App } from './ui';

const root = document.querySelector<HTMLElement>('[data-waves]');
if (root) {
  const app = new App(root);
  void app.boot();
  (window as unknown as { nuWaves?: App }).nuWaves = app;
  if ('serviceWorker' in navigator && location.hostname === 'waves.khensu.nu') {
    addEventListener('load', () =>
      void navigator.serviceWorker
        .register('/waves-sw.js', { scope: '/', updateViaCache: 'none' })
        .then((reg) => reg.update())
        .catch(() => {}),
    );
  }
}
