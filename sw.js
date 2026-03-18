const CACHE = 'wapps-v2';

const PRECACHE = [
  '/pwa-apps/manifest.json',
];

// Instalar — precachear solo assets estáticos (no HTML)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activar — limpiar caches viejas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Dejar pasar llamadas a APIs externas sin cachear
  if (
    url.hostname.includes('api.github.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    return;
  }

  // NETWORK FIRST para páginas HTML — siempre intenta red primero
  // así los cambios en index.html y el resto de páginas se ven al instante
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          // Guarda la respuesta fresca en caché
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Sin red → sirve desde caché (offline fallback)
          return caches.match(e.request)
            || caches.match('/pwa-apps/index.html');
        })
    );
    return;
  }

  // CACHE FIRST para assets estáticos (manifest, iconos, etc.)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok && url.hostname.includes('github.io')) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        if (e.request.mode === 'navigate') {
          return caches.match('/pwa-apps/index.html');
        }
      });
    })
  );
});
