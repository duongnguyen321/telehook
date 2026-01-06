/**
 * Broadcast & Chat Management JavaScript
 */

// Socket.io connection
let socket = null;
let selectedChatUser = null;

// Initialize broadcast module
function initBroadcast() {
	// Connect to socket.io
	if (typeof io !== 'undefined') {
		socket = io();
		socket.on('connect', () => {
			console.log('[Socket] Connected');
			socket.emit('join_admin');
		});

		socket.on('new_user_message', (data) => {
			console.log('[Socket] New user message:', data);
			updateChatBadge();
			if (selectedChatUser === data.telegramId) {
				appendChatMessage(data);
			}
			// Refresh user list
			loadChatUsers();
		});

		socket.on('chat_replied', (data) => {
			console.log('[Socket] Chat replied:', data);
			if (selectedChatUser === data.telegramId) {
				loadChatConversation(data.telegramId);
			}
		});
	}
}

// ==================== VARIABLES ====================

async function loadVariables() {
	const container = document.getElementById('variables-list');
	if (!container) return;

	try {
		const res = await fetch('/api/broadcast/variables', {
			headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
		});
		const data = await res.json();

		if (data.variables && data.variables.length > 0) {
			container.innerHTML = data.variables
				.map(
					(v) => `
				<div class="variable-item">
					<div class="variable-info">
						<code class="variable-key">{{${v.key}}}</code>
						<span class="variable-value">${v.value}</span>
						${v.description ? `<small class="variable-desc">${v.description}</small>` : ''}
					</div>
					<div class="variable-actions">
						<button onclick="editVariable('${v.id}', '${v.key}', '${escapeHtml(
						v.value
					)}', '${escapeHtml(
						v.description || ''
					)}')" class="btn-icon">✏️</button>
						<button onclick="deleteVariable('${
							v.id
						}')" class="btn-icon btn-danger">🗑️</button>
					</div>
				</div>
			`
				)
				.join('');
		} else {
			container.innerHTML = '<p class="empty-state">Chưa có variable nào</p>';
		}
	} catch (error) {
		console.error('[Broadcast] Load variables error:', error);
		container.innerHTML = '<p class="error">Lỗi tải dữ liệu</p>';
	}
}

function openVariableModal(id = null) {
	document.getElementById('variable-modal').classList.remove('hidden');
	document.getElementById('variable-modal-title').textContent = id
		? '📝 Sửa Variable'
		: '📝 Thêm Variable';
	document.getElementById('variable-edit-id').value = id || '';
	if (!id) {
		document.getElementById('variable-key').value = '';
		document.getElementById('variable-value').value = '';
		document.getElementById('variable-description').value = '';
	}
}

function closeVariableModal() {
	document.getElementById('variable-modal').classList.add('hidden');
}

function editVariable(id, key, value, description) {
	openVariableModal(id);
	document.getElementById('variable-key').value = key;
	document.getElementById('variable-value').value = value;
	document.getElementById('variable-description').value = description;
}

