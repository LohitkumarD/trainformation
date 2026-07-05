// Firebase Cloud Messaging background message handler.
// This file MUST be named firebase-messaging-sw.js and served from the root.
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

// Background push messages (app closed / in background tab)
messaging.onBackgroundMessage((payload) => {
  const notif = payload.notification || {};
  self.registration.showNotification(notif.title || 'Coach Position', {
    body: notif.body || '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'coach-position-push',
    renotify: true,
    data: { url: self.location.origin }
  });
});

// Tap on notification → open/focus the app
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
