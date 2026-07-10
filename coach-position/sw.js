const CACHE = 'coach-position-v52';
const SHELL = ['./', './index.html', './manifest.json', './icon.svg', './firebase-messaging-sw.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Share Target: intercept POST from WhatsApp / other apps
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname.endsWith('index.html')) {
    event.respondWith((async () => {
      const formData = await event.request.formData();
      const files = formData.getAll('image');
      if (files.length) {
        const shareCache = await caches.open('cp-share-target');
        await Promise.all(files.map((f, i) =>
          shareCache.put(`shared-image-${i}`, new Response(f, { headers: { 'Content-Type': f.type || 'image/jpeg' } }))
        ));
        await shareCache.put('shared-count', new Response(String(files.length)));
      }
      return Response.redirect('./index.html?cp-shared=1', 303);
    })());
    return;
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  // HTML/navigation: always prefer a fresh network copy so deploys show up
  // immediately, falling back to cache only when offline.
  if (request.mode === 'navigate' || request.url.endsWith('/index.html')) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: cache-first for speed/offline, refreshed in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
