/* Hullu Gyms — Service Worker v2 */
const CACHE_NAME = 'hullu-gym-v2';

/**
 * At install time, fetch the app shell (index.html) and parse out all the
 * hashed Vite asset URLs (/assets/xyz.js, /assets/xyz.css), then cache
 * every one of them.  This is what makes the app launch offline.
 */
async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);

  // Fetch the root HTML — no-cache so we always get the latest bundle manifest
  let html = '';
  try {
    const resp = await fetch('/', { cache: 'no-cache' });
    if (resp.ok) {
      html = await resp.text();
      await cache.put('/', new Response(html, { headers: { 'Content-Type': 'text/html' } }));
    }
  } catch { /* offline during install — skip */ }

  // Parse every /assets/… JS/CSS URL out of the HTML
  const assetUrls = [...html.matchAll(/\/assets\/[^"'\s>]+\.(js|css)/g)]
    .map(m => m[0])
    .filter((v, i, a) => a.indexOf(v) === i); // dedupe

  // Cache the bundles in parallel — ignore individual failures
  await Promise.allSettled(
    assetUrls.map(url =>
      fetch(url).then(r => r.ok ? cache.put(url, r) : null).catch(() => null)
    )
  );

  // Cache other static files
  await Promise.allSettled([
    fetch('/logo.svg').then(r => r.ok ? cache.put('/logo.svg', r) : null).catch(() => null),
    fetch('/manifest.json').then(r => r.ok ? cache.put('/manifest.json', r) : null).catch(() => null),
  ]);
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(precacheShell());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests for same-origin URLs
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // API calls: never intercept — let them fail naturally (app handles the error)
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests (HTML pages): network-first, fall back to cached shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match('/') || caches.match('/index.html'))
    );
    return;
  }

  // Static assets (/assets/*, /logo.svg, etc.): cache-first, then network
  // Hashed Vite bundles never change for a given URL, so cache is always valid.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Nothing in cache and offline — nothing we can do for asset requests
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});

// ── Push notification handler ──────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Hullu Gyms', body: 'New notification', icon: '/logo.svg' };
  try { data = { ...data, ...event.data.json() }; } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/logo.svg',
      badge: '/logo.svg',
      vibrate: [200, 100, 200],
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.url === url && 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
