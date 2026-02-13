const CACHE_NAME = 'todo-pwa-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network First for API, Cache First for static assets
self.addEventListener('fetch', (event) => {
  try {
    const url = new URL(event.request.url);
    
    // Ignore non-http(s) requests (chrome-extension, etc.)
    if (!url.protocol.startsWith('http')) {
      return;
    }
    
    // NEVER cache API requests - always go to network
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(fetch(event.request));
      return;
    }
    
    // For static assets: Cache First, fallback to Network
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            // Only cache GET requests for static assets
            if (event.request.method === 'GET' && !url.pathname.startsWith('/api/')) {
              cache.put(event.request, fetchResponse.clone());
            }
            return fetchResponse;
          });
        });
      }).catch(() => {
        // Return offline fallback if available
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
    );
  } catch (error) {
    // Silently ignore errors from chrome-extension and other edge cases
    console.log('SW fetch ignored:', error.message);
  }
});
