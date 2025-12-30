/**
 * Video Dashboard Frontend
 */

// State
let token = localStorage.getItem('dashboard_token');
let currentUser = null;
let videos = [];
let filteredVideos = [];
let pendingDeleteId = null;
const pendingDeletes = new Set();
let sortable = null;

// Pagination State
let currentPage = 1;
let itemsPerPage = getItemsPerPage(); // Responsive
let totalPages = 1;
let totalItems = 0;
let duplicateCount = 0; // From API
let globalPendingCount = 0;
let globalPostedCount = 0;
let globalTotal = 0;

// Video Cache - store loaded video URLs to avoid reloading
const videoCache = new Map();

/**
 * Remove video from cache (both Map and Service Worker)
 */
function removeFromVideoCache(videoId, videoUrl) {
	// Remove from in-memory Map
	videoCache.delete(videoId);

	// Remove from Service Worker cache
	if ('caches' in window && videoUrl) {
		caches.open('video-cache-v1').then((cache) => {
			cache.delete(videoUrl).then((deleted) => {
				if (deleted) console.log('[Cache] Removed from SW cache:', videoId);
			});
		});
	}
}

/**
 * Get responsive items per page based on screen width
 */
function getItemsPerPage() {
	const width = window.innerWidth;
	if (width <= 768) return 12; // Mobile
	if (width <= 1024) return 24; // Tablet
	return 40; // Desktop
}

// Update itemsPerPage on resize (debounced)
let resizeTimer = null;
window.addEventListener('resize', () => {
	if (resizeTimer) clearTimeout(resizeTimer);
	resizeTimer = setTimeout(() => {
		const newItemsPerPage = getItemsPerPage();
		if (newItemsPerPage !== itemsPerPage) {
			itemsPerPage = newItemsPerPage;
			// Reload current page with new limit
			if (currentTab === 'videos') loadVideos(1);
		}
	}, 300);
});

// Filter State
let currentSearch = '';
let currentStatus = 'all';
let searchDebounceTimer = null;

// Tab State
let currentTab = 'videos';
let currentUsersPage = 1;
let currentAuditPage = 1;

// API Base URL
const API_BASE = '/api';

// ========== Auth Functions ==========

async function requestOTP() {
	const telegramId = document.getElementById('telegram-id').value.trim();
	if (!telegramId) {
		showError('Vui lòng nhập Telegram ID');
		return;
	}

	const btn = document.getElementById('btn-request-otp');
	btn.disabled = true;
	btn.textContent = 'Đang gửi...';
	hideError();

	try {
		const res = await fetch(`${API_BASE}/auth/request-otp`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ telegramId }),
		});

		const data = await res.json();

		if (!res.ok) {
			throw new Error(data.error || 'Lỗi không xác định');
		}

		// Save telegram ID for next time
		localStorage.setItem('dashboard_telegram_id', telegramId);

		// Show OTP input step
		document.getElementById('login-step-1').classList.add('hidden');
		document.getElementById('login-step-2').classList.remove('hidden');
		document.getElementById('otp-code').focus();
	} catch (error) {
		showError(error.message);
	} finally {
		btn.disabled = false;
		btn.textContent = 'Gửi mã xác thực';
	}
}

async function verifyOTP() {
	const telegramId = document.getElementById('telegram-id').value.trim();
	const code = document.getElementById('otp-code').value.trim();

	if (!code || code.length !== 6) {
		showError('Vui lòng nhập mã 6 số');
		return;
	}

	const btn = document.getElementById('btn-verify-otp');
	btn.disabled = true;
	btn.textContent = 'Đang xác thực...';
	hideError();

	try {
		const res = await fetch(`${API_BASE}/auth/verify-otp`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ telegramId, code }),
		});

		const data = await res.json();

		if (!res.ok) {
			throw new Error(data.error || 'Mã không hợp lệ');
		}

		// Save token and user
		token = data.token;
		currentUser = data.user;
		localStorage.setItem('dashboard_token', token);

		// Show dashboard
		showDashboard();
	} catch (error) {
		showError(error.message);
	} finally {
		btn.disabled = false;
		btn.textContent = 'Xác nhận';
	}
}

function backToStep1() {
	document.getElementById('login-step-1').classList.remove('hidden');
	document.getElementById('login-step-2').classList.add('hidden');
	document.getElementById('otp-code').value = '';
	hideError();
}

