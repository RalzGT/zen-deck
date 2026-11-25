const CACHE_NAME = 'zen-deck-v24';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './workers/ics-worker.js',
  './manifest.json',
  './logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Datos en tiempo real y APIs externas van a red con respaldo en caché
  if (
    url.pathname.endsWith('parleys.json') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('microsoft.com') ||
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('wttr.in') ||
    url.hostname.includes('espn.com') ||
    url.hostname.includes('er-api.com')
  ) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp && resp.status === 200 && url.pathname.endsWith('parleys.json')) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return resp;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Stale-While-Revalidate para respuesta instantánea (< 100ms) en PWA
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((networkResp) => {
            if (networkResp && networkResp.status === 200) {
              const copy = networkResp.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkResp;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })
    );
  }
});
