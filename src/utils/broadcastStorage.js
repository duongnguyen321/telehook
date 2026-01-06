/**
 * Broadcast Storage - CRUD operations for broadcast system
 */

import { prisma } from './prisma.js';

// ==================== VARIABLES ====================

/**
 * Get all broadcast variables
 * @returns {Promise<Array>}
 */
export async function getVariables() {
	return prisma.broadcastVariable.findMany({
		orderBy: { key: 'asc' },
	});
}

/**
 * Create a new broadcast variable
 * @param {Object} data - { key, value, description }
 * @returns {Promise<Object>}
 */
export async function createVariable(data) {
	return prisma.broadcastVariable.create({
		data: {
			key: data.key,
			value: data.value,
			description: data.description || null,
		},
	});
}

/**
 * Update a broadcast variable
 * @param {string} id
 * @param {Object} data - { key?, value?, description? }
 * @returns {Promise<Object>}
 */
export async function updateVariable(id, data) {
	return prisma.broadcastVariable.update({
		where: { id },
		data,
	});
}

/**
 * Delete a broadcast variable
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function deleteVariable(id) {
	return prisma.broadcastVariable.delete({
		where: { id },
	});
}

/**
 * Replace variables in text using {{variable_key}} syntax
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function replaceVariables(text) {
	if (!text) return text;

	const variables = await getVariables();
	let result = text;

	for (const variable of variables) {
		const pattern = new RegExp(`\\{\\{${variable.key}\\}\\}`, 'g');
		result = result.replace(pattern, variable.value);
	}

	return result;
}

// ==================== TEMPLATES ====================

/**
 * Get all broadcast templates
 * @param {Object} options - { page, limit }
 * @returns {Promise<{ templates: Array, total: number }>}
 */
export async function getTemplates(options = {}) {
	const page = options.page || 1;
	const limit = options.limit || 20;
	const skip = (page - 1) * limit;

	const [templates, total] = await Promise.all([
		prisma.broadcastTemplate.findMany({
			orderBy: { updatedAt: 'desc' },
			skip,
			take: limit,
		}),
		prisma.broadcastTemplate.count(),
	]);

	return { templates, total };
}

/**
 * Get a single template by ID
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getTemplateById(id) {
	return prisma.broadcastTemplate.findUnique({
		where: { id },
	});
}

/**
 * Create a new broadcast template
 * @param {Object} data - { name, title, content, mediaUrl?, mediaType?, buttons? }
 * @returns {Promise<Object>}
 */
export async function createTemplate(data) {
	return prisma.broadcastTemplate.create({
		data: {
			name: data.name,
			title: data.title,
			content: data.content,
			mediaUrl: data.mediaUrl || null,
			mediaType: data.mediaType || null,
			buttons: data.buttons || null,
		},
	});
}

/**
 * Update a broadcast template
 * @param {string} id
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateTemplate(id, data) {
	return prisma.broadcastTemplate.update({
		where: { id },
		data,
	});
}

/**
 * Delete a broadcast template
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function deleteTemplate(id) {
	// First delete all messages using this template
	await prisma.broadcastMessage.deleteMany({
		where: { templateId: id },
	});

	return prisma.broadcastTemplate.delete({
		where: { id },
	});
}

// ==================== MESSAGES ====================

/**
 * Get all broadcast messages with template info
 * @param {Object} options - { page, limit }
 * @returns {Promise<{ messages: Array, total: number }>}
 */
export async function getMessages(options = {}) {
	const page = options.page || 1;
	const limit = options.limit || 20;
	const skip = (page - 1) * limit;

	const [messages, total] = await Promise.all([
		prisma.broadcastMessage.findMany({
			orderBy: { sentAt: 'desc' },
			skip,
			take: limit,
			include: {
				template: true,
			},
		}),
		prisma.broadcastMessage.count(),
	]);

	return { messages, total };
}

/**
 * Create a new broadcast message record
 * @param {Object} data - { templateId, targetRole, sentBy, messageRecords, status }
 * @returns {Promise<Object>}
 */
export async function createMessage(data) {
	return prisma.broadcastMessage.create({
		data: {
			templateId: data.templateId,
			targetRole: data.targetRole,
			sentBy: BigInt(data.sentBy),
			messageRecords: data.messageRecords || [],
			status: data.status || 'sent',
		},
	});
}