async function logout() {
	try {
		await fetch(`${API_BASE}/auth/logout`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}` },
		});
	} catch (e) {
		// Ignore
	}

	token = null;
	currentUser = null;
	localStorage.removeItem('dashboard_token');
	showLogin();
}

function showError(message) {
	const el = document.getElementById('login-error');
	el.textContent = message;
	el.classList.remove('hidden');
}

function hideError() {
	document.getElementById('login-error').classList.add('hidden');
}

// ========== Dashboard Functions ==========

async function checkAuth() {
	if (!token) {
		showLogin();
		return;
	}

	try {
		const res = await fetch(`${API_BASE}/auth/me`, {
			headers: { Authorization: `Bearer ${token}` },
		});

		if (!res.ok) {
			throw new Error('Token expired');
		}

		currentUser = await res.json();
		showDashboard();
	} catch (error) {
		token = null;
		localStorage.removeItem('dashboard_token');
		showLogin();
	}
}

function showLogin() {
	document.getElementById('login-page').classList.remove('hidden');
	document.getElementById('dashboard-page').classList.add('hidden');
}

function showDashboard() {
	document.getElementById('login-page').classList.add('hidden');
	document.getElementById('dashboard-page').classList.remove('hidden');

	// Update user info
	document.getElementById(
		'user-info'
	).textContent = `${currentUser.firstName} (${currentUser.role})`;

	// Show admin tabs if applicable
	showAdminTabs();

	// Initialize from URL and load appropriate content
	initFromURL();
}

/**
 * Get all URL params as object
 */
function getURLParams() {
	const params = new URLSearchParams(window.location.search);
	return {
		tab: params.get('tab') || 'videos',
		page: parseInt(params.get('page')) || 1,
		search: params.get('search') || '',
		status: params.get('status') || 'all',
		usersPage: parseInt(params.get('usersPage')) || 1,
		auditPage: parseInt(params.get('auditPage')) || 1,
	};
}

/**
 * Update URL params (without reload)
 */
function updateURLParams(updates) {
	const url = new URL(window.location);

	for (const [key, value] of Object.entries(updates)) {
		// Remove param if default value
		const isDefault =
			(key === 'tab' && value === 'videos') ||
			(key === 'page' && value === 1) ||
			(key === 'search' && value === '') ||
			(key === 'status' && value === 'all') ||
			(key === 'usersPage' && value === 1) ||
			(key === 'auditPage' && value === 1);

		if (isDefault) {
			url.searchParams.delete(key);
		} else {
			url.searchParams.set(key, value);
		}
	}

	window.history.replaceState({}, '', url);
}

/**
 * Initialize app state from URL
 */
function initFromURL() {
	const params = getURLParams();

	currentTab = params.tab;
	currentPage = params.page;
	currentSearch = params.search;
	currentStatus = params.status;
	currentUsersPage = params.usersPage;
	currentAuditPage = params.auditPage;

	// Update UI inputs
	const searchInput = document.getElementById('search-input');
	const statusFilter = document.getElementById('status-filter');
	if (searchInput) searchInput.value = currentSearch;
	if (statusFilter) statusFilter.value = currentStatus;

	// Switch to correct tab and load content
	switchTab(currentTab, false); // false = don't reset page
}

async function loadVideos(page = currentPage) {
	try {
		currentPage = page;

		// Build API URL with search/filter params
		const params = new URLSearchParams({
			page: page,
			limit: itemsPerPage,
			t: Date.now(),
		});
		if (currentSearch) params.set('search', currentSearch);
		if (currentStatus !== 'all') params.set('status', currentStatus);

		const res = await fetch(`${API_BASE}/videos?${params}`, {
			headers: { Authorization: `Bearer ${token}` },
		});

		if (!res.ok) {
			throw new Error('Failed to load videos');
		}

		const data = await res.json();
		videos = data.videos;
		filteredVideos = videos; // Server already filtered

		// Cache video URLs for faster navigation
		videos.forEach((v) => {
			if (v.videoUrl && !videoCache.has(v.id)) {
				videoCache.set(v.id, v.videoUrl);
			}
		});

		// Update pagination state
		if (data.meta) {
			currentPage = data.meta.page;
			totalPages = data.meta.totalPages;
			totalItems = data.meta.total;
			duplicateCount = data.meta.duplicateCount || 0;
			globalPendingCount = data.meta.pendingCount || 0;
			globalPostedCount = data.meta.postedCount || 0;
			globalTotal = data.meta.globalTotal || 0;
		}

		// Sync to URL
		updateURLParams({
			tab: 'videos',
			page: currentPage,
			search: currentSearch,
			status: currentStatus,
		});

		renderVideos();
		updateStats();
		updatePaginationUI();
		initSortable();
	} catch (error) {
		console.error('Error loading videos:', error);
	}
}

/**
 * Handle search input with debounce
 */
function handleSearch() {
	if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

	searchDebounceTimer = setTimeout(() => {
		const searchInput = document.getElementById('search-input');
		currentSearch = searchInput?.value?.trim() || '';
		currentPage = 1; // Reset to page 1 on new search
		loadVideos(1);
	}, 300);
}

/**
 * Handle status filter change
 */
function handleStatusFilter() {
	const statusFilter = document.getElementById('status-filter');
	currentStatus = statusFilter?.value || 'all';
	currentPage = 1; // Reset to page 1 on filter change
	loadVideos(1);
}

/**
 * Generate pagination buttons with 3 groups: start, middle (around current), end
 */
function generatePaginationButtons() {
	if (totalPages <= 1) return '';

	const buttons = [];
	const maxPerGroup = 3; // Show 3 buttons per group for cleaner UI

	// Helper to create button HTML
	const btn = (page, label = page, isActive = false, isDisabled = false) => {
		if (isDisabled) {
			return `<button class="page-btn" disabled>${label}</button>`;
		}
		const activeClass = isActive ? 'active' : '';
		return `<button class="page-btn ${activeClass}" onclick="goToPage(${page})">${label}</button>`;
	};

	// Previous button
	buttons.push(btn(currentPage - 1, '◀', false, currentPage <= 1));

	// Calculate visible page ranges
	const showStart = []; // Pages at the start (1, 2, 3...)
	const showMiddle = []; // Pages around current
	const showEnd = []; // Pages at the end (...n-2, n-1, n)

	// Start group: first 3 pages
	for (let i = 1; i <= Math.min(maxPerGroup, totalPages); i++) {
		showStart.push(i);
	}

	// End group: last 3 pages
	for (
		let i = Math.max(totalPages - maxPerGroup + 1, 1);
		i <= totalPages;
		i++
	) {
		if (!showStart.includes(i)) {
			showEnd.push(i);
		}
	}

	// Middle group: 2 pages before and after current (5 total centered on current)
	const middleStart = Math.max(currentPage - 2, 1);
	const middleEnd = Math.min(currentPage + 2, totalPages);
	for (let i = middleStart; i <= middleEnd; i++) {
		if (!showStart.includes(i) && !showEnd.includes(i)) {
			showMiddle.push(i);
		}
	}

	// Build button array with ellipsis
	const allPages = [...showStart];

	// Add ellipsis before middle if needed
	if (
		showMiddle.length > 0 &&
		showMiddle[0] > showStart[showStart.length - 1] + 1
	) {
		allPages.push('...');
	}

	// Add middle pages
	allPages.push(...showMiddle);

	// Add ellipsis before end if needed
	const lastShown =
		showMiddle.length > 0
			? showMiddle[showMiddle.length - 1]
			: showStart[showStart.length - 1];
	if (showEnd.length > 0 && showEnd[0] > lastShown + 1) {
		allPages.push('...');
	}

	// Add end pages
	allPages.push(...showEnd);

	// Generate buttons
	for (const page of allPages) {
		if (page === '...') {
			buttons.push('<span class="page-ellipsis">...</span>');
		} else {
			buttons.push(btn(page, page, page === currentPage));
		}
	}

	// Next button
	buttons.push(btn(currentPage + 1, '▶', false, currentPage >= totalPages));

	return buttons.join('');
}

function updatePaginationUI() {
	const container = document.getElementById('pagination-controls');
	if (totalItems === 0 || totalPages <= 1) {
		container.classList.add('hidden');
		return;
	}

	container.classList.remove('hidden');
	container.innerHTML = `
		<div class="pagination-info">Trang ${currentPage} / ${totalPages} (${totalItems} video)</div>
		<div class="pagination-buttons">${generatePaginationButtons()}</div>
	`;
}

function goToPage(page) {
	if (page < 1 || page > totalPages || page === currentPage) return;
	loadVideos(page);
	window.scrollTo({ top: 0, behavior: 'smooth' });
}

function refreshVideos() {
	loadVideos(currentPage);
}

function updateStats() {
	// Display global stats from API (not just current page)
	document.getElementById('stat-total').textContent = globalTotal;
	document.getElementById('stat-pending').textContent = globalPendingCount;
	document.getElementById('stat-posted').textContent = globalPostedCount;
	document.getElementById('stat-duplicates').textContent = duplicateCount;
}

function renderVideos() {
	const list = document.getElementById('video-list');

	// Detect duplicates (only for videos with data)
	const dupCounts = {};
	filteredVideos.forEach((v) => {
		if (v.duration && v.fileSize) {
			const key = `${v.duration}_${v.fileSize}`;
			dupCounts[key] = (dupCounts[key] || 0) + 1;
		}
	});

	list.innerHTML = filteredVideos
		.map((video, index) => {
			// Only mark as duplicate if has data AND count > 1
			let isDuplicate = false;
			if (video.duration && video.fileSize) {
				const dupKey = `${video.duration}_${video.fileSize}`;
				isDuplicate = dupCounts[dupKey] > 1;
			}
			return `
		<div class="video-card ${isDuplicate ? 'duplicate' : ''} ${
				video.status
			}" data-id="${video.id}" data-status="${video.status}">
			<div class="video-card-header">
				<div class="drag-handle">⋮⋮</div>
				<div class="video-index">${
					video.order || index + 1 + (currentPage - 1) * itemsPerPage
				}</div>
				<span class="video-status ${video.status}">${
				video.status === 'pending' ? '⏳' : '✅'
			}</span>
				<span style="font-size: 11px; color: var(--text-muted)">📅 ${formatDate(
					video.scheduledAt
				)}</span>
			</div>
			<div class="video-thumbnail" onclick="openVideoModal('${
				video.id
			}')" data-url="${video.videoUrl || ''}">
				${
					video.videoUrl
						? `<video data-src="${video.videoUrl}" preload="none" muted playsinline></video>`
						: '🎬'
				}
			</div>
			<div class="video-info">
				<div class="video-title" 
					${currentUser?.canEdit ? 'contenteditable="true"' : ''}
					onblur="updateTitle('${video.id}', this.textContent)"
					onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"
				>${escapeHtml(video.title)}</div>
				<div class="video-hashtags">${escapeHtml(video.hashtags)}</div>
			</div>
			<div class="video-actions">
				<button onclick="downloadVideo('${video.id}', '${escapeHtml(
				video.title
			)}')" title="Tải video">⬇️</button>
				${
					currentUser?.canEdit
						? `<button onclick="editHashtags('${video.id}')" title="Sửa hashtags">🏷️</button>`
						: ''
				}
				${
					currentUser?.canDelete
						? `<button onclick="toggleDelete('${video.id}')" title="Đánh dấu xóa" class="btn-delete">❌</button>`
						: ''
				}
			</div>
		</div>
	`;
		})
		.join('');

	// Setup lazy loading and visibility-based playback
	initVideoObserver();

	// Restore marked-for-delete state for videos in pendingDeletes
	pendingDeletes.forEach((id) => {
		const card = document.querySelector(`.video-card[data-id="${id}"]`);
		if (card) card.classList.add('marked-for-delete');
	});
}

// Store observer globally to avoid re-creating
let videoObserver = null;

function initVideoObserver() {
	// Disconnect existing observer if any
	if (videoObserver) {
		videoObserver.disconnect();
	}

	// Create IntersectionObserver for lazy loading and play/pause control
	videoObserver = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				const video = entry.target;

				if (entry.isIntersecting) {
					// Video is visible - load and play
					if (!video.src && video.dataset.src) {
						video.src = video.dataset.src;
						video.load();
					}
					video.muted = true;
					video.currentTime = 0;
					video.play().catch(() => {});
				} else {
					// Video is not visible - pause to save resources
					video.pause();
				}
			});
		},
		{
			root: null, // viewport
			rootMargin: '100px', // preload 100px before visible
			threshold: 0.1, // trigger when 10% visible
		}
	);

	// Observe all video elements
	document.querySelectorAll('.video-thumbnail video').forEach((video) => {
		// Setup 3s loop
		video.addEventListener('timeupdate', () => {
			if (video.currentTime >= 3) {
				video.currentTime = 0;
				if (!video.paused) video.play().catch(() => {});
			}
		});

		// Start observing
		videoObserver.observe(video);
	});
}

function initSortable() {
	const list = document.getElementById('video-list');

	if (sortable) {
		sortable.destroy();
	}

	// Check if mobile - disable DND completely
	const isMobile = window.innerWidth <= 768;

	sortable = new Sortable(list, {
		animation: 150,
		handle: '.drag-handle',
		ghostClass: 'sortable-ghost',
		chosenClass: 'sortable-chosen',
		disabled: !currentUser?.canEdit || isMobile,
		// Filter out posted videos - they cannot be dragged
		filter: '.posted',
		preventOnFilter: false,
		onEnd: async function (evt) {
			if (evt.oldIndex === evt.newIndex) return;

			// Get new order
			const cards = list.querySelectorAll('.video-card');
			const newOrder = [];

			// Swap the scheduledAt times based on new positions
			const times = filteredVideos.map((v) => v.scheduledAt);

			cards.forEach((card, index) => {
				const videoId = card.dataset.id;
				newOrder.push({
					id: videoId,
					scheduledAt: times[index],
				});
			});

			try {
				const res = await fetch(`${API_BASE}/videos/reorder/batch`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ order: newOrder }),
				});

				if (!res.ok) {
					throw new Error('Reorder failed');
				}

				// Reload to get fresh data
				await loadVideos();
			} catch (error) {
				console.error('Reorder error:', error);
				// Reload to restore order
				loadVideos();
			}
		},
	});
}

// ========== Download Function ==========

/**
 * Download video through internal API (not direct S3/R2 URL)
 */
function downloadVideo(videoId, title) {
	// Create download URL through our API
	const downloadUrl = `${API_BASE}/videos/${videoId}/stream?download=1`;

	// Create temporary link and trigger download
	const link = document.createElement('a');
	link.href = downloadUrl;
	link.download = `${title || videoId}.mp4`;
	link.style.display = 'none';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	showNotify('info', 'Đang tải...', 'Video đang được tải xuống. Vui lòng đợi.');
}

// ========== Edit Functions ==========

async function updateTitle(videoId, newTitle) {
	if (!currentUser?.canEdit) return;

	const video = videos.find((v) => v.id === videoId);
	if (!video || video.title === newTitle.trim()) return;

	try {
		const res = await fetch(`${API_BASE}/videos/${videoId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ title: newTitle.trim() }),
		});

		if (!res.ok) {
			throw new Error('Update failed');
		}

		// Update local state
		video.title = newTitle.trim();
	} catch (error) {
		console.error('Update error:', error);
		// Reload to restore original
		loadVideos();
	}
}

