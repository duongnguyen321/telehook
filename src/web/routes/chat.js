/**
 * Chat Routes - User chat management (Admin only)
 */

import express from 'express';
import { authMiddleware } from './auth.js';
import { isAdmin } from '../../services/roleService.js';
import {
	getUserChats,
	getUserConversation,
	getChatUsers,
	markAsRead,
	markAllAsRead,
	addReply,
} from '../../utils/broadcastStorage.js';
import { getBot, getIO } from '../server.js';
import { replaceVariables } from '../../utils/broadcastStorage.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Admin-only check middleware
function adminOnly(req, res, next) {
	const telegramIdNum = parseInt(req.user.telegramId, 10);
	if (!isAdmin(telegramIdNum)) {
		return res.status(403).json({ error: 'Admin access required' });
	}
	next();
}

/**
 * Get all unique users who have sent messages
 */
router.get('/users', adminOnly, async (req, res) => {
	try {
		const users = await getChatUsers();
		res.json({ users });
	} catch (error) {
		console.error('[Chat API] Get users error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Get all user chats with pagination
 */
router.get('/messages', adminOnly, async (req, res) => {
	try {
		const page = parseInt(req.query.page || '1', 10);
		const limit = parseInt(req.query.limit || '50', 10);
		const unreadOnly = req.query.unreadOnly === 'true';

		const { chats, total, unreadCount } = await getUserChats({
			page,
			limit,
			unreadOnly,
		});

		res.json({
			chats: chats.map((c) => ({
				...c,
				telegramId: c.telegramId.toString(),
			})),
			meta: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
				unreadCount,
			},
		});
	} catch (error) {
		console.error('[Chat API] Get messages error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Get conversation with specific user
 */
router.get('/messages/:telegramId', adminOnly, async (req, res) => {
	try {
		const { telegramId } = req.params;
		const page = parseInt(req.query.page || '1', 10);
		const limit = parseInt(req.query.limit || '50', 10);

		const { messages, total } = await getUserConversation(telegramId, {
			page,
			limit,
		});

		// Mark all as read when viewing conversation
		await markAllAsRead(telegramId);

		res.json({
			messages: messages.map((m) => ({
				...m,
				telegramId: m.telegramId.toString(),
			})),
			meta: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error('[Chat API] Get conversation error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Reply to a user message
 */
router.post('/reply/:id', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		let { replyText, useTemplate, templateId } = req.body;

		if (!replyText && !useTemplate) {
			return res.status(400).json({ error: 'replyText is required' });
		}

		// If using template, get the template content
		if (useTemplate && templateId) {
			const { getTemplateById } = await import(
				'../../utils/broadcastStorage.js'
			);
			const template = await getTemplateById(templateId);
			if (template) {
				const title = await replaceVariables(template.title);
				const content = await replaceVariables(template.content);
				replyText = `*${title}*\n\n${content}`;
			}
		} else {
			// Replace variables in reply text
			replyText = await replaceVariables(replyText);
		}

		// Get the original message to find chat ID
		const { prisma } = await import('../../utils/prisma.js');
		const originalMessage = await prisma.userChat.findUnique({ where: { id } });
		if (!originalMessage) {
			return res.status(404).json({ error: 'Message not found' });
		}

		const bot = getBot();
		if (!bot) {
			return res.status(500).json({ error: 'Bot not available' });
		}

		// Send reply to user
		await bot.api.sendMessage(Number(originalMessage.telegramId), replyText, {
			parse_mode: 'Markdown',
		});

		// Update database
		const updatedMessage = await addReply(id, replyText);

		// Notify via socket
		const io = getIO();
		if (io) {
			io.emit('chat_replied', {
				messageId: id,
				telegramId: originalMessage.telegramId.toString(),
				replyText,
			});
		}

		res.json({
			success: true,
			message: {
				...updatedMessage,
				telegramId: updatedMessage.telegramId.toString(),
			},
		});
	} catch (error) {
		console.error('[Chat API] Reply error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Mark a message as read
 */
router.put('/read/:id', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		const message = await markAsRead(id);
		res.json({
			success: true,
			message: {
				...message,
				telegramId: message.telegramId.toString(),
			},
		});
	} catch (error) {
		console.error('[Chat API] Mark read error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Mark all messages from a user as read
 */
router.put('/read-all/:telegramId', adminOnly, async (req, res) => {
	try {
		const { telegramId } = req.params;
		const result = await markAllAsRead(telegramId);
		res.json({ success: true, count: result.count });
	} catch (error) {
		console.error('[Chat API] Mark all read error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Delete a single message
 */
router.delete('/message/:id', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		const { prisma } = await import('../../utils/prisma.js');
		await prisma.userChat.delete({ where: { id } });
		res.json({ success: true });
	} catch (error) {
		console.error('[Chat API] Delete message error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Delete all messages from a user
 */
router.delete('/messages/:telegramId', adminOnly, async (req, res) => {
	try {
		const { telegramId } = req.params;
		const { prisma } = await import('../../utils/prisma.js');
		const result = await prisma.userChat.deleteMany({
			where: { telegramId: BigInt(telegramId) },
		});
		res.json({ success: true, count: result.count });
	} catch (error) {
		console.error('[Chat API] Delete all messages error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Block a user - blocks from all bot interactions and deletes all messages
 */
router.post('/block/:telegramId', adminOnly, async (req, res) => {
	try {
		const { telegramId } = req.params;
		const { prisma } = await import('../../utils/prisma.js');

		// Update user to blocked
		const user = await prisma.user.update({
			where: { telegramId: BigInt(telegramId) },
			data: { isBlocked: true },
		});

		// Delete all messages from this user
		const deleteResult = await prisma.userChat.deleteMany({
			where: { telegramId: BigInt(telegramId) },
		});

		console.log(
			`[Chat] Blocked user ${telegramId}, deleted ${deleteResult.count} messages`
		);

		res.json({
			success: true,
			user: {
				telegramId: user.telegramId.toString(),
				isBlocked: user.isBlocked,
			},
			deletedMessages: deleteResult.count,
		});
	} catch (error) {
		console.error('[Chat API] Block user error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Unblock a user
 */
router.post('/unblock/:telegramId', adminOnly, async (req, res) => {
	try {
		const { telegramId } = req.params;
		const { prisma } = await import('../../utils/prisma.js');

		const user = await prisma.user.update({
			where: { telegramId: BigInt(telegramId) },
			data: { isBlocked: false },
		});

		console.log(`[Chat] Unblocked user ${telegramId}`);

		res.json({
			success: true,
			user: {
				telegramId: user.telegramId.toString(),
				isBlocked: user.isBlocked,
			},
		});
	} catch (error) {
		console.error('[Chat API] Unblock user error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Get user block status
 */
router.get('/block-status/:telegramId', adminOnly, async (req, res) => {
	try {
		const { telegramId } = req.params;
		const { prisma } = await import('../../utils/prisma.js');

		const user = await prisma.user.findUnique({
			where: { telegramId: BigInt(telegramId) },
			select: { isBlocked: true },
		});

		res.json({
			isBlocked: user?.isBlocked || false,
		});
	} catch (error) {
		console.error('[Chat API] Get block status error:', error);
		res.status(500).json({ error: error.message });
	}
});

export default router;