/**
 * Update message records (after editing)
 * @param {string} id
 * @param {Object} data - { status?, messageRecords? }
 * @returns {Promise<Object>}
 */
export async function updateMessage(id, data) {
	return prisma.broadcastMessage.update({
		where: { id },
		data,
	});
}

/**
 * Get a single message by ID with template
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getMessageById(id) {
	return prisma.broadcastMessage.findUnique({
		where: { id },
		include: {
			template: true,
		},
	});
}

// ==================== USER CHATS ====================

/**
 * Get all user chats with pagination
 * @param {Object} options - { page, limit, unreadOnly }
 * @returns {Promise<{ chats: Array, total: number, unreadCount: number }>}
 */
export async function getUserChats(options = {}) {
	const page = options.page || 1;
	const limit = options.limit || 50;
	const skip = (page - 1) * limit;

	const where = options.unreadOnly ? { isRead: false } : {};

	const [chats, total, unreadCount] = await Promise.all([
		prisma.userChat.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip,
			take: limit,
		}),
		prisma.userChat.count({ where }),
		prisma.userChat.count({ where: { isRead: false } }),
	]);

	return { chats, total, unreadCount };
}

/**
 * Get conversation with a specific user
 * @param {BigInt|number} telegramId
 * @param {Object} options - { page, limit }
 * @returns {Promise<{ messages: Array, total: number }>}
 */
export async function getUserConversation(telegramId, options = {}) {
	const page = options.page || 1;
	const limit = options.limit || 50;
	const skip = (page - 1) * limit;

	const [messages, total] = await Promise.all([
		prisma.userChat.findMany({
			where: { telegramId: BigInt(telegramId) },
			orderBy: { createdAt: 'desc' },
			skip,
			take: limit,
		}),
		prisma.userChat.count({
			where: { telegramId: BigInt(telegramId) },
		}),
	]);

	return { messages, total };
}

/**
 * Add a new user chat message
 * @param {Object} data - { telegramId, username, firstName, messageText?, mediaUrl?, mediaType? }
 * @returns {Promise<Object>}
 */
export async function addUserChat(data) {
	return prisma.userChat.create({
		data: {
			telegramId: BigInt(data.telegramId),
			username: data.username || null,
			firstName: data.firstName,
			messageText: data.messageText || null,
			mediaUrl: data.mediaUrl || null,
			mediaType: data.mediaType || null,
		},
	});
}

/**
 * Add admin reply to a user chat
 * @param {string} id - Original message ID
 * @param {string} replyText
 * @returns {Promise<Object>}
 */
export async function addReply(id, replyText) {
	return prisma.userChat.update({
		where: { id },
		data: {
			replyTo: id,
			replyText,
			isRead: true,
		},
	});
}

/**
 * Mark a chat as read
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function markAsRead(id) {
	return prisma.userChat.update({
		where: { id },
		data: { isRead: true },
	});
}

/**
 * Mark all chats from a user as read
 * @param {BigInt|number} telegramId
 * @returns {Promise<{ count: number }>}
 */
export async function markAllAsRead(telegramId) {
	return prisma.userChat.updateMany({
		where: { telegramId: BigInt(telegramId), isRead: false },
		data: { isRead: true },
	});
}

/**
 * Get unique users who have sent messages
 * @returns {Promise<Array>}
 */
export async function getChatUsers() {
	const users = await prisma.userChat.groupBy({
		by: ['telegramId', 'username', 'firstName'],
		_count: true,
		_max: { createdAt: true },
		orderBy: { _max: { createdAt: 'desc' } },
	});

	// Get unread count per user
	const unreadCounts = await prisma.userChat.groupBy({
		by: ['telegramId'],
		where: { isRead: false },
		_count: true,
	});

	const unreadMap = {};
	unreadCounts.forEach((u) => {
		unreadMap[u.telegramId.toString()] = u._count;
	});

	return users.map((u) => ({
		telegramId: u.telegramId.toString(),
		username: u.username,
		firstName: u.firstName,
		messageCount: u._count,
		lastMessageAt: u._max.createdAt,
		unreadCount: unreadMap[u.telegramId.toString()] || 0,
	}));
}