// ========== Notification Modal Functions ==========

let pendingHashtagVideoId = null;

/**
 * Show notification modal (replaces alert)
 * @param {string} type - 'success' | 'error' | 'info'
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 */
function showNotify(type, title, message) {
	const modal = document.getElementById('notify-modal');
	const iconEl = document.getElementById('notify-icon');
	const titleEl = document.getElementById('notify-title');
	const messageEl = document.getElementById('notify-message');

	// Set icon based on type
	const icons = { success: '✅', error: '❌', info: 'ℹ️' };
	iconEl.textContent = icons[type] || '📢';
	iconEl.className = `notify-icon ${type}`;

	titleEl.textContent = title;
	messageEl.textContent = message;

	modal.classList.remove('hidden');
}

function closeNotifyModal() {
	document.getElementById('notify-modal').classList.add('hidden');
}

// ========== Hashtag Modal Functions ==========

function editHashtags(videoId) {
	const video = videos.find((v) => v.id === videoId);
	if (!video) return;

	pendingHashtagVideoId = videoId;
	const input = document.getElementById('hashtag-input');
	input.value = video.hashtags || '';

	document.getElementById('hashtag-modal').classList.remove('hidden');
	input.focus();
}

function closeHashtagModal() {
	pendingHashtagVideoId = null;
	document.getElementById('hashtag-modal').classList.add('hidden');
}

