/**
 * TikTok-style Video Feed Logic
 */

// State
let token =
	localStorage.getItem('auth_token') ||
	localStorage.getItem('feed_token') ||
	localStorage.getItem('dashboard_token');
if (token) {
	// Migration: ensure we use standard key
	localStorage.setItem('auth_token', token);
	localStorage.removeItem('feed_token');
	localStorage.removeItem('dashboard_token');
}
let videos = [];
let currentUser = null;
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let totalPages = 1;
let currentFilters = {
	search: '',
	status: 'pending', // Default to pending (chưa đăng)
};

// Watched Videos Tracking
// A video is considered "watched" if user has viewed >30% of its duration
const WATCHED_THRESHOLD = 0.3; // 30%
const WATCHED_STORAGE_KEY = 'feed_watched_videos';

/**
 * Get list of watched video IDs from localStorage
 * @returns {string[]}
 */
function getWatchedVideos() {
	try {
		const data = localStorage.getItem(WATCHED_STORAGE_KEY);
		return data ? JSON.parse(data) : [];
	} catch {
		return [];
	}
}

/**
 * Mark a video as watched
 * @param {string} videoId
 */
function markVideoAsWatched(videoId) {
	const watched = getWatchedVideos();
	if (!watched.includes(videoId)) {
		watched.push(videoId);
		localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(watched));
		console.log('[Feed] Marked video as watched:', videoId);
	}
}

/**
 * Clear all watched videos (when all videos have been seen)
 */
function clearWatchedVideos() {
	localStorage.removeItem(WATCHED_STORAGE_KEY);
	console.log('[Feed] Cleared watched videos list - starting fresh');
}

// Preload Configuration
const PRELOAD_AHEAD = 8; // Preload 8 videos ahead
const preloadedUrls = new Set(); // Track already preloaded URLs

/**
 * Preload upcoming videos ahead of current position
 * @param {number} currentIndex - Current visible video index
 */
function preloadUpcomingVideos(currentIndex) {
	const items = document.querySelectorAll('.video-item');
	const endIndex = Math.min(currentIndex + PRELOAD_AHEAD, items.length);
	const urlsToPreload = [];

	for (let i = currentIndex; i < endIndex; i++) {
		const video = items[i]?.querySelector('video');
		if (video?.src && !preloadedUrls.has(video.src)) {
			preloadedUrls.add(video.src);
			urlsToPreload.push(video.src);
			// Upgrade preload attribute for near videos
			if (i < currentIndex + 3) {
				video.preload = 'auto';
			}
		}
	}

	// Send to Service Worker for batch caching
	if (urlsToPreload.length > 0 && navigator.serviceWorker?.controller) {
		console.log('[Preload] Requesting', urlsToPreload.length, 'videos ahead');
		navigator.serviceWorker.controller.postMessage({
			action: 'precacheMultiple',
			urls: urlsToPreload,
		});
	}
}

// DOM Elements
const app = document.getElementById('app');
const loginOverlay = document.getElementById('login-overlay');
const feedContainer = document.getElementById('feed-container');
const scroller = document.getElementById('video-scroller');
const videoTemplate = document.getElementById('video-template');
const loadingIndicator = document.getElementById('loading-indicator');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');

// Intersection Observer for Auto-Play
const observerOptions = {
	root: scroller,
	threshold: 0.6, // Video must be 60% visible to play
};

const videoObserver = new IntersectionObserver((entries) => {
	entries.forEach((entry) => {
		const video = entry.target.querySelector('video');
		if (!video) return;

		if (entry.isIntersecting) {
			// Trigger preload for upcoming videos
			const items = Array.from(document.querySelectorAll('.video-item'));
			const currentIndex = items.indexOf(entry.target);
			if (currentIndex >= 0) {
				preloadUpcomingVideos(currentIndex);
			}

			// Play video
			const playPromise = video.play();
			if (playPromise !== undefined) {
				playPromise.catch((error) => {
					console.log('Autoplay prevented:', error);
					// Show play button or mute if needed
				});
			}
		} else {
			// Pause video and reset time if needed (optional)
			video.pause();
			// video.currentTime = 0; // Reset to start when scrolled away? standard tiktok keeps position
		}
	});

	// Check for infinite scroll trigger (monitor last few elements)
	// Actually better to simplify: just check scroll position
}, observerOptions);

// --- Initialization ---

