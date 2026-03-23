const CACHE = 'wapps-v4';

// Assets que se precachean al instalar — se sirven siempre desde caché
// hasta que cambie la versión del SW (wapps-v5, v6...)
const PRECACHE = [
  '/pwa-apps/manifest.json',
  '/pwa-apps/wapps-store.js',
  '/pwa-apps/wapps-firebase.js',
  '/pwa-apps/wapps-onboarding.js',
  '/pwa-apps/index.html',
  '/pwa-apps/backup.html',
  '/pwa-apps/coches.html',
  '/pwa-apps/compra.html',
  '/pwa-apps/decisor.html',
  '/pwa-apps/deseados.html',
  '/pwa-apps/despensa.html',
  '/pwa-apps/editor-categorias.html',
  '/pwa-apps/finanzas.html',
  '/pwa-apps/gastos-diarios.html',
  '/pwa-apps/guia_factura_luz.html',
  '/pwa-apps/instrumentos.html',
  '/pwa-apps/mascotas.html',
  '/pwa-apps/ninos.html',
  '/pwa-apps/obra.html',
  '/pwa-apps/semana.html',
  '/pwa-apps/setlist.html',
  '/pwa-apps/suministros.html',
  '/pwa-apps/icons/icon-192.png',
  '/pwa-apps/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Dejar pasar sin cachear: APIs externas, Firebase, CDNs
  if (
    url.hostname.includes('api.github.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('workers.dev') ||
    url.hostname.includes('edamam.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    return;
  }

  // CACHE FIRST para HTML — offline-first, se actualiza en background
  if (
    e.request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/')
  ) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          }
          return response;
        }).catch(() => cached || caches.match('/pwa-apps/index.html'));
        // Sirve caché inmediatamente, actualiza en background
        return cached || networkFetch;
      })
    );
    return;
  }

  // CACHE FIRST para JS y assets estáticos
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok && (
          url.hostname.includes('github.io') ||
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.json') ||
          url.pathname.match(/\.(png|jpg|svg|ico|webp)$/)
        )) {
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
