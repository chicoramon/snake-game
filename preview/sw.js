/*
 * Snake game service worker.
 *
 * Bump CACHE_VERSION whenever the offline shell behavior changes. Page
 * navigations are always network-first, so a cached build can never pin an
 * online player to an outdated version of the game.
 */
const CACHE_PREFIX = 'snake-';
const CACHE_VERSION = 'shell-v6';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const OFFLINE_PAGE = './';
// Replaced by scripts/build-service-worker.mjs after Vite emits its hashed
// production assets. Keeping the template free of a fixed file list prevents
// a new build from serving an old JavaScript or CSS shell offline.
const PRECACHE_ASSETS = [
  "./assets/apple-touch-icon-5fm-98x8.png",
  "./assets/audio/ken-stage-96.mp3",
  "./assets/favicon-16x16-CrE4Gukf.png",
  "./assets/favicon-32x32-9LEdGOyX.png",
  "./assets/favicon-9kQTcohj.ico",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon-16x16.png",
  "./assets/icons/favicon-32x32.png",
  "./assets/icons/favicon.ico",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512-maskable.png",
  "./assets/icons/icon-512.png",
  "./assets/index-DVQRe9iL.css",
  "./assets/index-Rc1NfNIy.js",
  "./assets/manifest-BkglArjv.webmanifest",
  "./assets/social/og-image.jpg",
  "./audio themes/street_fighter_ii_-_ken.mid",
  "./index.html",
  "./manifest.webmanifest",
  "./snake-core.js"
];

async function fetchFreshAsset(asset) {
  const response = await fetch(new Request(asset, {
    cache: 'no-store',
    credentials: 'same-origin'
  }));

  if (!response.ok) {
    throw new Error(`Unable to cache ${asset}: ${response.status}`);
  }

  return response;
}

async function cacheFreshGameShell() {
  const cache = await caches.open(CACHE_NAME);
  const assets = [OFFLINE_PAGE, ...PRECACHE_ASSETS];
  await Promise.all(assets.map(async asset => {
    const response = await fetchFreshAsset(asset);
    await cache.put(asset, response);
  }));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await cacheFreshGameShell();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  // Leave cross-origin resources, Supabase, auth, and every other API request
  // to the browser/network unchanged.
  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }

  const isNavigation = request.mode === 'navigate';
  const requestedAsset = `./${requestUrl.pathname.slice(self.registration.scope ? new URL(self.registration.scope).pathname.length : 0)}`;
  const normalizedAsset = requestedAsset.replace(/\/{2,}/g, '/');
  const isPrecachedAsset = PRECACHE_ASSETS.includes(normalizedAsset);
  if (!isNavigation && !isPrecachedAsset) return;

  event.respondWith((async () => {
    const cacheKey = isNavigation ? OFFLINE_PAGE : normalizedAsset;
    try {
      const response = await fetch(request, { cache: 'no-store' });
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(cacheKey, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(cacheKey, { cacheName: CACHE_NAME });
      if (cached) return cached;
      throw error;
    }
  })());
});
