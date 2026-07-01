// Minimal service worker — required for the app to be installable as a PWA.
// Network-passthrough (no offline caching) to avoid serving stale app code.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Let the browser handle requests normally (network).
})
