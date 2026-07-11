// Firebase Cloud Messaging — merged into this SW so there's only one
// registered worker (two separate SWs both trying to own scope "/" left
// push subscription with no active worker to bind to; see initPushNotifications).
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBncalmdFaWM2dB7uT8fxWFddICkDgqtY8",
  authDomain: "coachposition.firebaseapp.com",
  projectId: "coachposition",
  storageBucket: "coachposition.firebasestorage.app",
  messagingSenderId: "981014228335",
  appId: "1:981014228335:web:c638a306bc8e9ef64a8c9a"
});
const messaging = firebase.messaging();

console.log('[sw] loaded, cache = coach-position-v58');

// Fires for every push the browser delivers, before Firebase's own handling —
// confirms whether the push even reaches this worker at all.
self.addEventListener('push', (event) => {
  console.log('[sw] raw push event received', event.data ? event.data.text() : '(no payload)');
});

// NOTE: no onBackgroundMessage/showNotification here on purpose. For messages
// carrying a `notification` payload (all of ours), the FCM SDK auto-displays
// the system notification itself and its own notificationclick handler opens
// fcmOptions.link (the /?nid=… open-tracking URL). A manual showNotification
// here produced a DUPLICATE notification for every push — verified via a CDP
// push-delivery harness (registration.getNotifications() returned 2 entries).

// Fallback click handler for any non-FCM notification (the SDK stops
// propagation for its own notifications before this runs).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});

const CACHE = 'coach-position-v58';
const SHELL = ['./', './index.html', './manifest.json', './icon.svg'];

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
