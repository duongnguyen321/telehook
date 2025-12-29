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
let itemsPerPage = 100;
let totalPages = 1;
let totalItems = 0;

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

	// Load videos
	loadVideos();
}

async function loadVideos(page = currentPage) {
	try {
		// Add timestamp to prevent caching
		const res = await fetch(
			`${API_BASE}/videos?page=${page}&limit=${itemsPerPage}&t=${Date.now()}`,
			{
				headers: { Authorization: `Bearer ${token}` },
			}
		);

		if (!res.ok) {
			throw new Error('Failed to load videos');
		}

		const data = await res.json();
		videos = data.videos;

		// Update pagination state
		if (data.meta) {
			currentPage = data.meta.page;
			totalPages = data.meta.totalPages;
			totalItems = data.meta.total;
		}

		filterVideos();
		updateStats();
		updatePaginationUI();
		initSortable();
	} catch (error) {
		console.error('Error loading videos:', error);
	}
}

function updatePaginationUI() {
	const container = document.getElementById('pagination-controls');
	if (totalItems === 0) {
		container.classList.add('hidden');
		return;
	}

	container.classList.remove('hidden');
	document.getElementById(
		'page-info'
	).textContent = `Trang ${currentPage} / ${totalPages} (${totalItems} video)`;

	const prevBtn = document.getElementById('btn-prev-page');
	const nextBtn = document.getElementById('btn-next-page');

	prevBtn.disabled = currentPage <= 1;
	nextBtn.disabled = currentPage >= totalPages;

	// Style disabled state
	prevBtn.style.opacity = prevBtn.disabled ? '0.5' : '1';
	nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
	prevBtn.style.pointerEvents = prevBtn.disabled ? 'none' : 'auto';
	nextBtn.style.pointerEvents = nextBtn.disabled ? 'none' : 'auto';
}

