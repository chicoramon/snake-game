/*
 * Snake game service worker.
 *
 * Bump CACHE_VERSION whenever the offline shell behavior changes. Page
 * navigations are always network-first, so a cached build can never pin an
 * online player to an outdated version of the game.
 */
const CACHE_PREFIX = 'snake-';
const CACHE_VERSION = 'shell-v2';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const OFFLINE_PAGE = './';

async function cacheFreshGameShell() {
  const response = await fetch(new Request(OFFLINE_PAGE, {
    cache: 'no-store',
    credentials: 'same-origin'
  }));

  if (!response.ok) {
    throw new Error(`Unable to cache the Snake game shell: ${response.status}`);
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(OFFLINE_PAGE, response);
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

  // Leave assets, non-GET requests, cross-origin resources, Supabase, auth,
  // and every other API request to the browser/network unchanged.
  if (
    request.method !== 'GET' ||
    request.mode !== 'navigate' ||
    new URL(request.url).origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(request, { cache: 'no-store' });
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(OFFLINE_PAGE, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(OFFLINE_PAGE, { cacheName: CACHE_NAME });
      if (cached) return cached;
      throw error;
    }
  })());
});
