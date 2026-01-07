/**
 * TikTok-style Video Feed Logic
 * Uses centralized API client from api.js
 */

// State - initialize token from API client
let token = API.getToken();
let videos = [];
let currentUser = null;
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let totalPages = 1;

// Watched Videos Tracking
const WATCHED_THRESHOLD = 0.1; // 10%
const WATCHED_STORAGE_KEY = 'feed_watched_videos';

function getWatchedVideos() {
	try {
		const data = localStorage.getItem(WATCHED_STORAGE_KEY);
		return data ? JSON.parse(data) : [];
	} catch {
		return [];
	}
}

function markVideoAsWatched(videoId) {
	const watched = getWatchedVideos();
	if (!watched.includes(videoId)) {
		watched.push(videoId);
		localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(watched));
		console.log('[Feed] Marked video as watched:', videoId);
	}
}

function clearWatchedVideos() {
	localStorage.removeItem(WATCHED_STORAGE_KEY);
	console.log('[Feed] Cleared watched videos list - starting fresh');
}

// Preload Configuration
const PRELOAD_AHEAD = 8;
const preloadedUrls = new Set();

function preloadUpcomingVideos(currentIndex) {
	const items = document.querySelectorAll('.video-item');
	const endIndex = Math.min(currentIndex + PRELOAD_AHEAD, items.length);
	const urlsToPreload = [];

	for (let i = currentIndex; i < endIndex; i++) {
		const video = items[i]?.querySelector('video');
		if (video?.src && !preloadedUrls.has(video.src)) {
			preloadedUrls.add(video.src);
			urlsToPreload.push(video.src);
			if (i < currentIndex + 3) {
				video.preload = 'auto';
			}
		}
	}

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

// Intersection Observer for Auto-Play
const observerOptions = {
	root: scroller,
	threshold: 0.6,
};

const videoObserver = new IntersectionObserver((entries) => {
	entries.forEach((entry) => {
		const video = entry.target.querySelector('video');
		const videoId = entry.target.dataset.videoId;
		if (!video) return;

		if (entry.isIntersecting) {
			if (videoId) markVideoAsWatched(videoId);

			const items = Array.from(document.querySelectorAll('.video-item'));
			const currentIndex = items.indexOf(entry.target);
			if (currentIndex >= 0) preloadUpcomingVideos(currentIndex);

			const playPromise = video.play();
			if (playPromise !== undefined) {
				playPromise.catch((error) => {
					console.log('Autoplay prevented:', error);
				});
			}
		} else {
			video.pause();
		}
	});
}, observerOptions);

// --- Initialization ---

function init() {
	// Initialize Telegram WebApp for Auto-fill
	if (window.Telegram && window.Telegram.WebApp) {
		window.Telegram.WebApp.ready();
		window.Telegram.WebApp.expand();
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

	// Scroller infinite load
	scroller.addEventListener('scroll', () => {
		const scrollTop = scroller.scrollTop;
		const scrollHeight = scroller.scrollHeight;
		const clientHeight = scroller.clientHeight;

		if (scrollTop + clientHeight >= scrollHeight - clientHeight * 2) {
			loadMoreVideos();
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

function updateSwitchButton() {
	const switchBtn = document.getElementById('switch-dashboard-btn');
	if (!switchBtn) return;

	if (currentUser && ['admin', 'mod', 'reviewer'].includes(currentUser.role)) {
		switchBtn.classList.remove('hidden');
	} else {
		switchBtn.classList.add('hidden');
	}
}

function goToAdmin() {
	window.location.href = '/admin';
}

// --- Auth ---

async function requestOTP() {
	const telegramId = document.getElementById('telegram-id').value;
	if (!telegramId) {
		document.getElementById('login-message').innerText =
			'Vui lòng nhập Telegram ID';
		return;
	}

	try {
		// Auth endpoints don't need token
		const { ok, data, error } = await API.post('/api/auth/request-otp', {
			telegramId,
		});

		if (ok && data.success) {
			localStorage.setItem('telegram_id', telegramId);
			document.getElementById('step-1').classList.add('hidden');
			document.getElementById('step-2').classList.remove('hidden');
			document.getElementById('login-message').innerText = '';
		} else {
			document.getElementById('login-message').innerText =
				error || data?.message || 'Lỗi gửi OTP';
		}
	} catch (e) {
		document.getElementById('login-message').innerText = 'Lỗi kết nối';
	}
}

async function verifyOTP() {
	const telegramId = document.getElementById('telegram-id').value;
	const code = document.getElementById('otp-code').value;

	try {
		const { ok, data, error } = await API.post('/api/auth/verify-otp', {
			telegramId,
			code,
		});

		if (ok && data.success) {
			token = data.token;
			currentUser = data.user;
			API.setToken(token); // Use centralized token management
			showFeed();
		} else {
			document.getElementById('login-message').innerText =
				error || 'Mã OTP không đúng';
		}
	} catch (e) {
		document.getElementById('login-message').innerText = 'Lỗi xác thực';
	}
}

function backToStep1() {
	document.getElementById('step-1').classList.remove('hidden');
	document.getElementById('step-2').classList.add('hidden');
}

async function checkAuth() {
	try {
		const { ok, data } = await API.get('/api/auth/me');
		if (ok) {
			currentUser = data;
			showFeed();
		} else {
			API.clearToken();
			token = null;
			showLogin();
		}
	} catch (e) {
		showLogin();
	}
}

// --- Video Feed ---

function reloadFeed() {
	scroller.innerHTML = '';
	videos = [];
	currentPage = 1;
	hasMore = true;
	loadMoreVideos();
}

async function loadMoreVideos() {
	if (isLoading) return;

	isLoading = true;
	loadingIndicator.classList.remove('hidden');

	try {
		const watchedVideos = getWatchedVideos();
		const params = new URLSearchParams({
			page: currentPage,
			limit: 10,
			status: 'all',
			shuffle: '1',
		});

		if (watchedVideos.length > 0) {
			params.append('excludeWatched', watchedVideos.join(','));
		}

		const { ok, data } = await API.get(`/api/videos?${params}`);

		if (!ok) {
			console.error('Load video error');
			return;
		}

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
			if (currentPage === 1) {
				hasMore = false;
				scroller.innerHTML =
					'<div style="color:white;text-align:center;padding-top:50vh">Không có video nào</div>';
			} else {
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

	videoItem.dataset.videoId = videoData.id;
	videoEl.src = videoData.videoUrl;
	videoEl.poster = '';

	titleEl.innerText = videoData.title || 'Không có tiêu đề';
	tagsEl.innerText = videoData.hashtags || '';

	const isMuted = localStorage.getItem('feed_muted') !== 'false';
	videoEl.muted = isMuted;
	updateMuteButtonState(muteBtn, isMuted);

	let hasMarkedWatched = false;
	videoEl.addEventListener('timeupdate', () => {
		if (hasMarkedWatched) return;
		if (
			videoEl.duration &&
			videoEl.currentTime / videoEl.duration > WATCHED_THRESHOLD
		) {
			markVideoAsWatched(videoData.id);
			hasMarkedWatched = true;
		}
	});

	wrapper.addEventListener('click', (e) => {
		if (e.target.classList.contains('mute-btn')) return;

		if (videoEl.paused) {
			videoEl.play();
			wrapper.classList.remove('paused');
		} else {
			videoEl.pause();
			wrapper.classList.add('paused');
		}
	});

	videoObserver.observe(videoItem);
	scroller.appendChild(videoItem);

	const items = document.querySelectorAll('.video-item');
	if (items.length <= PRELOAD_AHEAD) {
		preloadUpcomingVideos(0);
	}
}

function toggleMute(event) {
	event.stopPropagation();

	const isMuted = localStorage.getItem('feed_muted') !== 'false';
	const newMutedState = !isMuted;

	localStorage.setItem('feed_muted', newMutedState ? 'true' : 'false');

	document.querySelectorAll('.video-item').forEach((item) => {
		const video = item.querySelector('video');
		const btn = item.querySelector('.mute-btn');

		if (video) video.muted = newMutedState;
		if (btn) updateMuteButtonState(btn, newMutedState);
	});
}

function updateMuteButtonState(btn, isMuted) {
	if (!btn) return;
	btn.textContent = isMuted ? '🔇' : '🔊';
	btn.classList.toggle('unmuted', !isMuted);
}

// Start
init();