async function saveHashtags() {
	if (!pendingHashtagVideoId) return;

	const videoId = pendingHashtagVideoId;
	const newHashtags = document.getElementById('hashtag-input').value.trim();
	const video = videos.find((v) => v.id === videoId);

	if (!video || newHashtags === video.hashtags) {
		closeHashtagModal();
		return;
	}

	try {
		const res = await fetch(`${API_BASE}/videos/${videoId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ hashtags: newHashtags }),
		});

		if (!res.ok) {
			throw new Error('Update failed');
		}

		// Update local state
		video.hashtags = newHashtags;
		renderVideos();
		closeHashtagModal();
		showNotify('success', 'Thành công', 'Đã cập nhật hashtags!');
	} catch (error) {
		console.error('Update error:', error);
		showNotify(
			'error',
			'Lỗi',
			'Không thể cập nhật hashtags. Vui lòng thử lại.'
		);
	}
}

// ========== Delete Functions ==========

function closeDeleteModal() {
	pendingDeleteId = null;
	document.getElementById('delete-modal').classList.add('hidden');
}

async function confirmDelete() {
	if (!pendingDeleteId) return;

	// Get video URL before deleting (for cache cleanup)
	const video = videos.find((v) => v.id === pendingDeleteId);
	const videoUrl = video?.videoUrl;

	try {
		const res = await fetch(`${API_BASE}/videos/${pendingDeleteId}`, {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${token}` },
		});

		if (!res.ok) {
			const data = await res.json();
			throw new Error(data.error || 'Delete failed');
		}

		// Remove from cache
		if (videoUrl) removeFromVideoCache(pendingDeleteId, videoUrl);

		closeDeleteModal();
		loadVideos();
	} catch (error) {
		console.error('Delete error:', error);
		showNotify('error', 'Lỗi xóa video', error.message);
	}
}

