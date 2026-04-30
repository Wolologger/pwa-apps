const CACHE = 'wapps-v10.7';

// Núcleo: solo lo imprescindible para arrancar offline y mostrar fallbacks.
// El resto de páginas HTML se cachean la primera vez que el usuario las visita (lazy cache).
// Esto reduce el tiempo de instalación y el consumo de datos en la primera carga.
const PRECACHE_CORE = [
  '/pwa-apps/manifest.json',
  '/pwa-apps/wapps-config.js',
  '/pwa-apps/wapps-store.js',
  '/pwa-apps/wapps-firebase.js',
  '/pwa-apps/wapps-onboarding.js',
  '/pwa-apps/offline.html',
  '/pwa-apps/404.html',
  '/pwa-apps/index.html',
  '/pwa-apps/icons/icon-192.png',
  '/pwa-apps/icons/icon-512.png',
];

// Alias por compatibilidad con precacheAll
const PRECACHE = PRECACHE_CORE;

// Precache individual con tolerancia a fallos
async function precacheAll(cache) {
  const results = await Promise.allSettled(
    PRECACHE.map(url =>
      cache.add(url).catch(err => {
        console.warn(`[SW] No se pudo cachear ${url}:`, err.message);
      })
    )
  );
  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) console.warn(`[SW] ${failed} archivo(s) no cacheados — la app puede funcionar parcialmente offline`);
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => precacheAll(cache))
  );
  // NO llamar a skipWaiting() aquí — esperamos a que el usuario acepte desde el banner
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Mensajes desde el cliente ─────────────────────────────────
// El cliente envía { type: 'SKIP_WAITING' } cuando el usuario pulsa "Recargar"
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // CDNs cacheables: Firebase SDK, Google Fonts, Cloudflare jsPDF.
  // Estrategia: cache-first con fallback a red. Permite arrancar la app
  // 100% offline tras la primera visita (antes solo HTML/JS propios cacheaban).
  const isCacheableCDN =
    (url.hostname === 'www.gstatic.com' && url.pathname.includes('/firebasejs/')) ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'cdnjs.cloudflare.com';

  if (isCacheableCDN) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response.ok || response.type === 'opaque') {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Dejar pasar sin cachear: otros APIs externas (Firebase Firestore tiene su propio cache)
  if (
    url.hostname.includes('api.github.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('workers.dev') ||
    url.hostname.includes('edamam.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('cloudflare.com')
  ) {
    return;
  }

  // STALE-WHILE-REVALIDATE para HTML
  // Sirve caché inmediatamente; actualiza en background y notifica si hay cambios.
  if (
    e.request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/')
  ) {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(e.request);

        const networkFetch = fetch(e.request).then(async response => {
          if (response.ok) {
            const cachedRes = await cache.match(e.request);
            const newEtag = response.headers.get('etag') || response.headers.get('last-modified');
            const oldEtag = cachedRes?.headers?.get('etag') || cachedRes?.headers?.get('last-modified');

            const clone = response.clone();
            await cache.put(e.request, clone);

            // Si el contenido cambió, avisar a todos los clientes abiertos
            if (newEtag && oldEtag && newEtag !== oldEtag) {
              const clients = await self.clients.matchAll({ type: 'window' });
              clients.forEach(client => client.postMessage({ type: 'UPDATE_AVAILABLE' }));
            }
          }
          return response;
        }).catch(() => cached || caches.match('/pwa-apps/offline.html'));

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
          return caches.match(e.request) ||
            caches.match('/pwa-apps/404.html') ||
            caches.match('/pwa-apps/offline.html');
        }
      });
    })
  );
});
