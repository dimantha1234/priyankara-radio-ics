// Bump the version whenever this file list changes.
const CACHE = 'parts-finder-v3';
const FILES = [
  './', 'index.html', 'styles.css', 'app.js', 'resistor.js', 'lookup.js', 'parts.json', 'manifest.webmanifest',
  'icon-180.png', 'icon-192.png', 'icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

// Only delete our own old caches: other apps may share the github.io origin.
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys
      .filter(k => k.startsWith('parts-finder-') && k !== CACHE)
      .map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Network first, so parts.json edits show up when online; cache when offline.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req)
    .then(res => {
      if (res.ok) {
        const copy = res.clone();
        e.waitUntil(caches.open(CACHE).then(c => c.put(req, copy)));
      }
      return res;
    })
    .catch(() => caches.open(CACHE)
      .then(c => c.match(req, { ignoreSearch: true })
        .then(hit => hit || (req.mode === 'navigate' ? c.match('./') : Response.error())))));
});