// ========== Batch Delete ==========

function toggleDelete(id) {
	if (pendingDeletes.has(id)) {
		pendingDeletes.delete(id);
	} else {
		pendingDeletes.add(id);
	}

	updateBatchDeleteUI();

	// Update specific card
	const card = document.querySelector(`.video-card[data-id="${id}"]`);
	if (card) {
		if (pendingDeletes.has(id)) {
			card.classList.add('marked-for-delete');
		} else {
			card.classList.remove('marked-for-delete');
		}
	}
}

function updateBatchDeleteUI() {
	const bar = document.getElementById('save-actions');
	const countEl = document.getElementById('delete-count');

	if (pendingDeletes.size > 0) {
		bar.classList.remove('hidden');
		countEl.textContent = pendingDeletes.size;
	} else {
		bar.classList.add('hidden');
	}
}

function cancelBatchDeletes() {
	pendingDeletes.clear();
	updateBatchDeleteUI();
	document.querySelectorAll('.video-card.marked-for-delete').forEach((card) => {
		card.classList.remove('marked-for-delete');
	});
}

async function saveBatchDeletes() {
	if (pendingDeletes.size === 0) return;

	const ids = Array.from(pendingDeletes);
	const btn = document.querySelector('#save-actions .btn-danger');
	const originalText = btn.textContent;
	btn.textContent = 'Đang xử lý...';
	btn.disabled = true;

	try {
		const res = await fetch(`${API_BASE}/videos/batch-delete`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ ids }),
		});

		if (!res.ok) {
			const data = await res.json();
			throw new Error(data.error || 'Delete failed');
		}

		const result = await res.json();

		// Remove deleted videos from cache
		ids.forEach((id) => {
			const video = videos.find((v) => v.id === id);
			if (video?.videoUrl) removeFromVideoCache(id, video.videoUrl);
		});

		showNotify(
			'success',
			'Thành công',
			`Đã xóa ${result.deleted} video và sắp xếp lại lịch đăng!`
		);

		pendingDeletes.clear();
		updateBatchDeleteUI();
		loadVideos();
	} catch (error) {
		console.error('Batch delete error:', error);
		showNotify('error', 'Lỗi xóa video', error.message);
	} finally {
		btn.textContent = originalText;
		btn.disabled = false;
	}
}

// ========== Video Modal ==========