async function saveVariable() {
	const id = document.getElementById('variable-edit-id').value;
	const key = document.getElementById('variable-key').value.trim();
	const value = document.getElementById('variable-value').value.trim();
	const description = document
		.getElementById('variable-description')
		.value.trim();

	if (!key || !value) {
		showNotify('error', 'Lỗi', 'Key và Value là bắt buộc');
		return;
	}

	try {
		const url = id
			? `/api/broadcast/variables/${id}`
			: '/api/broadcast/variables';
		const method = id ? 'PUT' : 'POST';

		const res = await fetch(url, {
			method,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${localStorage.getItem('token')}`,
			},
			body: JSON.stringify({ key, value, description }),
		});

		const data = await res.json();
		if (res.ok) {
			closeVariableModal();
			loadVariables();
			showNotify(
				'success',
				'Thành công',
				id ? 'Đã cập nhật variable' : 'Đã thêm variable'
			);
		} else {
			showNotify('error', 'Lỗi', data.error || 'Không thể lưu');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function deleteVariable(id) {
	if (!confirm('Xóa variable này?')) return;

	try {
		const res = await fetch(`/api/broadcast/variables/${id}`, {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
		});

		if (res.ok) {
			loadVariables();
			showNotify('success', 'Thành công', 'Đã xóa variable');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

// ==================== TEMPLATES ====================

async function loadTemplates() {
	const container = document.getElementById('templates-list');
	if (!container) return;

	try {
		const res = await fetch('/api/broadcast/templates', {
			headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
		});
		const data = await res.json();

		if (data.templates && data.templates.length > 0) {
			container.innerHTML = data.templates
				.map(
					(t) => `
				<div class="template-item">
					<div class="template-info">
						<strong>${escapeHtml(t.name)}</strong>
						<p>${escapeHtml(t.title)}</p>
						<small>${t.mediaType ? `📎 ${t.mediaType}` : ''} ${
						t.buttons
							? `🔘 ${JSON.parse(t.buttons || '[]').length} buttons`
							: ''
					}</small>
					</div>
					<div class="template-actions">
						<button onclick="openPublishModal('${t.id}', '${escapeHtml(
						t.name
					)}')" class="btn-primary">📢 Đăng</button>
						<button onclick="editTemplate('${t.id}')" class="btn-icon">✏️</button>
						<button onclick="deleteTemplate('${
							t.id
						}')" class="btn-icon btn-danger">🗑️</button>
					</div>
				</div>
			`
				)
				.join('');
		} else {
			container.innerHTML = '<p class="empty-state">Chưa có template nào</p>';
		}
	} catch (error) {
		console.error('[Broadcast] Load templates error:', error);
		container.innerHTML = '<p class="error">Lỗi tải dữ liệu</p>';
	}
}

function openTemplateModal(id = null) {
	document.getElementById('template-modal').classList.remove('hidden');
	document.getElementById('template-modal-title').textContent = id
		? '📋 Sửa Template'
		: '📋 Tạo Template';
	document.getElementById('template-edit-id').value = id || '';
	if (!id) {
		document.getElementById('template-name').value = '';
		document.getElementById('template-title').value = '';
		document.getElementById('template-content').value = '';
		document.getElementById('template-media-url').value = '';
		document.getElementById('template-media-type').value = '';
		document.getElementById('template-buttons').value = '';
		document.getElementById('template-media-preview').innerHTML = '';
	}
}

function closeTemplateModal() {
	document.getElementById('template-modal').classList.add('hidden');
}

async function editTemplate(id) {
	try {
		const res = await fetch(`/api/broadcast/templates/${id}`, {
			headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
		});
		const data = await res.json();

		if (data.template) {
			openTemplateModal(id);
			const t = data.template;
			document.getElementById('template-name').value = t.name || '';
			document.getElementById('template-title').value = t.title || '';
			document.getElementById('template-content').value = t.content || '';
			document.getElementById('template-media-url').value = t.mediaUrl || '';
			document.getElementById('template-media-type').value = t.mediaType || '';
			document.getElementById('template-buttons').value = t.buttons
				? JSON.stringify(t.buttons, null, 2)
				: '';

			// Show media preview
			const preview = document.getElementById('template-media-preview');
			if (t.mediaUrl && t.mediaType) {
				if (t.mediaType === 'image') {
					preview.innerHTML = `<img src="${t.mediaUrl}" alt="Preview" style="max-width: 200px;" />`;
				} else {
					preview.innerHTML = `<video src="${t.mediaUrl}" style="max-width: 200px;" controls></video>`;
				}
			}
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function saveTemplate() {
	const id = document.getElementById('template-edit-id').value;
	const name = document.getElementById('template-name').value.trim();
	const title = document.getElementById('template-title').value.trim();
	const content = document.getElementById('template-content').value.trim();
	const mediaUrl = document.getElementById('template-media-url').value.trim();
	const mediaType = document.getElementById('template-media-type').value.trim();
	let buttons = null;

	try {
		const buttonsStr = document.getElementById('template-buttons').value.trim();
		if (buttonsStr) {
			buttons = JSON.parse(buttonsStr);
		}
	} catch (e) {
		showNotify('error', 'Lỗi', 'JSON buttons không hợp lệ');
		return;
	}

	if (!name || !title || !content) {
		showNotify('error', 'Lỗi', 'Tên, tiêu đề và nội dung là bắt buộc');
		return;
	}

	try {
		const url = id
			? `/api/broadcast/templates/${id}`
			: '/api/broadcast/templates';
		const method = id ? 'PUT' : 'POST';

		const res = await fetch(url, {
			method,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${localStorage.getItem('token')}`,
			},
			body: JSON.stringify({
				name,
				title,
				content,
				mediaUrl,
				mediaType,
				buttons,
			}),
		});

		const data = await res.json();
		if (res.ok) {
			closeTemplateModal();
			loadTemplates();
			showNotify(
				'success',
				'Thành công',
				id ? 'Đã cập nhật template' : 'Đã tạo template'
			);
		} else {
			showNotify('error', 'Lỗi', data.error || 'Không thể lưu');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function deleteTemplate(id) {
	if (!confirm('Xóa template này? Tất cả tin nhắn đã gửi cũng sẽ bị xóa.'))
		return;

	try {
		const res = await fetch(`/api/broadcast/templates/${id}`, {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
		});

		if (res.ok) {
			loadTemplates();
			loadBroadcastMessages();
			showNotify('success', 'Thành công', 'Đã xóa template');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function handleMediaUpload() {
	const file = document.getElementById('template-media').files[0];
	if (!file) return;

	const formData = new FormData();
	formData.append('file', file);

	try {
		const res = await fetch('/api/broadcast/upload', {
			method: 'POST',
			headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
			body: formData,
		});

		const data = await res.json();
		if (res.ok && data.media) {
			document.getElementById('template-media-url').value = data.media.url;
			document.getElementById('template-media-type').value = data.media.type;

			const preview = document.getElementById('template-media-preview');
			if (data.media.type === 'image') {
				preview.innerHTML = `<img src="${data.media.url}" alt="Preview" style="max-width: 200px;" />`;
			} else {
				preview.innerHTML = `<video src="${data.media.url}" style="max-width: 200px;" controls></video>`;
			}
			showNotify('success', 'Upload thành công', 'File đã được upload');
		} else {
			showNotify('error', 'Lỗi upload', data.error || 'Upload thất bại');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function previewTemplate() {
	const id = document.getElementById('template-edit-id').value;
	if (!id) {
		showNotify('info', 'Thông báo', 'Lưu template trước khi xem preview');
		return;
	}

	try {
		const res = await fetch(`/api/broadcast/templates/${id}/preview`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${localStorage.getItem('token')}`,
			},
		});

		const data = await res.json();
		if (data.preview) {
			const preview = data.preview;
			const content = `*${preview.title}*\n\n${preview.content}`;
			showNotify('info', 'Preview', content.replace(/\n/g, '<br>'));
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

// ==================== MESSAGES ====================

async function loadBroadcastMessages() {
	const container = document.getElementById('messages-list');
	if (!container) return;

	try {
		const res = await fetch('/api/broadcast/messages', {
			headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
		});
		const data = await res.json();

		if (data.messages && data.messages.length > 0) {
			container.innerHTML = data.messages
				.map(
					(m) => `
				<div class="message-item">
					<div class="message-info">
						<strong>${m.template?.name || 'Unknown'}</strong>
						<span class="badge ${m.targetRole}">${getRoleLabel(m.targetRole)}</span>
						<small>${formatDate(m.sentAt)}</small>
						<span class="status-${m.status}">${m.status}</span>
					</div>
					<div class="message-actions">
						<button onclick="editBroadcastMessage('${
							m.id
						}')" class="btn-icon" title="Sửa tin đã gửi">✏️</button>
					</div>
				</div>
			`
				)
				.join('');
		} else {
			container.innerHTML =
				'<p class="empty-state">Chưa có tin nhắn nào được gửi</p>';
		}
	} catch (error) {
		console.error('[Broadcast] Load messages error:', error);
		container.innerHTML = '<p class="error">Lỗi tải dữ liệu</p>';
	}
}

function openPublishModal(templateId, templateName) {
	document.getElementById('publish-modal').classList.remove('hidden');
	document.getElementById('publish-template-id').value = templateId;
	document.getElementById(
		'publish-template-name'
	).textContent = `Template: ${templateName}`;
}

function closePublishModal() {
	document.getElementById('publish-modal').classList.add('hidden');
}

async function publishBroadcast() {
	const templateId = document.getElementById('publish-template-id').value;
	const targetRole = document.getElementById('publish-target').value;

	if (!templateId) {
		showNotify('error', 'Lỗi', 'Không tìm thấy template');
		return;
	}

	try {
		const res = await fetch('/api/broadcast/publish', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${localStorage.getItem('token')}`,
			},
			body: JSON.stringify({ templateId, targetRole }),
		});

		const data = await res.json();
		if (res.ok) {
			closePublishModal();
			loadBroadcastMessages();
			showNotify(
				'success',
				'Đã gửi thành công!',
				`Đã gửi ${data.stats.success}/${data.stats.total} tin nhắn`
			);
		} else {
			showNotify('error', 'Lỗi', data.error || 'Không thể gửi');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function editBroadcastMessage(id) {
	const newContent = prompt('Nhập nội dung mới (để trống nếu giữ nguyên):');
	if (newContent === null) return;

	try {
		const res = await fetch(`/api/broadcast/messages/${id}/edit`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${localStorage.getItem('token')}`,
			},
			body: JSON.stringify({ content: newContent || undefined }),
		});

		const data = await res.json();
		if (res.ok) {
			loadBroadcastMessages();
			showNotify(
				'success',
				'Thành công',
				`Đã sửa ${data.stats.success}/${data.stats.total} tin nhắn`
			);
		} else {
			showNotify('error', 'Lỗi', data.error || 'Không thể sửa');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

// ==================== CHAT ====================

async function loadChatUsers() {
	const container = document.getElementById('chat-users-list');
	if (!container) return;

	try {
		const res = await fetch('/api/chat/users', {
			headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
		});
		const data = await res.json();

		if (data.users && data.users.length > 0) {
			container.innerHTML = data.users
				.map(
					(u) => `
				<div class="chat-user-item ${
					selectedChatUser === u.telegramId ? 'active' : ''
				}" onclick="selectChatUser('${u.telegramId}', '${escapeHtml(
						u.firstName
					)}')">
					<div class="user-avatar">${u.firstName.charAt(0).toUpperCase()}</div>
					<div class="user-info">
						<strong>${escapeHtml(u.firstName)}</strong>
						${u.username ? `<small>@${u.username}</small>` : ''}
					</div>
					${u.unreadCount > 0 ? `<span class="unread-badge">${u.unreadCount}</span>` : ''}
				</div>
			`
				)
				.join('');

			// Update total unread badge
			const totalUnread = data.users.reduce(
				(sum, u) => sum + (u.unreadCount || 0),
				0
			);
			updateChatBadgeCount(totalUnread);
		} else {
			container.innerHTML = '<p class="empty-state">Chưa có tin nhắn nào</p>';
		}
	} catch (error) {
		console.error('[Chat] Load users error:', error);
	}
}

async function selectChatUser(telegramId, name) {
	selectedChatUser = telegramId;
	document.getElementById('chat-user-name').textContent = name;
	document.getElementById('chat-input-area').classList.remove('hidden');

	// Update active state in user list
	document
		.querySelectorAll('.chat-user-item')
		.forEach((el) => el.classList.remove('active'));
	event.currentTarget.classList.add('active');

	await loadChatConversation(telegramId);
}

async function loadChatConversation(telegramId) {
	const container = document.getElementById('chat-messages');
	if (!container) return;

	try {
		const res = await fetch(`/api/chat/messages/${telegramId}`, {
			headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
		});
		const data = await res.json();

		if (data.messages && data.messages.length > 0) {
			// Reverse to show oldest first
			const messages = data.messages.reverse();
			container.innerHTML = messages
				.map(
					(m) => `
				<div class="chat-message ${m.replyText ? 'has-reply' : ''}">
					<div class="message-bubble user-message">
						${m.messageText || ''}
						${m.mediaUrl ? `<img src="${m.mediaUrl}" alt="Media" />` : ''}
						<span class="message-time">${formatTime(m.createdAt)}</span>
					</div>
					${
						m.replyText
							? `
					<div class="message-bubble admin-reply">
						${m.replyText}
						<span class="message-time">↩️ Đã trả lời</span>
					</div>
					`
							: ''
					}
				</div>
			`
				)
				.join('');

			// Scroll to bottom
			container.scrollTop = container.scrollHeight;
		} else {
			container.innerHTML = '<p class="empty-state">Chưa có tin nhắn</p>';
		}

		// Refresh user list to update unread counts
		loadChatUsers();
	} catch (error) {
		console.error('[Chat] Load conversation error:', error);
	}
}

function appendChatMessage(data) {
	const container = document.getElementById('chat-messages');
	if (!container) return;

	const html = `
		<div class="chat-message">
			<div class="message-bubble user-message">
				${data.messageText || ''}
				<span class="message-time">${formatTime(data.createdAt)}</span>
			</div>
		</div>
	`;
	container.insertAdjacentHTML('beforeend', html);
	container.scrollTop = container.scrollHeight;
}

async function sendChatReply() {
	if (!selectedChatUser) {
		showNotify('error', 'Lỗi', 'Chọn user trước');
		return;
	}

	const input = document.getElementById('chat-reply-input');
	const replyText = input.value.trim();
	if (!replyText) {
		showNotify('error', 'Lỗi', 'Nhập tin nhắn');
		return;
	}

	// Get the last message ID for this user
	try {
		const res = await fetch(`/api/chat/messages/${selectedChatUser}?limit=1`, {
			headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
		});
		const data = await res.json();

		if (!data.messages || data.messages.length === 0) {
			showNotify('error', 'Lỗi', 'Không tìm thấy tin nhắn để trả lời');
			return;
		}

		const lastMessageId = data.messages[0].id;

		const replyRes = await fetch(`/api/chat/reply/${lastMessageId}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${localStorage.getItem('token')}`,
			},
			body: JSON.stringify({ replyText }),
		});

		const replyData = await replyRes.json();
		if (replyRes.ok) {
			input.value = '';
			loadChatConversation(selectedChatUser);
			showNotify('success', 'Đã gửi', 'Tin nhắn đã được gửi');
		} else {
			showNotify('error', 'Lỗi', replyData.error || 'Không thể gửi');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

function updateChatBadge() {
	loadChatUsers(); // This will update the badge count
}

function updateChatBadgeCount(count) {
	const badge = document.getElementById('chat-badge');
	if (badge) {
		if (count > 0) {
			badge.textContent = count > 99 ? '99+' : count;
			badge.classList.remove('hidden');
		} else {
			badge.classList.add('hidden');
		}
	}
}

// ==================== HELPERS ====================

function escapeHtml(text) {
	if (!text) return '';
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

function getRoleLabel(role) {
	const labels = {
		all: '🌍 Tất cả',
		user: '👤 User',
		mod: '📤 Mod',
		reviewer: '📝 Reviewer',
	};
	return labels[role] || role;
}

function formatDate(dateStr) {
	const date = new Date(dateStr);
	return date.toLocaleDateString('vi-VN', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function formatTime(dateStr) {
	const date = new Date(dateStr);
	return date.toLocaleTimeString('vi-VN', {
		hour: '2-digit',
		minute: '2-digit',
	});
}

// ==================== BLOCK/UNBLOCK/DELETE ====================

async function blockUser(telegramId) {
	if (
		!confirm(
			'Chặn user này? Tất cả tin nhắn sẽ bị xóa và user không thể tương tác với bot nữa.'
		)
	)
		return;

	try {
		const res = await fetch(`/api/chat/block/${telegramId}`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
		});

		const data = await res.json();
		if (res.ok) {
			showNotify(
				'success',
				'Đã chặn',
				`Đã chặn user và xóa ${data.deletedMessages} tin nhắn`
			);
			selectedChatUser = null;
			loadChatUsers();
			document.getElementById('chat-messages').innerHTML =
				'<p class="empty-state">User đã bị chặn</p>';
			document.getElementById('chat-input-area').classList.add('hidden');
			updateChatHeaderBlock(true);
		} else {
			showNotify('error', 'Lỗi', data.error || 'Không thể chặn');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function unblockUser(telegramId) {
	if (!confirm('Bỏ chặn user này?')) return;

	try {
		const res = await fetch(`/api/chat/unblock/${telegramId}`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
		});

		const data = await res.json();
		if (res.ok) {
			showNotify(
				'success',
				'Đã bỏ chặn',
				'User có thể tương tác với bot trở lại'
			);
			updateChatHeaderBlock(false);
		} else {
			showNotify('error', 'Lỗi', data.error || 'Không thể bỏ chặn');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function deleteUserMessages(telegramId) {
	if (!confirm('Xóa tất cả tin nhắn từ user này?')) return;

	try {
		const res = await fetch(`/api/chat/messages/${telegramId}`, {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
		});

		const data = await res.json();
		if (res.ok) {
			showNotify('success', 'Đã xóa', `Đã xóa ${data.count} tin nhắn`);
			loadChatUsers();
			document.getElementById('chat-messages').innerHTML =
				'<p class="empty-state">Đã xóa tất cả tin nhắn</p>';
		} else {
			showNotify('error', 'Lỗi', data.error || 'Không thể xóa');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function checkAndUpdateBlockStatus(telegramId) {
	try {
		const res = await fetch(`/api/chat/block-status/${telegramId}`, {
			headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
		});
		const data = await res.json();
		updateChatHeaderBlock(data.isBlocked, telegramId);
	} catch (error) {
		console.error('[Chat] Check block status error:', error);
	}
}

function updateChatHeaderBlock(isBlocked, telegramId = selectedChatUser) {
	const header = document.getElementById('chat-header');
	const userName = document.getElementById('chat-user-name').textContent;

	header.innerHTML = `
		<span id="chat-user-name">${userName}</span>
		<div class="chat-header-actions">
			${
				isBlocked
					? `<button onclick="unblockUser('${telegramId}')" class="btn-secondary btn-small">🔓 Bỏ chặn</button>`
					: `<button onclick="blockUser('${telegramId}')" class="btn-danger btn-small">🚫 Chặn</button>`
			}
			<button onclick="deleteUserMessages('${telegramId}')" class="btn-danger btn-small">🗑️ Xóa hết</button>
		</div>
	`;
}

// Override selectChatUser to check block status
const originalSelectChatUser = selectChatUser;
selectChatUser = async function (telegramId, name) {
	selectedChatUser = telegramId;
	document.getElementById('chat-user-name').textContent = name;
	document.getElementById('chat-input-area').classList.remove('hidden');

	// Update active state in user list
	document
		.querySelectorAll('.chat-user-item')
		.forEach((el) => el.classList.remove('active'));
	if (event?.currentTarget) event.currentTarget.classList.add('active');

	await loadChatConversation(telegramId);
	await checkAndUpdateBlockStatus(telegramId);
};

// Initialize when document is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initBroadcast);
} else {
	initBroadcast();
}
