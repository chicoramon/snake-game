/*
 * Snake game service worker.
 *
 * Bump CACHE_VERSION whenever the offline shell behavior changes. Page
 * navigations are always network-first, so a cached build can never pin an
 * online player to an outdated version of the game.
 */
const CACHE_PREFIX = 'snake-';
const CACHE_VERSION = 'shell-v3';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const OFFLINE_PAGE = './';
const CORE_ASSET = './snake-core.js';

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
  const [pageResponse, coreResponse] = await Promise.all([
    fetchFreshAsset(OFFLINE_PAGE),
    fetchFreshAsset(CORE_ASSET)
  ]);
  await Promise.all([
    cache.put(OFFLINE_PAGE, pageResponse),
    cache.put(CORE_ASSET, coreResponse)
  ]);
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
  const coreUrl = new URL(CORE_ASSET, self.registration.scope);

  // Leave cross-origin resources, Supabase, auth, and every other API request
  // to the browser/network unchanged.
  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }

  const isNavigation = request.mode === 'navigate';
  const isCoreRequest = requestUrl.pathname === coreUrl.pathname;
  if (!isNavigation && !isCoreRequest) return;

  event.respondWith((async () => {
    const cacheKey = isNavigation ? OFFLINE_PAGE : CORE_ASSET;
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