function openVideoModal(videoId) {
	const video = videos.find((v) => v.id === videoId);
	if (!video || !video.videoUrl) return;

	const modal = document.getElementById('video-modal');
	const videoEl = document.getElementById('modal-video');
	const info = document.getElementById('modal-info');

	videoEl.src = video.videoUrl;
	info.innerHTML = `
		<h3>${escapeHtml(video.title)}</h3>
		<p style="color: var(--accent)">${escapeHtml(video.hashtags)}</p>
		<p style="color: var(--text-muted); font-size: 13px">
			📅 ${formatDate(video.scheduledAt)} • 
			${video.status === 'pending' ? '⏳ Chờ đăng' : '✅ Đã đăng'}
		</p>
	`;

	modal.classList.remove('hidden');
	videoEl.play();
}

function closeVideoModal() {
	const modal = document.getElementById('video-modal');
	const videoEl = document.getElementById('modal-video');

	videoEl.pause();
	videoEl.src = '';
	modal.classList.add('hidden');
}

// Close modal on outside click
document.addEventListener('click', (e) => {
	if (e.target.classList.contains('modal')) {
		if (e.target.id === 'video-modal') closeVideoModal();
		if (e.target.id === 'delete-modal') closeDeleteModal();
		if (e.target.id === 'notify-modal') closeNotifyModal();
		if (e.target.id === 'hashtag-modal') closeHashtagModal();
		if (e.target.id === 'user-modal') closeUserModal();
	}
});

// ========== Helpers ==========

function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

function formatDate(isoString) {
	const date = new Date(isoString);
	const day = date.getDate().toString().padStart(2, '0');
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	const hours = date.getHours().toString().padStart(2, '0');
	const mins = date.getMinutes().toString().padStart(2, '0');
	return `${day}/${month} ${hours}:${mins}`;
}

// ========== Init ==========

// Register Service Worker for video caching
if ('serviceWorker' in navigator) {
	navigator.serviceWorker
		.register('/sw.js')
		.then((registration) => {
			console.log('[App] Service Worker registered:', registration.scope);
		})
		.catch((error) => {
			console.warn('[App] Service Worker registration failed:', error);
		});
}

// Check auth on load
checkAuth();

// Load saved telegram ID if exists
const savedTelegramId = localStorage.getItem('dashboard_telegram_id');
if (savedTelegramId) {
	document.getElementById('telegram-id').value = savedTelegramId;
}

// Handle Enter key on inputs
document.getElementById('telegram-id').addEventListener('keydown', (e) => {
	if (e.key === 'Enter') requestOTP();
});

document.getElementById('otp-code').addEventListener('keydown', (e) => {
	if (e.key === 'Enter') verifyOTP();
});

// ========== Admin Panel Functions ==========

// Show admin tabs if user is admin
function showAdminTabs() {
	if (currentUser?.role === 'admin') {
		document.querySelectorAll('.admin-only').forEach((el) => {
			el.classList.remove('hidden');
		});
	}
}

// Switch between tabs
function switchTab(tabName, resetPage = true) {
	currentTab = tabName;

	// Update tab buttons
	document.querySelectorAll('.tab').forEach((tab) => {
		tab.classList.toggle('active', tab.dataset.tab === tabName);
	});

	// Update tab content - toggle both active and hidden classes
	document.querySelectorAll('.tab-content').forEach((content) => {
		const isActive = content.id === `tab-${tabName}`;
		content.classList.toggle('active', isActive);
		content.classList.toggle('hidden', !isActive);
	});

	// Load content based on tab
	if (tabName === 'videos') {
		if (resetPage) currentPage = 1;
		loadVideos(currentPage);
	} else if (tabName === 'users' && currentUser?.role === 'admin') {
		if (resetPage) currentUsersPage = 1;
		loadUsers(currentUsersPage);
	} else if (tabName === 'audit' && currentUser?.role === 'admin') {
		if (resetPage) currentAuditPage = 1;
		loadAuditLogs(currentAuditPage);
	}
}

// Load users list (1-based pagination)
let usersSearch = '';
let usersRole = 'all';
let usersSortBy = 'viewCount';
let usersSortOrder = 'desc';
let usersTotalPages = 1;
let usersTotalItems = 0;
let usersSearchDebounce = null;

