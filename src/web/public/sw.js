/**
 * Service Worker for Video Caching
 * Strategy: Cache-first with background fetch for uncached videos
 * - If cached: serve immediately from cache
 * - If not cached: stream from network while caching in background
 */

const CACHE_NAME = 'video-cache-v1';
const MAX_CACHE_SIZE = 100; // Max recently-watched videos (~2GB, increased for preloading)

// Video file extensions/patterns to cache
const VIDEO_PATTERNS = [
	/\.mp4/i,
	/\.webm/i,
	/\.mov/i,
	/\/videos\/.*\/stream/i, // Internal stream endpoint
	/r2\.cloudflarestorage/i,
	/r2\.dev/i, // R2 public URLs (pub-xxx.r2.dev)
	/s3\./i,
];

// Check if URL is a video
function isVideoUrl(url) {
	return VIDEO_PATTERNS.some((pattern) => pattern.test(url));
}

// Normalize URL for cache key (remove query params that don't affect content)
function getCacheKey(url) {
	const parsed = new URL(url);
	// Remove cache-busting params but keep meaningful ones like 'download'
	parsed.searchParams.delete('t');
	parsed.searchParams.delete('_nocache');
	return parsed.toString();
}

// Install event
self.addEventListener('install', (event) => {
	console.log('[SW] Service Worker v2 installing...');
	self.skipWaiting();
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
	console.log('[SW] Service Worker v2 activating...');
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					// Delete old caches (including v1)
					if (cacheName !== CACHE_NAME) {
						console.log('[SW] Deleting old cache:', cacheName);
						return caches.delete(cacheName);
					}
				})
			);
		})
	);
	self.clients.claim();
});

// Limit cache size - remove oldest entries
async function limitCacheSize(cache, maxSize) {
	const keys = await cache.keys();
	if (keys.length > maxSize) {
		// Delete oldest entries (first in, first out)
		const toDelete = keys.slice(0, keys.length - maxSize);
		await Promise.all(toDelete.map((key) => cache.delete(key)));
		console.log(`[SW] Cleaned ${toDelete.length} old cache entries`);
	}
}

// Background cache video without blocking response
async function cacheInBackground(request, url) {
	try {
		const cache = await caches.open(CACHE_NAME);
		const cacheKey = getCacheKey(url);

		// Check if already cached
		const existing = await cache.match(cacheKey);
		if (existing) {
			console.log('[SW] Already cached:', url.substring(0, 60));
			return;
		}

		console.log('[SW] Background caching:', url.substring(0, 60));

		// Fetch fresh copy for caching
		const response = await fetch(request.clone());

		if (response && response.status === 200) {
			// Cache with normalized key
			await cache.put(cacheKey, response);
			console.log('[SW] Cached successfully:', url.substring(0, 60));

			// Limit cache size
			await limitCacheSize(cache, MAX_CACHE_SIZE);
		}
	} catch (error) {
		console.warn('[SW] Background cache failed:', error.message);
	}
}

// Fetch event - Smart caching strategy
self.addEventListener('fetch', (event) => {
	const url = event.request.url;

	// Only handle GET requests for videos
	if (event.request.method !== 'GET' || !isVideoUrl(url)) {
		return;
	}

	// Skip download requests (don't cache downloads)
	if (url.includes('download=1')) {
		return;
	}

	const cacheKey = getCacheKey(url);

	event.respondWith(
		caches.open(CACHE_NAME).then(async (cache) => {
			// Try cache first with normalized key
			const cachedResponse = await cache.match(cacheKey);

			if (cachedResponse) {
				console.log('[SW] ⚡ Cache hit:', url.substring(0, 60));
				return cachedResponse;
			}

			// Cache miss - fetch from network
			console.log('[SW] 🌐 Network fetch:', url.substring(0, 60));

			try {
				const networkResponse = await fetch(event.request);

				// Only cache successful complete responses (not 206 partial)
				if (networkResponse && networkResponse.status === 200) {
					// Clone and cache in background (don't block response)
					const responseToCache = networkResponse.clone();
					cache.put(cacheKey, responseToCache).then(() => {
						limitCacheSize(cache, MAX_CACHE_SIZE);
					});
				}

				return networkResponse;
			} catch (error) {
				console.error('[SW] Network error:', error.message);
				throw error;
			}
		})
	);
});

// Message event - Handle cache management
self.addEventListener('message', (event) => {
	const { action, url } = event.data || {};

	if (action === 'clearVideoCache') {
		caches.delete(CACHE_NAME).then(() => {
			console.log('[SW] Video cache cleared');
			if (event.ports[0]) event.ports[0].postMessage({ success: true });
		});
	}

	if (action === 'getCacheSize') {
		caches.open(CACHE_NAME).then((cache) => {
			cache.keys().then((keys) => {
				if (event.ports[0]) event.ports[0].postMessage({ count: keys.length });
			});
		});
	}

	// Pre-cache a specific video URL
	if (action === 'precache' && url) {
		cacheInBackground(new Request(url), url);
	}

	// Remove specific video from cache
	if (action === 'remove' && url) {
		caches.open(CACHE_NAME).then((cache) => {
			const cacheKey = getCacheKey(url);
			cache.delete(cacheKey).then((deleted) => {
				console.log('[SW] Removed from cache:', deleted, url.substring(0, 60));
			});
		});
	}

	// Batch precache multiple video URLs (for aggressive preloading)
	if (
		action === 'precacheMultiple' &&
		event.data.urls &&
		event.data.urls.length > 0
	) {
		const urls = event.data.urls;
		console.log('[SW] 📦 Batch precaching', urls.length, 'videos');

		// Use Promise.allSettled to not fail on single errors
		Promise.allSettled(
			urls.map((videoUrl) => cacheInBackground(new Request(videoUrl), videoUrl))
		).then((results) => {
			const cached = results.filter((r) => r.status === 'fulfilled').length;
			console.log('[SW] ✅ Batch cached:', cached, '/', urls.length);
		});
	}
});
