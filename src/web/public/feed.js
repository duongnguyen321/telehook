/**
 * TikTok-style Video Feed Logic
 */

// State
let token = localStorage.getItem('feed_token');
let videos = [];
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let totalPages = 1;
let currentFilters = {
	search: '',
	status: 'posted', // Default to posted as requested "giống tiktok" usually shows public content first
};

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
	reloadFeed();
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
			if (data.user && ['admin', 'mod', 'reviewer'].includes(data.user.role)) {
				window.location.href = '/admin';
				return;
			}
			localStorage.setItem('feed_token', token);
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
			const user = await res.json();
			if (['admin', 'mod', 'reviewer'].includes(user.role)) {
				window.location.href = '/admin';
				return;
			}
			showFeed();
		} else {
			localStorage.removeItem('feed_token');
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
	// Loop logic: if no more pages in API but we want infinite scroll
	// The requirement says: "Nếu scroll hết các video thì lộn lại từ video đầu tiên."

	// So if (currentPage > totalPages), we should reset currentPage to 1 and fetching again?
	// Let's handle this in the fetch response logic.

	isLoading = true;
	loadingIndicator.classList.remove('hidden');

	try {
		const params = new URLSearchParams({
			page: currentPage,
			limit: 10, // Load 10 at a time for smooth streaming
			status: currentFilters.status,
		});

		if (currentFilters.search) {
			params.append('search', currentFilters.search);
		}

		const res = await fetch(`/api/videos?${params}`, {
			headers: { Authorization: `Bearer ${token}` },
		});

		const data = await res.json();

		if (data.videos && data.videos.length > 0) {
			data.videos.forEach(appendVideo);
			totalPages = data.meta.totalPages;
			currentPage++;
		} else {
			// No videos returned
			if (currentPage === 1) {
				// Really empty
				hasMore = false;
				scroller.innerHTML =
					'<div style="color:white;text-align:center;padding-top:50vh">Không có video nào</div>';
			} else {
				// End of list, implement LOOPING
				console.log('End of list, looping back to page 1');
				currentPage = 1; // Reset to page 1
				// Don't set isLoading false yet, immediately fetch page 1
				// To avoid recursion depth issues, use setTimeout
				setTimeout(() => {
					isLoading = false;
					loadMoreVideos();
				}, 100);
				return; // Return early so we don't clear loading indicator below immediately
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

	// Set Data
	videoEl.src = videoData.videoUrl;
	videoEl.poster = ''; // Could implement thumbnails later

	titleEl.innerText = videoData.title || 'Không có tiêu đề';
	tagsEl.innerText = videoData.hashtags || '';

	// Play/Pause Interaction
	wrapper.addEventListener('click', () => {
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
}

// Start
init();