async function loadUsers(page = 1) {
	currentUsersPage = page;
	const container = document.getElementById('users-list');
	container.innerHTML =
		'<div style="text-align:center;padding:20px">Đang tải...</div>';

	// Read filter values from UI
	const searchInput = document.getElementById('users-search');
	const roleFilter = document.getElementById('users-role-filter');
	const sortSelect = document.getElementById('users-sort');

	if (searchInput) usersSearch = searchInput.value.trim();
	if (roleFilter) usersRole = roleFilter.value;
	if (sortSelect) {
		const [sortBy, sortOrder] = sortSelect.value.split('-');
		usersSortBy = sortBy;
		usersSortOrder = sortOrder;
	}

	// Build API params
	const params = new URLSearchParams({
		page,
		limit: 20,
		sortBy: usersSortBy,
		sortOrder: usersSortOrder,
	});
	if (usersSearch) params.set('search', usersSearch);
	if (usersRole !== 'all') params.set('role', usersRole);

	// Update URL
	updateURLParams({ tab: 'users', usersPage: page });

	try {
		const res = await fetch(`${API_BASE}/admin/users?${params}`, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('dashboard_token')}`,
			},
		});

		if (!res.ok) throw new Error('Failed to load users');

		const data = await res.json();

		if (data.meta) {
			usersTotalPages = data.meta.totalPages;
			usersTotalItems = data.meta.total;
		}

		if (!data.users || data.users.length === 0) {
			container.innerHTML =
				'<div style="text-align:center;padding:20px;color:var(--text-muted)">Không có user nào</div>';
			document.getElementById('users-pagination').innerHTML = '';
			return;
		}

		container.innerHTML = data.users
			.map(
				(user) => `
			<div class="user-card" onclick="viewUserDetails('${user.telegramId}')">
				<div class="user-avatar">${(user.firstName ||
					user.username ||
					'?')[0].toUpperCase()}</div>
				<div class="user-info">
					<div class="user-name">${escapeHtml(user.firstName || '')} ${escapeHtml(
					user.lastName || ''
				)}</div>
					<div class="user-username">@${escapeHtml(
						user.username || 'no_username'
					)} • ID: ${user.telegramId}</div>
					<div class="user-meta">
						<span class="user-role ${user.role}">${user.role.toUpperCase()}</span>
					</div>
				</div>
				<div class="user-stats">
					<div class="user-stat-value">${user.viewCount || 0}</div>
					<div class="user-stat-label">lượt xem</div>
				</div>
			</div>
		`
			)
			.join('');

		// Render pagination like videos tab
		renderTabPagination(
			'users-pagination',
			currentUsersPage,
			usersTotalPages,
			usersTotalItems,
			'goToUsersPage'
		);
	} catch (error) {
		container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--danger)">${error.message}</div>`;
	}
}

function handleUsersSearch() {
	if (usersSearchDebounce) clearTimeout(usersSearchDebounce);
	usersSearchDebounce = setTimeout(() => {
		currentUsersPage = 1;
		loadUsers(1);
	}, 300);
}

function handleUsersFilter() {
	currentUsersPage = 1;
	loadUsers(1);
}

// ========== User Details Modal ==========

function closeUserModal() {
	document.getElementById('user-modal').classList.add('hidden');
}

async function viewUserDetails(telegramId) {
	try {
		const res = await fetch(`${API_BASE}/admin/users/${telegramId}`, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('dashboard_token')}`,
			},
		});

		if (!res.ok) throw new Error('Failed to load user');

		const data = await res.json();
		const user = data.user;

		// Build modal content
		const actionsHtml = data.actions
			.slice(0, 10)
			.map(
				(a) => `
			<div class="user-action-item">
				<span class="user-action-dot">•</span>
				<span>${escapeHtml(a.action)}${
					a.details ? ': ' + escapeHtml(a.details) : ''
				}</span>
			</div>
		`
			)
			.join('');

		const content = `
			<div class="user-detail-header">
				<div class="user-detail-avatar">${(user.firstName ||
					user.username ||
					'?')[0].toUpperCase()}</div>
				<div class="user-detail-info">
					<h3>${escapeHtml(user.firstName || '')} ${escapeHtml(user.lastName || '')}</h3>
					<p>@${escapeHtml(
						user.username || 'no_username'
					)} • Role: <strong>${user.role.toUpperCase()}</strong></p>
				</div>
			</div>
			<div class="user-detail-stats">
				<div class="user-detail-stat">
					<div class="user-detail-stat-value">${data.total}</div>
					<div class="user-detail-stat-label">Tổng actions</div>
				</div>
				<div class="user-detail-stat">
					<div class="user-detail-stat-value">${user.viewCount || 0}</div>
					<div class="user-detail-stat-label">Lượt xem</div>
				</div>
			</div>
			<div class="user-actions-list">
				<h4>📋 Hoạt động gần đây:</h4>
				${
					actionsHtml ||
					'<div style="color: var(--text-muted)">Chưa có hoạt động</div>'
				}
			</div>
		`;

		document.getElementById('user-modal-content').innerHTML = content;
		document.getElementById('user-modal').classList.remove('hidden');
	} catch (error) {
		showNotify(
			'error',
			'Lỗi',
			'Không thể tải thông tin user: ' + error.message
		);
	}
}

// Load audit logs (1-based pagination)
let auditSearch = '';
let auditAction = 'all';
let auditSortOrder = 'desc';
let auditTotalPages = 1;
let auditTotalItems = 0;
let auditSearchDebounce = null;
let availableActions = [];

async function loadAuditLogs(page = 1) {
	currentAuditPage = page;
	const container = document.getElementById('audit-list');
	container.innerHTML =
		'<div style="text-align:center;padding:20px">Đang tải...</div>';

	// Read filter values from UI
	const searchInput = document.getElementById('audit-search');
	const actionFilter = document.getElementById('audit-action-filter');
	const sortSelect = document.getElementById('audit-sort');

	if (searchInput) auditSearch = searchInput.value.trim();
	if (actionFilter) auditAction = actionFilter.value;
	if (sortSelect) auditSortOrder = sortSelect.value;

	// Build API params
	const params = new URLSearchParams({
		page,
		limit: 50,
		sortOrder: auditSortOrder,
	});
	if (auditSearch) params.set('search', auditSearch);
	if (auditAction !== 'all') params.set('action', auditAction);

	// Update URL
	updateURLParams({ tab: 'audit', auditPage: page });

	try {
		const res = await fetch(`${API_BASE}/admin/audit?${params}`, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('dashboard_token')}`,
			},
		});

		if (!res.ok) throw new Error('Failed to load audit logs');

		const data = await res.json();

		if (data.meta) {
			auditTotalPages = data.meta.totalPages;
			auditTotalItems = data.meta.total;

			// Update action filter dropdown
			if (data.meta.availableActions && data.meta.availableActions.length > 0) {
				availableActions = data.meta.availableActions;
				updateAuditActionDropdown();
			}
		}

		if (!data.logs || data.logs.length === 0) {
			container.innerHTML =
				'<div style="text-align:center;padding:20px;color:var(--text-muted)">Không có log nào</div>';
			document.getElementById('audit-pagination').innerHTML = '';
			return;
		}

		container.innerHTML = data.logs
			.map(
				(log) => `
			<div class="audit-item">
				<span class="audit-time">${formatDate(log.createdAt)}</span>
				<span class="audit-user">${
					log.user?.firstName || log.user?.username || log.telegramId
				}</span>
				<span class="audit-action">${log.action}</span>
				<span class="audit-details">${escapeHtml(log.details || '')}</span>
			</div>
		`
			)
			.join('');

		// Render pagination like videos tab
		renderTabPagination(
			'audit-pagination',
			currentAuditPage,
			auditTotalPages,
			auditTotalItems,
			'goToAuditPage'
		);
	} catch (error) {
		container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--danger)">${error.message}</div>`;
	}
}