function init() {
	// Initialize Telegram WebApp for Auto-fill
	if (window.Telegram && window.Telegram.WebApp) {
		window.Telegram.WebApp.ready();
		window.Telegram.WebApp.expand(); // Optional: expand to full height
		const user = window.Telegram.WebApp.initDataUnsafe?.user;
		if (user && user.id) {
			const input = document.getElementById('telegram-id');
			if (input) input.value = user.id;
		}
	}

	// Load from localStorage if empty
	const savedId = localStorage.getItem('telegram_id');
	const input = document.getElementById('telegram-id');
	if (savedId && input && !input.value) {
		input.value = savedId;
	}

	if (token) {
		checkAuth();
	} else {
		showLogin();
	}

	// Debounce search
	let searchTimeout;
	searchInput.addEventListener('input', (e) => {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			currentFilters.search = e.target.value;
			reloadFeed();
		}, 500);
	});

	// Scroller infinite load
	scroller.addEventListener('scroll', () => {
		const scrollTop = scroller.scrollTop;
		const scrollHeight = scroller.scrollHeight;
		const clientHeight = scroller.clientHeight;

		if (scrollTop + clientHeight >= scrollHeight - clientHeight * 2) {
			loadMoreVideos(); // Load when 2 screens away from bottom
		}
	});

	// Register Service Worker for caching
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker
			.register('/sw.js')
			.then((reg) => console.log('SW registered'))
			.catch((err) => console.log('SW fetch fail', err));
	}
}

function showLogin() {
	loginOverlay.classList.remove('hidden');
	feedContainer.classList.add('hidden');
}

function showFeed() {
	loginOverlay.classList.add('hidden');
	feedContainer.classList.remove('hidden');
	updateSwitchButton();
	reloadFeed();
}

/**
 * Update switch button visibility based on user role
 */
function updateSwitchButton() {
	const switchBtn = document.getElementById('switch-dashboard-btn');
	if (!switchBtn) return;

	// Show switch button only for admin/mod/reviewer
	if (currentUser && ['admin', 'mod', 'reviewer'].includes(currentUser.role)) {
		switchBtn.classList.remove('hidden');
	} else {
		switchBtn.classList.add('hidden');
	}
}

/**
 * Navigate to admin dashboard
 */
function goToAdmin() {
	window.location.href = '/admin';
}

// --- Auth ---

async function requestOTP() {
	const telegramId = document.getElementById('telegram-id').value;
	if (!telegramId) return alert('Vui lòng nhập Telegram ID');

	try {
		const res = await fetch('/api/auth/request-otp', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ telegramId }),
		});

		const data = await res.json();

		if (data.success) {
			// Save ID for next time
			localStorage.setItem('telegram_id', telegramId);

			document.getElementById('step-1').classList.add('hidden');
			document.getElementById('step-2').classList.remove('hidden');
			document.getElementById('login-message').innerText = '';
		} else {
			document.getElementById('login-message').innerText =
				data.message || data.error;
		}
	} catch (e) {
		alert('Lỗi kết nối');
	}
}

async function verifyOTP() {
	const telegramId = document.getElementById('telegram-id').value;
	const code = document.getElementById('otp-code').value;

	try {
		const res = await fetch('/api/auth/verify-otp', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ telegramId, code }),
		});

		const data = await res.json();

		if (data.success) {
			// Save token and user
			token = data.token;
			currentUser = data.user;
			localStorage.setItem('auth_token', token);
			showFeed();
		} else {
			alert(data.error);
		}
	} catch (e) {
		alert('Lỗi xác thực');
	}
}

function backToStep1() {
	document.getElementById('step-1').classList.remove('hidden');
	document.getElementById('step-2').classList.add('hidden');
}

