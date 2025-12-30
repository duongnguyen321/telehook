/**
 * Service Worker for Video Caching
 * Caches video files to avoid reloading on page refresh
 */

const CACHE_NAME = 'video-cache-v1';
const VIDEO_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// Video file extensions/patterns to cache
const VIDEO_PATTERNS = [
	/\.mp4/i,
	/\.webm/i,
	/\.mov/i,
	/\/videos\//i,
	/r2\.cloudflarestorage/i,
	/s3\./i,
];

// Check if URL is a video
function isVideoUrl(url) {
	return VIDEO_PATTERNS.some((pattern) => pattern.test(url));
}

// Install event
self.addEventListener('install', (event) => {
	console.log('[SW] Service Worker installing...');
	self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
	console.log('[SW] Service Worker activating...');
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					// Delete old caches
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

// Fetch event - Cache Strategy: Cache First for videos
self.addEventListener('fetch', (event) => {
	const url = event.request.url;

	// Only cache GET requests for videos
	if (event.request.method !== 'GET' || !isVideoUrl(url)) {
		return;
	}

	event.respondWith(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.match(event.request).then((cachedResponse) => {
				if (cachedResponse) {
					console.log('[SW] Serving from cache:', url.substring(0, 80));
					return cachedResponse;
				}

				// Not in cache, fetch from network
				console.log('[SW] Fetching from network:', url.substring(0, 80));
				return fetch(event.request).then((networkResponse) => {
					// Only cache successful responses
					if (networkResponse && networkResponse.status === 200) {
						// Clone response before caching
						const responseToCache = networkResponse.clone();
						cache.put(event.request, responseToCache);
					}
					return networkResponse;
				});
			});
		})
	);
});

// Message event - Handle cache management
self.addEventListener('message', (event) => {
	if (event.data.action === 'clearVideoCache') {
		caches.delete(CACHE_NAME).then(() => {
			console.log('[SW] Video cache cleared');
			event.ports[0].postMessage({ success: true });
		});
	}

	if (event.data.action === 'getCacheSize') {
		caches.open(CACHE_NAME).then((cache) => {
			cache.keys().then((keys) => {
				event.ports[0].postMessage({ count: keys.length });
			});
		});
	}
});
