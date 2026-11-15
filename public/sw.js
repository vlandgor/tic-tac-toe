// Offline shell: network-first for the page, cache-first for hashed assets.
const CACHE = 'shadow-ttt-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  if (!sameOrigin && !isFont) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { const c = res.clone(); caches.open(CACHE).then((ca) => ca.put(req, c)); return res; })
      .catch(() => caches.match(req).then((r) => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok || res.type === 'opaque') { const c = res.clone(); caches.open(CACHE).then((ca) => ca.put(req, c)); }
    return res;
  })));
});