async function checkAuth() {
	try {
		const res = await fetch('/api/auth/me', {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (res.ok) {
			currentUser = await res.json();
			showFeed();
		} else {
			localStorage.removeItem('auth_token');
			showLogin();
		}
	} catch (e) {
		showLogin();
	}
}

// --- Video Feed ---

function applyFilter() {
	currentFilters.status = statusFilter.value;
	reloadFeed();
}

function reloadFeed() {
	scroller.innerHTML = ''; // Clear current videos
	videos = [];
	currentPage = 1;
	hasMore = true;
	loadMoreVideos();
}

async function loadMoreVideos() {
	if (isLoading) return;
	// Shuffle mode: exclude watched videos, shuffle results
	// When all videos are watched, server returns allWatched=true, we clear the list and retry

	isLoading = true;
	loadingIndicator.classList.remove('hidden');

	try {
		const watchedVideos = getWatchedVideos();
		const params = new URLSearchParams({
			page: currentPage,
			limit: 10, // Load 10 at a time for smooth streaming
			status: currentFilters.status,
			shuffle: '1', // Enable shuffle mode
		});

		// Send watched video IDs to exclude
		if (watchedVideos.length > 0) {
			params.append('excludeWatched', watchedVideos.join(','));
		}

		if (currentFilters.search) {
			params.append('search', currentFilters.search);
		}

		const res = await fetch(`/api/videos?${params}`, {
			headers: { Authorization: `Bearer ${token}` },
		});

		const data = await res.json();

		// Check if all videos have been watched
		if (data.meta?.allWatched) {
			console.log(
				'[Feed] All videos watched, clearing watched list and reloading'
			);
			clearWatchedVideos();
			currentPage = 1;
			setTimeout(() => {
				isLoading = false;
				loadMoreVideos();
			}, 100);
			return;
		}

		if (data.videos && data.videos.length > 0) {
			data.videos.forEach(appendVideo);
			totalPages = data.meta.totalPages;
			currentPage++;
		} else {
			// No videos returned
			if (currentPage === 1) {
				// Really empty (no videos in DB)
				hasMore = false;
				scroller.innerHTML =
					'<div style="color:white;text-align:center;padding-top:50vh">Không có video nào</div>';
			} else {
				// End of shuffled list, loop back
				console.log('End of list, looping back to page 1');
				currentPage = 1;
				setTimeout(() => {
					isLoading = false;
					loadMoreVideos();
				}, 100);
				return;
			}
		}
	} catch (e) {
		console.error('Load video error', e);
	} finally {
		isLoading = false;
		loadingIndicator.classList.add('hidden');
	}
}

function appendVideo(videoData) {
	const clone = videoTemplate.content.cloneNode(true);
	const videoItem = clone.querySelector('.video-item');
	const videoEl = clone.querySelector('video');
	const titleEl = clone.querySelector('.video-title');
	const tagsEl = clone.querySelector('.video-tags');
	const wrapper = clone.querySelector('.video-wrapper');
	const muteBtn = clone.querySelector('.mute-btn');

	// Store video ID for watched tracking
	videoItem.dataset.videoId = videoData.id;

	// Set Data
	videoEl.src = videoData.videoUrl;
	videoEl.poster = ''; // Could implement thumbnails later

	titleEl.innerText = videoData.title || 'Không có tiêu đề';
	tagsEl.innerText = videoData.hashtags || '';

	// Apply mute preference from localStorage
	const isMuted = localStorage.getItem('feed_muted') !== 'false';
	videoEl.muted = isMuted;
	updateMuteButtonState(muteBtn, isMuted);

	// Track watched progress - mark as watched when >30% is viewed
	let hasMarkedWatched = false;
	videoEl.addEventListener('timeupdate', () => {
		if (hasMarkedWatched) return; // Already marked
		if (
			videoEl.duration &&
			videoEl.currentTime / videoEl.duration > WATCHED_THRESHOLD
		) {
			markVideoAsWatched(videoData.id);
			hasMarkedWatched = true;
		}
	});

	// Play/Pause Interaction - only trigger on video area, not mute button
	wrapper.addEventListener('click', (e) => {
		// Don't trigger play/pause when clicking mute button
		if (e.target.classList.contains('mute-btn')) return;

		if (videoEl.paused) {
			videoEl.play();
			wrapper.classList.remove('paused');
		} else {
			videoEl.pause();
			wrapper.classList.add('paused');
		}
	});

	// Observe
	videoObserver.observe(videoItem);

	scroller.appendChild(videoItem);

	// Trigger initial preload after first few videos loaded
	const items = document.querySelectorAll('.video-item');
	if (items.length <= PRELOAD_AHEAD) {
		preloadUpcomingVideos(0);
	}
}

/**
 * Toggle mute state for all videos
 * @param {Event} event
 */
function toggleMute(event) {
	event.stopPropagation(); // Prevent play/pause toggle

	const isMuted = localStorage.getItem('feed_muted') !== 'false';
	const newMutedState = !isMuted;

	// Save preference
	localStorage.setItem('feed_muted', newMutedState ? 'true' : 'false');

	// Update all videos and mute buttons
	document.querySelectorAll('.video-item').forEach((item) => {
		const video = item.querySelector('video');
		const btn = item.querySelector('.mute-btn');

		if (video) video.muted = newMutedState;
		if (btn) updateMuteButtonState(btn, newMutedState);
	});
}

/**
 * Update mute button visual state
 * @param {HTMLElement} btn
 * @param {boolean} isMuted
 */
function updateMuteButtonState(btn, isMuted) {
	if (!btn) return;

	btn.textContent = isMuted ? '🔇' : '🔊';
	btn.classList.toggle('unmuted', !isMuted);
}

// Start
init();
