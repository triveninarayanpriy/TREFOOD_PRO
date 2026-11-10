/* global self, caches, fetch, URL, Response */
/* TreFood NIT Patna Service Worker — Offline Shell & Order Push Alerts */
const CACHE_NAME = 'trefood-shell-v1';
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never serve stale data for live order tracking, auth, notifications, or console endpoints
  if (url.pathname.startsWith('/api/')) {
    if (url.pathname === '/api/gates' || url.pathname === '/api/campuses/nitp') {
      event.respondWith(
        fetch(request)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
            }
            return res;
          })
          .catch(() => caches.match(request))
      );
    }
    return;
  }

  // Navigation requests: network-first -> cached shell or standalone offline screen
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok && (url.pathname === '/' || url.pathname === '/app' || url.pathname === '/orders')) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(async () => {
          const cachedRoute = await caches.match(request);
          if (cachedRoute) return cachedRoute;
          const offlineFallback = await caches.match('/offline.html');
          if (offlineFallback) return offlineFallback;
          const rootShell = await caches.match('/');
          return rootShell || Response.error();
        })
    );
    return;
  }

  // Static shell assets (images, fonts, CSS, hashed JS bundles)
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/images/') ||
    /\.(?:png|svg|ico|woff2?|css|js|json)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
            }
            return res;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});

// Web Push status-card alert
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let title = 'TreFood Order Update';
      let body = 'Open your tracker to see the latest gate status.';
      let targetUrl = '/orders';

      try {
        if (event.data) {
          const parsed = event.data.json();
          if (parsed && parsed.title) title = parsed.title;
          if (parsed && parsed.body) body = parsed.body;
          if (parsed && parsed.url) targetUrl = parsed.url;
        } else {
          const res = await fetch('/api/notifications?limit=1', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            const latest = data && Array.isArray(data.notifications) ? data.notifications[0] : null;
            if (latest) {
              title = latest.title || title;
              body = latest.summary || body;
              if (latest.orderId) targetUrl = `/orders/${latest.orderId}`;
            }
          }
        }
      } catch {
        // Use clean fallback card
      }

      await self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'trefood-order-status',
        renotify: true,
        data: { url: targetUrl },
      });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/orders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