function updateAuditActionDropdown() {
	const select = document.getElementById('audit-action-filter');
	if (!select) return;

	const currentValue = select.value;
	select.innerHTML =
		'<option value="all">Tất cả action</option>' +
		availableActions.map((a) => `<option value="${a}">${a}</option>`).join('');
	select.value = currentValue;
}

function handleAuditSearch() {
	if (auditSearchDebounce) clearTimeout(auditSearchDebounce);
	auditSearchDebounce = setTimeout(() => {
		currentAuditPage = 1;
		loadAuditLogs(1);
	}, 300);
}

function handleAuditFilter() {
	currentAuditPage = 1;
	loadAuditLogs(1);
}

// Navigation functions for admin tabs
function goToUsersPage(page) {
	if (page < 1 || page > usersTotalPages) return;
	loadUsers(page);
	window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToAuditPage(page) {
	if (page < 1 || page > auditTotalPages) return;
	loadAuditLogs(page);
	window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Render pagination like videos tab (with page buttons)
function renderTabPagination(
	containerId,
	currentPg,
	totalPgs,
	totalItems,
	fnName
) {
	const container = document.getElementById(containerId);

	if (totalPgs <= 1) {
		container.innerHTML = '';
		return;
	}

	// Generate page buttons similar to videos tab
	const buttons = [];
	const maxPerGroup = 3;

	const btn = (page, label, isActive = false, isDisabled = false) => {
		if (isDisabled)
			return `<button class="page-btn" disabled>${label}</button>`;
		const activeClass = isActive ? 'active' : '';
		return `<button class="page-btn ${activeClass}" onclick="${fnName}(${page})">${label}</button>`;
	};

	buttons.push(btn(currentPg - 1, '◀', false, currentPg <= 1));

	// Start pages
	const showStart = [];
	for (let i = 1; i <= Math.min(maxPerGroup, totalPgs); i++) showStart.push(i);

	// End pages
	const showEnd = [];
	for (let i = Math.max(totalPgs - maxPerGroup + 1, 1); i <= totalPgs; i++) {
		if (!showStart.includes(i)) showEnd.push(i);
	}

	// Middle pages
	const showMiddle = [];
	const middleStart = Math.max(currentPg - 2, 1);
	const middleEnd = Math.min(currentPg + 2, totalPgs);
	for (let i = middleStart; i <= middleEnd; i++) {
		if (!showStart.includes(i) && !showEnd.includes(i)) showMiddle.push(i);
	}

	const allPages = [...showStart];
	if (
		showMiddle.length > 0 &&
		showMiddle[0] > showStart[showStart.length - 1] + 1
	)
		allPages.push('...');
	allPages.push(...showMiddle);
	const lastShown =
		showMiddle.length > 0
			? showMiddle[showMiddle.length - 1]
			: showStart[showStart.length - 1];
	if (showEnd.length > 0 && showEnd[0] > lastShown + 1) allPages.push('...');
	allPages.push(...showEnd);

	for (const page of allPages) {
		if (page === '...') buttons.push('<span class="page-ellipsis">...</span>');
		else buttons.push(btn(page, page, page === currentPg));
	}

	buttons.push(btn(currentPg + 1, '▶', false, currentPg >= totalPgs));

	container.innerHTML = `
		<div class="pagination-info">Trang ${currentPg} / ${totalPgs} (${totalItems} items)</div>
		<div class="pagination-buttons">${buttons.join('')}</div>
	`;
}
