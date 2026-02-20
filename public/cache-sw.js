/**
 * @fileoverview Cache Service Worker
 * 
 * Service worker that intercepts fetch requests and applies caching strategies.
 * Runs in separate thread from main application.
 * 
 * Note: This file cannot use ES6 imports in service worker context.
 * Cache logic is duplicated here for service worker compatibility.
 */

const CACHE_VERSION = 'v1';
const DEBUG = false;

const CacheStrategy = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

const strategies = new Map();

// Initialize default strategies
function initializeStrategies() {
  // WASM modules: Cache-first
  strategies.set(`harmony-wasm-${CACHE_VERSION}`, {
    cacheName: `harmony-wasm-${CACHE_VERSION}`,
    strategy: CacheStrategy.CACHE_FIRST,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    maxEntries: 10,
    urlPatterns: ['*.wasm', '/wasm/*', '*/harmony-*.wasm']
  });

  // Static assets: Cache-first
  strategies.set(`harmony-assets-${CACHE_VERSION}`, {
    cacheName: `harmony-assets-${CACHE_VERSION}`,
    strategy: CacheStrategy.CACHE_FIRST,
    maxAge: 24 * 60 * 60 * 1000,
    maxEntries: 100,
    urlPatterns: ['*.css', '*.js', '*.svg', '*.png', '*.jpg', '*.webp']
  });

  // API data: Network-first
  strategies.set(`harmony-api-${CACHE_VERSION}`, {
    cacheName: `harmony-api-${CACHE_VERSION}`,
    strategy: CacheStrategy.NETWORK_FIRST,
    maxAge: 5 * 60 * 1000,
    maxEntries: 50,
    urlPatterns: ['/api/*', '*/api/*']
  });

  // Audio samples: Stale-while-revalidate
  strategies.set(`harmony-audio-${CACHE_VERSION}`, {
    cacheName: `harmony-audio-${CACHE_VERSION}`,
    strategy: CacheStrategy.STALE_WHILE_REVALIDATE,
    maxAge: 60 * 60 * 1000,
    maxEntries: 200,
    urlPatterns: ['*.wav', '*.mp3', '*.ogg', '*.flac', '/audio/*']
  });
}

function matchPattern(url, pattern) {
  const regex = new RegExp(
    '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
  );
  return regex.test(url);
}

function matchStrategy(url) {
  for (const [, config] of strategies) {
    for (const pattern of config.urlPatterns) {
      if (matchPattern(url, pattern)) {
        return config;
      }
    }
  }
  return null;
}

async function cacheFirst(request, config) {
  const cache = await caches.open(config.cacheName);
  const cached = await cache.match(request);

  if (cached) {
    if (DEBUG) console.log('[SW] Cache hit (cache-first)', request.url);
    return cached;
  }

  if (DEBUG) console.log('[SW] Cache miss, fetching', request.url);
  const response = await fetch(request);
  
  if (response.ok) {
    cache.put(request, response.clone());
  }
  
  return response;
}

async function networkFirst(request, config) {
  const cache = await caches.open(config.cacheName);

  try {
    if (DEBUG) console.log('[SW] Fetching from network', request.url);
    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    if (DEBUG) console.log('[SW] Network failed, trying cache', request.url);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    throw error;
  }
}

async function staleWhileRevalidate(request, config) {
  const cache = await caches.open(config.cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(error => {
    if (DEBUG) console.log('[SW] Revalidation failed', request.url);
  });

  if (cached) {
    if (DEBUG) console.log('[SW] Serving stale, revalidating', request.url);
    return cached;
  }

  if (DEBUG) console.log('[SW] No cache, waiting for network', request.url);
  return fetchPromise;
}

// Service Worker Event Handlers

self.addEventListener('install', (event) => {
  console.log('[SW] Installing cache service worker');
  initializeStrategies();
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating cache service worker');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old cache versions
          if (!cacheName.includes(CACHE_VERSION)) {
            console.log('[SW] Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) URLs
  if (!url.startsWith('http')) {
    return;
  }

  const config = matchStrategy(url);

  if (!config) {
    // No strategy matched, use network
    return;
  }

  if (DEBUG) console.log('[SW] Strategy matched', url, config.strategy);

  event.respondWith(
    (async () => {
      try {
        switch (config.strategy) {
          case CacheStrategy.CACHE_FIRST:
            return await cacheFirst(request, config);
          
          case CacheStrategy.NETWORK_FIRST:
            return await networkFirst(request, config);
          
          case CacheStrategy.STALE_WHILE_REVALIDATE:
            return await staleWhileRevalidate(request, config);
          
          case CacheStrategy.NETWORK_ONLY:
            return await fetch(request);
          
          case CacheStrategy.CACHE_ONLY:
            const cache = await caches.open(config.cacheName);
            const cached = await cache.match(request);
            if (!cached) {
              throw new Error(`No cached response for ${url}`);
            }
            return cached;
          
          default:
            return await fetch(request);
        }
      } catch (error) {
        console.error('[SW] Fetch error', url, error);
        throw error;
      }
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INIT') {
    console.log('[SW] Received init message', event.data.options);
    // Could update configuration based on message
  }
});