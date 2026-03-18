const CACHE = 'wapps-v1';

const PRECACHE = [
  '/pwa-apps/',
  '/pwa-apps/index.html',
  '/pwa-apps/obra.html',
  '/pwa-apps/gastos-diarios.html',
  '/pwa-apps/despensa.html',
  '/pwa-apps/guia_factura_luz.html',
  '/pwa-apps/manifest.json',
];

// Instalar — precachear archivos principales
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

// Fetch — cache first para assets propios, network first para APIs externas
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Dejar pasar llamadas a APIs externas sin cachear
  if (
    url.hostname.includes('api.spoonacular.com') ||
    url.hostname.includes('api.github.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    return;
  }

  // Cache first para todo lo demás
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Solo cachear respuestas válidas de nuestro dominio
        if (
          response.ok &&
          url.hostname.includes('github.io')
        ) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — devolver index si es navegación
        if (e.request.mode === 'navigate') {
          return caches.match('/pwa-apps/index.html');
        }
      });
    })
  );
});
