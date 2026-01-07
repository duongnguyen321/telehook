/**
 * Broadcast & Chat & Channel Management JavaScript
 * Uses centralized API client from api.js
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
		const { ok, data } = await API.get('/api/broadcast/variables');
		if (ok && data.variables?.length > 0) {
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
		const { ok, data, error } = id
			? await API.put(url, { key, value, description })
			: await API.post(url, { key, value, description });

		if (ok) {
			closeVariableModal();
			loadVariables();
			showNotify(
				'success',
				'Thành công',
				id ? 'Đã cập nhật variable' : 'Đã thêm variable'
			);
		} else {
			showNotify('error', 'Lỗi', error || 'Không thể lưu');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function deleteVariable(id) {
	const confirmed = await UI.confirm('Xóa variable này?');
	if (!confirmed) return;

	try {
		const { ok } = await API.delete(`/api/broadcast/variables/${id}`);
		if (ok) {
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
		const { ok, data } = await API.get('/api/broadcast/templates');
		if (ok && data.templates?.length > 0) {
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
		const { ok, data } = await API.get(`/api/broadcast/templates/${id}`);
		if (ok && data.template) {
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
		if (buttonsStr) buttons = JSON.parse(buttonsStr);
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
		const body = { name, title, content, mediaUrl, mediaType, buttons };
		const { ok, error } = id
			? await API.put(url, body)
			: await API.post(url, body);

		if (ok) {
			closeTemplateModal();
			loadTemplates();
			showNotify(
				'success',
				'Thành công',
				id ? 'Đã cập nhật template' : 'Đã tạo template'
			);
		} else {
			showNotify('error', 'Lỗi', error || 'Không thể lưu');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function deleteTemplate(id) {
	const confirmed = await UI.confirm(
		'Xóa template này? Tất cả tin nhắn đã gửi cũng sẽ bị xóa.'
	);
	if (!confirmed) return;

	try {
		const { ok } = await API.delete(`/api/broadcast/templates/${id}`);
		if (ok) {
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
		const { ok, data, error } = await API.upload(
			'/api/broadcast/upload',
			formData
		);
		if (ok && data.media) {
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
			showNotify('error', 'Lỗi upload', error || 'Upload thất bại');
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
		const { ok, data } = await API.post(
			`/api/broadcast/templates/${id}/preview`,
			{}
		);
		if (ok && data.preview) {
			const content = `*${data.preview.title}*\n\n${data.preview.content}`;
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
		const { ok, data } = await API.get('/api/broadcast/messages');
		if (ok && data.messages?.length > 0) {
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

async function openPublishModal(templateId, templateName) {
	document.getElementById('publish-modal').classList.remove('hidden');
	document.getElementById('publish-template-id').value = templateId;
	document.getElementById(
		'publish-template-name'
	).textContent = `Template: ${templateName}`;
	document.getElementById('publish-target').value = 'all';

	// Load channels for selection
	const channelsList = document.getElementById('publish-channels-list');
	channelsList.innerHTML = '<p class="empty-state">Đang tải...</p>';

	try {
		const { ok, data } = await API.get('/api/channels');
		if (ok && data.channels?.length > 0) {
			channelsList.innerHTML = data.channels
				.filter((c) => c.isActive)
				.map(
					(c) => `
				<label class="channel-checkbox">
					<input type="checkbox" name="publish-channel" value="${c.id}" />
					<span>${getChannelTypeIcon(c.type)} ${escapeHtml(c.title)}</span>
				</label>
			`
				)
				.join('');
		} else {
			channelsList.innerHTML =
				'<p class="empty-state">Chưa có channel nào. Thêm channel trong tab Channels.</p>';
		}
	} catch (error) {
		channelsList.innerHTML = '<p class="error">Lỗi tải channels</p>';
	}
}

function closePublishModal() {
	document.getElementById('publish-modal').classList.add('hidden');
}

async function publishBroadcast() {
	const templateId = document.getElementById('publish-template-id').value;
	const targetRole = document.getElementById('publish-target').value;

	// Get selected channels
	const selectedChannels = Array.from(
		document.querySelectorAll('input[name="publish-channel"]:checked')
	).map((el) => el.value);

	if (!templateId) {
		showNotify('error', 'Lỗi', 'Không tìm thấy template');
		return;
	}

	// Must select at least one target (users or channels)
	if (!targetRole && selectedChannels.length === 0) {
		showNotify(
			'error',
			'Lỗi',
			'Chọn ít nhất một đối tượng nhận tin (Users hoặc Channels)'
		);
		return;
	}

	try {
		const { ok, data, error } = await API.post('/api/broadcast/publish', {
			templateId,
			targetRole: targetRole || null,
			channelIds: selectedChannels,
		});
		if (ok) {
			closePublishModal();
			loadBroadcastMessages();

			let message = '';
			if (data.stats?.success > 0) {
				message += `Users: ${data.stats.success}/${data.stats.total} tin nhắn. `;
			}
			if (data.channelStats?.success > 0) {
				message += `Channels: ${data.channelStats.success}/${data.channelStats.total}`;
			}
			showNotify(
				'success',
				'Đã gửi thành công!',
				message || 'Tin nhắn đã được gửi'
			);
		} else {
			showNotify('error', 'Lỗi', error || 'Không thể gửi');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function editBroadcastMessage(id) {
	const newContent = await UI.prompt('Nhập nội dung mới:', {
		title: 'Sửa tin nhắn',
		placeholder: 'Để trống nếu giữ nguyên',
	});
	if (newContent === null) return;

	try {
		const { ok, data, error } = await API.put(
			`/api/broadcast/messages/${id}/edit`,
			{ content: newContent || undefined }
		);
		if (ok) {
			loadBroadcastMessages();
			showNotify(
				'success',
				'Thành công',
				`Đã sửa ${data.stats.success}/${data.stats.total} tin nhắn`
			);
		} else {
			showNotify('error', 'Lỗi', error || 'Không thể sửa');
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
		const { ok, data } = await API.get('/api/chat/users');
		if (ok && data.users?.length > 0) {
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

	document
		.querySelectorAll('.chat-user-item')
		.forEach((el) => el.classList.remove('active'));
	if (event?.currentTarget) event.currentTarget.classList.add('active');

	await loadChatConversation(telegramId);
	await checkAndUpdateBlockStatus(telegramId);
}

async function loadChatConversation(telegramId) {
	const container = document.getElementById('chat-messages');
	if (!container) return;

	try {
		const { ok, data } = await API.get(`/api/chat/messages/${telegramId}`);
		if (ok && data.messages?.length > 0) {
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

			container.scrollTop = container.scrollHeight;
		} else {
			container.innerHTML = '<p class="empty-state">Chưa có tin nhắn</p>';
		}

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

	try {
		const { ok, data } = await API.get(
			`/api/chat/messages/${selectedChatUser}?limit=1`
		);
		if (!ok || !data.messages?.length) {
			showNotify('error', 'Lỗi', 'Không tìm thấy tin nhắn để trả lời');
			return;
		}

		const lastMessageId = data.messages[0].id;
		const { ok: replyOk, error } = await API.post(
			`/api/chat/reply/${lastMessageId}`,
			{ replyText }
		);

		if (replyOk) {
			input.value = '';
			loadChatConversation(selectedChatUser);
			showNotify('success', 'Đã gửi', 'Tin nhắn đã được gửi');
		} else {
			showNotify('error', 'Lỗi', error || 'Không thể gửi');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

function updateChatBadge() {
	loadChatUsers();
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

// ==================== BLOCK/UNBLOCK/DELETE ====================

async function blockUser(telegramId) {
	const confirmed = await UI.confirm(
		'Chặn user này? Tất cả tin nhắn sẽ bị xóa và user không thể tương tác với bot nữa.'
	);
	if (!confirmed) return;

	try {
		const { ok, data, error } = await API.post(
			`/api/chat/block/${telegramId}`,
			{}
		);
		if (ok) {
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
			showNotify('error', 'Lỗi', error || 'Không thể chặn');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function unblockUser(telegramId) {
	const confirmed = await UI.confirm('Bỏ chặn user này?');
	if (!confirmed) return;

	try {
		const { ok, error } = await API.post(`/api/chat/unblock/${telegramId}`, {});
		if (ok) {
			showNotify(
				'success',
				'Đã bỏ chặn',
				'User có thể tương tác với bot trở lại'
			);
			updateChatHeaderBlock(false);
		} else {
			showNotify('error', 'Lỗi', error || 'Không thể bỏ chặn');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function deleteUserMessages(telegramId) {
	const confirmed = await UI.confirm('Xóa tất cả tin nhắn từ user này?');
	if (!confirmed) return;

	try {
		const { ok, data, error } = await API.delete(
			`/api/chat/messages/${telegramId}`
		);
		if (ok) {
			showNotify('success', 'Đã xóa', `Đã xóa ${data.count} tin nhắn`);
			loadChatUsers();
			document.getElementById('chat-messages').innerHTML =
				'<p class="empty-state">Đã xóa tất cả tin nhắn</p>';
		} else {
			showNotify('error', 'Lỗi', error || 'Không thể xóa');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function checkAndUpdateBlockStatus(telegramId) {
	try {
		const { ok, data } = await API.get(`/api/chat/block-status/${telegramId}`);
		if (ok) updateChatHeaderBlock(data.isBlocked, telegramId);
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

// ==================== CHANNEL MANAGEMENT ====================

async function loadChannels() {
	const container = document.getElementById('channels-list');
	if (!container) return;

	container.innerHTML = '<p class="empty-state">Đang tải...</p>';

	try {
		const { ok, data } = await API.get('/api/channels');
		if (ok && data.channels?.length > 0) {
			container.innerHTML = data.channels
				.map(
					(c) => `
				<div class="channel-card ${c.isActive ? '' : 'inactive'}">
					<div class="channel-info">
						<div class="channel-header">
							<span class="channel-type ${c.type}">${getChannelTypeIcon(c.type)}</span>
							<strong>${escapeHtml(c.title)}</strong>
							${c.username ? `<small>@${c.username}</small>` : ''}
						</div>
						<div class="channel-meta">
							<span>👥 ${c.memberCount || '?'} members</span>
							<span>ID: ${c.chatId}</span>
						</div>
					</div>
					<div class="channel-actions">
						<button onclick="openSendChannelModal('${c.id}', '${escapeHtml(
						c.title
					)}')" class="btn-primary btn-small">📤 Gửi</button>
						<button onclick="openChannelBanModal('${
							c.id
						}')" class="btn-icon" title="Chặn user">🚫</button>
						<button onclick="refreshChannel('${
							c.id
						}')" class="btn-icon" title="Refresh">🔄</button>
						<button onclick="toggleChannel('${c.id}')" class="btn-icon" title="${
						c.isActive ? 'Tắt' : 'Bật'
					}">${c.isActive ? '✅' : '❌'}</button>
						<button onclick="deleteChannel('${
							c.id
						}')" class="btn-icon btn-danger" title="Xóa">🗑️</button>
					</div>
				</div>
			`
				)
				.join('');
		} else {
			container.innerHTML =
				'<p class="empty-state">Chưa có channel nào. Bấm "Thêm Channel" để bắt đầu.</p>';
		}
	} catch (error) {
		console.error('[Channels] Load error:', error);
		container.innerHTML = '<p class="error">Lỗi tải dữ liệu</p>';
	}
}

function getChannelTypeIcon(type) {
	const icons = { channel: '📢', group: '👥', supergroup: '🏛️' };
	return icons[type] || '💬';
}

function openAddChannelModal() {
	document.getElementById('add-channel-modal').classList.remove('hidden');
	document.getElementById('add-channel-input').value = '';
}

function closeAddChannelModal() {
	document.getElementById('add-channel-modal').classList.add('hidden');
}

async function addChannel() {
	const input = document.getElementById('add-channel-input').value.trim();
	if (!input) {
		showNotify('error', 'Lỗi', 'Nhập Chat ID hoặc @username');
		return;
	}

	const isNumber = /^-?\d+$/.test(input);
	const body = isNumber ? { chatId: input } : { username: input };

	try {
		const { ok, data, error } = await API.post('/api/channels', body);
		if (ok) {
			closeAddChannelModal();
			loadChannels();
			showNotify('success', 'Thành công', `Đã thêm: ${data.channel.title}`);
		} else {
			showNotify('error', 'Lỗi', error || 'Không thể thêm');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function refreshChannel(id) {
	try {
		const { ok } = await API.get(`/api/channels/${id}/refresh`);
		if (ok) {
			loadChannels();
			showNotify('success', 'Thành công', 'Đã cập nhật thông tin');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function toggleChannel(id) {
	try {
		const { ok } = await API.put(`/api/channels/${id}/toggle`, {});
		if (ok) loadChannels();
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function deleteChannel(id) {
	const confirmed = await UI.confirm('Xóa channel này khỏi danh sách quản lý?');
	if (!confirmed) return;

	try {
		const { ok } = await API.delete(`/api/channels/${id}`);
		if (ok) {
			loadChannels();
			showNotify('success', 'Thành công', 'Đã xóa channel');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

// Send to channel
function openSendChannelModal(id, title) {
	document.getElementById('send-channel-modal').classList.remove('hidden');
	document.getElementById('send-channel-id').value = id;
	document.getElementById(
		'send-channel-title'
	).textContent = `📤 Gửi tới: ${title}`;
	document.getElementById('send-channel-text').value = '';
	document.getElementById('send-channel-media-type').value = '';
	document.getElementById('send-channel-media-url').value = '';
	document.getElementById('send-channel-buttons').value = '';
	document.getElementById('send-channel-media-preview').innerHTML = '';
}

function closeSendChannelModal() {
	document.getElementById('send-channel-modal').classList.add('hidden');
}

async function handleChannelMediaUpload() {
	const file = document.getElementById('send-channel-file').files[0];
	if (!file) return;

	const formData = new FormData();
	formData.append('file', file);

	try {
		const { ok, data, error } = await API.upload(
			'/api/broadcast/upload',
			formData
		);
		if (ok && data.media) {
			document.getElementById('send-channel-media-url').value = data.media.url;
			if (!document.getElementById('send-channel-media-type').value) {
				document.getElementById('send-channel-media-type').value =
					data.media.type;
			}

			const preview = document.getElementById('send-channel-media-preview');
			if (data.media.type === 'photo' || data.media.type === 'image') {
				preview.innerHTML = `<img src="${data.media.url}" alt="Preview" />`;
			} else if (data.media.type === 'video') {
				preview.innerHTML = `<video src="${data.media.url}" controls></video>`;
			} else {
				preview.innerHTML = `<p>📎 ${file.name}</p>`;
			}
			showNotify('success', 'Upload thành công', 'File đã được upload');
		} else {
			showNotify('error', 'Lỗi upload', error || 'Upload thất bại');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function sendToChannel() {
	const id = document.getElementById('send-channel-id').value;
	const text = document.getElementById('send-channel-text').value.trim();
	const mediaType = document.getElementById('send-channel-media-type').value;
	const mediaUrl = document.getElementById('send-channel-media-url').value;
	let buttons = null;

	try {
		const buttonsStr = document
			.getElementById('send-channel-buttons')
			.value.trim();
		if (buttonsStr) buttons = JSON.parse(buttonsStr);
	} catch (e) {
		showNotify('error', 'Lỗi', 'JSON buttons không hợp lệ');
		return;
	}

	if (!text && !mediaUrl) {
		showNotify('error', 'Lỗi', 'Nhập nội dung hoặc chọn media');
		return;
	}

	try {
		const { ok, error } = await API.post(`/api/channels/${id}/send`, {
			text,
			mediaType,
			mediaUrl,
			buttons,
		});
		if (ok) {
			closeSendChannelModal();
			showNotify('success', 'Đã gửi!', 'Tin nhắn đã được gửi thành công');
		} else {
			showNotify('error', 'Lỗi', error || 'Không thể gửi');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

// Ban user from channel
function openChannelBanModal(id) {
	document.getElementById('channel-ban-modal').classList.remove('hidden');
	document.getElementById('ban-channel-id').value = id;
	document.getElementById('ban-user-id').value = '';
	document.getElementById('ban-reason').value = '';
}

function closeChannelBanModal() {
	document.getElementById('channel-ban-modal').classList.add('hidden');
}

async function banChannelUser() {
	const channelId = document.getElementById('ban-channel-id').value;
	const telegramId = document.getElementById('ban-user-id').value.trim();
	const reason = document.getElementById('ban-reason').value.trim();

	if (!telegramId) {
		showNotify('error', 'Lỗi', 'Nhập Telegram ID');
		return;
	}

	try {
		const { ok, error } = await API.post(`/api/channels/${channelId}/ban`, {
			telegramId,
			reason,
		});
		if (ok) {
			closeChannelBanModal();
			showNotify('success', 'Đã chặn', 'User đã bị chặn khỏi channel');
		} else {
			showNotify('error', 'Lỗi', error || 'Không thể chặn');
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function kickChannelUser(channelId, telegramId) {
	const confirmed = await UI.confirm('Kick user này khỏi channel?');
	if (!confirmed) return;

	try {
		const { ok, error } = await API.post(`/api/channels/${channelId}/kick`, {
			telegramId,
		});
		if (ok) {
			showNotify('success', 'Thành công', 'User đã bị kick');
		} else {
			showNotify('error', 'Lỗi', error);
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
	}
}

async function unbanChannelUser(channelId, telegramId) {
	try {
		const { ok, error } = await API.post(`/api/channels/${channelId}/unban`, {
			telegramId,
		});
		if (ok) {
			showNotify('success', 'Thành công', 'User đã được bỏ chặn');
		} else {
			showNotify('error', 'Lỗi', error);
		}
	} catch (error) {
		showNotify('error', 'Lỗi', error.message);
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

// Initialize when document is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initBroadcast);
} else {
	initBroadcast();
}
