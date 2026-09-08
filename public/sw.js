// Deliberately does no caching — this exists solely so the origin has an
// active service worker registration, not to intercept/cache requests.
//
// iOS Safari's Intelligent Tracking Prevention caps script-writable storage
// (localStorage — where the Supabase auth session lives) at 7 days of
// inactivity for a plain "Add to Home Screen" bookmark, and can evict it
// even sooner for a standalone web app with no service worker. WebKit
// exempts origins with an active service worker from that cap. Without
// this file, the login session gets wiped on relaunch even though it's
// correctly persisted in code (see lib/accounts/client.ts).
//
// Every fetch is passed straight through to the network — no offline
// cache, no stale-bundle risk on deploy.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
