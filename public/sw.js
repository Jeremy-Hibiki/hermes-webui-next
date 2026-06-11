/**
 * Hermes WebUI Service Worker (Next.js)
 * Minimal PWA service worker — enables "Add to Home Screen".
 * No offline caching of API responses (the UI requires a live backend).
 * Navigations get an offline fallback page; everything else passes through.
 */

const CACHE_NAME = 'hermes-next-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Never intercept the service worker script itself
  if (url.pathname.endsWith('/sw.js')) return;

  // API and streaming endpoints — always go to network
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/stream') ||
    url.pathname.startsWith('/health') ||
    url.pathname.includes('/health')
  ) {
    return;
  }

  // Next.js internal assets — let the browser / Next.js handle caching
  if (url.pathname.startsWith('/_next/')) return;

  // Page navigations: network-first with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(event.request, { cache: 'no-store' }))
        .then((response) => {
          if (event.request.method === 'GET' && response.status === 200 && !response.redirected) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./', clone));
          }
          return response;
        })
        .catch(() =>
          caches
            .match('./')
            .then(
              (cached) =>
                cached ||
                new Response(
                  '<html><body style="font-family:sans-serif;padding:2rem;background:#1a1a2a;color:#ccc">' +
                    '<h2>You are offline</h2>' +
                    '<p>Hermes requires a server connection. Please check your network and try again.</p>' +
                    '</body></html>',
                  { headers: { 'Content-Type': 'text/html' } },
                ),
            ),
        ),
    );
    return;
  }
});