function prevPage() {
	if (currentPage > 1) {
		loadVideos(currentPage - 1);
		// Scroll to top
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
}

function nextPage() {
	if (currentPage < totalPages) {
		loadVideos(currentPage + 1);
		// Scroll to top
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
}

function refreshVideos() {
	loadVideos();
}

function updateStats() {
	const pending = videos.filter((v) => v.status === 'pending').length;
	const posted = videos.filter((v) => v.status === 'posted').length;

	// Count duplicates
	const dupCounts = {};
	videos.forEach((v) => {
		let key = null;
		if (v.duration && v.fileSize) {
			key = `meta_${v.duration}_${v.fileSize}`;
		} else if (v.telegramFileId) {
			key = `tg_${v.telegramFileId}`;
		}

		if (key) {
			dupCounts[key] = (dupCounts[key] || 0) + 1;
		}
	});

	const duplicates = videos.filter((v) => {
		let key = null;
		if (v.duration && v.fileSize) {
			key = `meta_${v.duration}_${v.fileSize}`;
		} else if (v.telegramFileId) {
			key = `tg_${v.telegramFileId}`;
		}
		return key && dupCounts[key] > 1;
	}).length;

	document.getElementById('stat-total').textContent = videos.length;
	document.getElementById('stat-pending').textContent = pending;
	document.getElementById('stat-posted').textContent = posted;
	document.getElementById('stat-duplicates').textContent = duplicates;
}

function filterVideos() {
	const search = document.getElementById('search-input').value.toLowerCase();
	const status = document.getElementById('status-filter').value;

	// Build duplicate counts
	const dupCounts = {};
	videos.forEach((v) => {
		let key = null;
		if (v.duration && v.fileSize) {
			key = `meta_${v.duration}_${v.fileSize}`;
		} else if (v.telegramFileId) {
			key = `tg_${v.telegramFileId}`;
		}

		if (key) {
			dupCounts[key] = (dupCounts[key] || 0) + 1;
		}
	});

	filteredVideos = videos.filter((v) => {
		const matchSearch =
			v.title.toLowerCase().includes(search) ||
			v.hashtags.toLowerCase().includes(search);

		let matchStatus = false;
		if (status === 'all') {
			matchStatus = true;
		} else if (status === 'duplicates') {
			let key = null;
			if (v.duration && v.fileSize) {
				key = `meta_${v.duration}_${v.fileSize}`;
			} else if (v.telegramFileId) {
				key = `tg_${v.telegramFileId}`;
			}
			matchStatus = key && dupCounts[key] > 1;
		} else if (status === 'pending') {
			matchStatus = v.status === 'pending';
		} else if (status === 'posted') {
			matchStatus = v.status === 'posted';
		}

		return matchSearch && matchStatus;
	});

	renderVideos();
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
				<div class="video-index">${index + 1}</div>
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

function editHashtags(videoId) {
	const video = videos.find((v) => v.id === videoId);
	if (!video) return;

	const newHashtags = prompt('Nhập hashtags mới:', video.hashtags);
	if (newHashtags === null || newHashtags === video.hashtags) return;

	updateHashtags(videoId, newHashtags);
}

async function updateHashtags(videoId, newHashtags) {
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
		const video = videos.find((v) => v.id === videoId);
		if (video) video.hashtags = newHashtags;
		renderVideos();
	} catch (error) {
		console.error('Update error:', error);
		alert('Lỗi khi cập nhật hashtags');
	}
}

// ========== Delete Functions ==========

function askDelete(videoId) {
	const video = videos.find((v) => v.id === videoId);
	if (!video) return;

	pendingDeleteId = videoId;
	document.getElementById(
		'delete-message'
	).textContent = `Bạn có chắc muốn xóa video "${video.title.slice(
		0,
		30
	)}..."?`;
	document.getElementById('delete-modal').classList.remove('hidden');
}

function closeDeleteModal() {
	pendingDeleteId = null;
	document.getElementById('delete-modal').classList.add('hidden');
}

async function confirmDelete() {
	if (!pendingDeleteId) return;

	try {
		const res = await fetch(`${API_BASE}/videos/${pendingDeleteId}`, {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${token}` },
		});

		if (!res.ok) {
			const data = await res.json();
			throw new Error(data.error || 'Delete failed');
		}

		closeDeleteModal();
		loadVideos();
	} catch (error) {
		console.error('Delete error:', error);
		alert(`Lỗi khi xóa video: ${error.message}`);
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
		alert(`✅ Đã xóa ${result.deleted} video và sắp xếp lại lịch đăng!`);

		pendingDeletes.clear();
		updateBatchDeleteUI();
		loadVideos();
	} catch (error) {
		console.error('Batch delete error:', error);
		alert(`Lỗi khi xóa: ${error.message}`);
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

let currentUsersPage = 0;
let currentAuditPage = 0;

// Show admin tabs if user is admin
function showAdminTabs() {
	if (currentUser?.role === 'admin') {
		document.querySelectorAll('.admin-only').forEach((el) => {
			el.classList.remove('hidden');
		});
	}
}

// Switch between tabs
function switchTab(tabName) {
	// Update tab buttons
	document.querySelectorAll('.tab').forEach((tab) => {
		tab.classList.toggle('active', tab.dataset.tab === tabName);
	});

	// Update tab content
	document.querySelectorAll('.tab-content').forEach((content) => {
		content.classList.toggle('active', content.id === `tab-${tabName}`);
	});

	// Load content if switching to admin tabs
	if (tabName === 'users' && currentUser?.role === 'admin') {
		loadUsers();
	} else if (tabName === 'audit' && currentUser?.role === 'admin') {
		loadAuditLogs();
	}
}

// Load users list
async function loadUsers(page = 0) {
	currentUsersPage = page;
	const container = document.getElementById('users-list');
	container.innerHTML =
		'<div style="text-align:center;padding:20px">Đang tải...</div>';

	try {
		const res = await fetch(`${API_BASE}/admin/users?page=${page}`, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('dashboard_token')}`,
			},
		});

		if (!res.ok) throw new Error('Failed to load users');

		const data = await res.json();

		if (data.users.length === 0) {
			container.innerHTML =
				'<div style="text-align:center;padding:20px;color:var(--text-muted)">Không có user nào</div>';
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
						<div class="user-stat-value">${user.viewCount}</div>
						<div class="user-stat-label">lượt xem</div>
					</div>
				</div>
			`
			)
			.join('');

		// Render pagination
		renderPagination('users-pagination', page, data.totalPages, loadUsers);
	} catch (error) {
		container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--danger)">${error.message}</div>`;
	}
}

// View user details (show in alert for now)
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

		let message = `👤 ${user.firstName || ''} ${user.lastName || ''}\n`;
		message += `@${user.username || 'no_username'}\n`;
		message += `Role: ${user.role}\n`;
		message += `Total actions: ${data.total}\n\n`;
		message += `Recent actions:\n`;

		data.actions.slice(0, 10).forEach((a) => {
			message += `• ${a.action}${a.details ? ': ' + a.details : ''}\n`;
		});

		alert(message);
	} catch (error) {
		alert('Error: ' + error.message);
	}
}

// Load audit logs
async function loadAuditLogs(page = 0) {
	currentAuditPage = page;
	const container = document.getElementById('audit-list');
	container.innerHTML =
		'<div style="text-align:center;padding:20px">Đang tải...</div>';

	try {
		const res = await fetch(`${API_BASE}/admin/audit?page=${page}`, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('dashboard_token')}`,
			},
		});

		if (!res.ok) throw new Error('Failed to load audit logs');

		const data = await res.json();

		if (data.logs.length === 0) {
			container.innerHTML =
				'<div style="text-align:center;padding:20px;color:var(--text-muted)">Không có log nào</div>';
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

		// Render pagination
		renderPagination('audit-pagination', page, data.totalPages, loadAuditLogs);
	} catch (error) {
		container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--danger)">${error.message}</div>`;
	}
}

// Render pagination controls
function renderPagination(containerId, currentPage, totalPages, loadFn) {
	const container = document.getElementById(containerId);

	if (totalPages <= 1) {
		container.innerHTML = '';
		return;
	}

	container.innerHTML = `
		<button onclick="${loadFn.name}(${currentPage - 1})" ${
		currentPage === 0 ? 'disabled' : ''
	}>← Trước</button>
		<span class="page-info">Trang ${currentPage + 1}/${totalPages}</span>
		<button onclick="${loadFn.name}(${currentPage + 1})" ${
		currentPage >= totalPages - 1 ? 'disabled' : ''
	}>Sau →</button>
	`;
}
