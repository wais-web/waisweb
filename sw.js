const CACHE_NAME = 'wais-v2';

// App shell — core files that make the app work offline
const SHELL = [
  '/index.html',
  '/tracker.html',
  '/map.html',
  '/logs.html',
  '/approvals.html',
  '/download.html',
  '/manifest.json',
  '/waislogo2.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

// ── Install: cache the app shell ─────────────────────────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Cache what we can — don't fail install if a CDN resource is unavailable
      return Promise.allSettled(
        SHELL.map(function(url) {
          return cache.add(url).catch(function() {
            console.warn('WAIS SW: failed to cache', url);
          });
        })
      );
    }).then(function() {
      return self.skipWaiting(); // activate immediately
    })
  );
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim(); // take control of all open pages
    })
  );
});

// ── Fetch: network-first for API calls, cache-first for assets ───────────────
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Always go network-first for Google Apps Script (live data)
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('arcgisonline.com') ||
      url.hostname.includes('basemaps.cartocdn.com') ||
      url.hostname.includes('tile.openstreetmap')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Cache-first for app shell (HTML, JS, CSS, images)
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        // Cache successful GET responses
        if (e.request.method === 'GET' && response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      });
    })
  );
});
