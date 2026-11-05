// Bump on every change to STATIC_ASSETS: `activate` deletes all other caches.
const CACHE_NAME = 'shadow-pwa-v4';

// Only assets that are public and never redirect. Pages must NOT be listed:
// for a logged-out visitor they redirect to /login, and serving a cached
// redirected response to a navigation is a network error (blank page).
const STATIC_ASSETS = [
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

const OFFLINE_HTML = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Shadow</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; align-items: center;
         justify-content: center; gap: 16px; padding: 24px; box-sizing: border-box; text-align: center;
         background: #0E1110; color: #F2F4F3; font-family: system-ui, sans-serif; }
  button { padding: 10px 20px; border: 1px solid currentColor; border-radius: 8px;
           background: none; color: inherit; font: inherit; }
</style>
</head>
<body>
<p>Vous êtes hors ligne. Reconnectez-vous à Internet pour continuer.</p>
<button onclick="location.reload()">Réessayer</button>
</body>
</html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(OFFLINE_HTML, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      })
    );
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith('/data/stories/')) {
    // Stale-while-revalidate: stories stay readable offline once opened.
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const network = fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
          if (!cached) return network;
          event.waitUntil(network.catch(() => undefined));
          return cached;
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
