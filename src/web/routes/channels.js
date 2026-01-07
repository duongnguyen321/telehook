/**
 * Channel Routes - Telegram Channel/Group management (Admin only)
 */

import express from 'express';
import { authMiddleware } from './auth.js';
import { isAdmin } from '../../services/roleService.js';
import { prisma } from '../../utils/prisma.js';
import { getBot } from '../server.js';

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

// ==================== CHANNEL CRUD ====================

/**
 * Get all channels/groups
 */
router.get('/', adminOnly, async (req, res) => {
	try {
		const channels = await prisma.telegramChannel.findMany({
			orderBy: { addedAt: 'desc' },
		});

		res.json({
			channels: channels.map((c) => ({
				...c,
				chatId: c.chatId.toString(),
			})),
		});
	} catch (error) {
		console.error('[Channels API] Get channels error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Add a new channel/group manually by chatId or @username
 */
router.post('/', adminOnly, async (req, res) => {
	try {
		const { chatId, username } = req.body;

		if (!chatId && !username) {
			return res.status(400).json({ error: 'chatId or username is required' });
		}

		const bot = getBot();
		if (!bot) {
			return res.status(500).json({ error: 'Bot not available' });
		}

		// Get chat info from Telegram
		let chat;
		try {
			const identifier = chatId
				? Number(chatId)
				: `@${username.replace('@', '')}`;
			chat = await bot.api.getChat(identifier);
		} catch (err) {
			return res
				.status(400)
				.json({ error: 'Channel/group not found or bot is not a member' });
		}

		// Verify bot is admin
		try {
			const botMember = await bot.api.getChatMember(chat.id, bot.botInfo.id);
			if (!['administrator', 'creator'].includes(botMember.status)) {
				return res
					.status(400)
					.json({ error: 'Bot is not an admin in this channel/group' });
			}
		} catch (err) {
			return res.status(400).json({ error: 'Cannot verify bot admin status' });
		}

		// Get member count if available
		let memberCount = null;
		try {
			memberCount = await bot.api.getChatMemberCount(chat.id);
		} catch (e) {
			// Ignore error for member count
		}

		// Determine type
		let type = 'group';
		if (chat.type === 'channel') type = 'channel';
		else if (chat.type === 'supergroup') type = 'supergroup';

		// Create or update channel
		const channel = await prisma.telegramChannel.upsert({
			where: { chatId: BigInt(chat.id) },
			update: {
				title: chat.title,
				type,
				username: chat.username || null,
				description: chat.description || null,
				memberCount,
				isActive: true,
			},
			create: {
				chatId: BigInt(chat.id),
				title: chat.title,
				type,
				username: chat.username || null,
				description: chat.description || null,
				memberCount,
			},
		});

		res.json({
			success: true,
			channel: {
				...channel,
				chatId: channel.chatId.toString(),
			},
		});
	} catch (error) {
		console.error('[Channels API] Add channel error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Refresh channel info from Telegram
 */
router.get('/:id/refresh', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		const channel = await prisma.telegramChannel.findUnique({ where: { id } });

		if (!channel) {
			return res.status(404).json({ error: 'Channel not found' });
		}

		const bot = getBot();
		if (!bot) {
			return res.status(500).json({ error: 'Bot not available' });
		}

		// Get fresh info from Telegram
		const chat = await bot.api.getChat(Number(channel.chatId));
		let memberCount = null;
		try {
			memberCount = await bot.api.getChatMemberCount(Number(channel.chatId));
		} catch (e) {}

		const updated = await prisma.telegramChannel.update({
			where: { id },
			data: {
				title: chat.title,
				username: chat.username || null,
				description: chat.description || null,
				memberCount,
			},
		});

		res.json({
			channel: {
				...updated,
				chatId: updated.chatId.toString(),
			},
		});
	} catch (error) {
		console.error('[Channels API] Refresh error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Delete/remove a channel from management
 */
router.delete('/:id', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		await prisma.telegramChannel.delete({ where: { id } });
		res.json({ success: true });
	} catch (error) {
		console.error('[Channels API] Delete error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Toggle channel active status
 */
router.put('/:id/toggle', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		const channel = await prisma.telegramChannel.findUnique({ where: { id } });

		if (!channel) {
			return res.status(404).json({ error: 'Channel not found' });
		}

		const updated = await prisma.telegramChannel.update({
			where: { id },
			data: { isActive: !channel.isActive },
		});

		res.json({
			channel: {
				...updated,
				chatId: updated.chatId.toString(),
			},
		});
	} catch (error) {
		console.error('[Channels API] Toggle error:', error);
		res.status(500).json({ error: error.message });
	}
});

// ==================== MODERATION ====================

/**
 * Ban a user from channel/group
 */
router.post('/:id/ban', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		const { telegramId, reason } = req.body;
		const adminId = parseInt(req.user.telegramId, 10);

		if (!telegramId) {
			return res.status(400).json({ error: 'telegramId is required' });
		}

		const channel = await prisma.telegramChannel.findUnique({ where: { id } });
		if (!channel) {
			return res.status(404).json({ error: 'Channel not found' });
		}

		const bot = getBot();
		if (!bot) {
			return res.status(500).json({ error: 'Bot not available' });
		}

		// Ban user in Telegram
		try {
			await bot.api.banChatMember(Number(channel.chatId), Number(telegramId));
		} catch (err) {
			return res.status(400).json({ error: `Failed to ban: ${err.message}` });
		}

		// Get user info
		let userInfo = { username: null, firstName: null };
		try {
			const user = await bot.api.getChatMember(
				Number(channel.chatId),
				Number(telegramId)
			);
			userInfo = {
				username: user.user.username || null,
				firstName: user.user.first_name || null,
			};
		} catch (e) {}

		// Save ban record
		const ban = await prisma.channelBan.upsert({
			where: {
				channelId_telegramId: {
					channelId: id,
					telegramId: BigInt(telegramId),
				},
			},
			update: {
				reason,
				bannedBy: BigInt(adminId),
				bannedAt: new Date(),
			},
			create: {
				channelId: id,
				chatId: channel.chatId,
				telegramId: BigInt(telegramId),
				username: userInfo.username,
				firstName: userInfo.firstName,
				reason,
				bannedBy: BigInt(adminId),
			},
		});

		res.json({
			success: true,
			ban: {
				...ban,
				chatId: ban.chatId.toString(),
				telegramId: ban.telegramId.toString(),
				bannedBy: ban.bannedBy.toString(),
			},
		});
	} catch (error) {
		console.error('[Channels API] Ban error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Unban a user from channel/group
 */
router.post('/:id/unban', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		const { telegramId } = req.body;

		if (!telegramId) {
			return res.status(400).json({ error: 'telegramId is required' });
		}

		const channel = await prisma.telegramChannel.findUnique({ where: { id } });
		if (!channel) {
			return res.status(404).json({ error: 'Channel not found' });
		}

		const bot = getBot();
		if (!bot) {
			return res.status(500).json({ error: 'Bot not available' });
		}

		// Unban user in Telegram
		try {
			await bot.api.unbanChatMember(
				Number(channel.chatId),
				Number(telegramId),
				{
					only_if_banned: true,
				}
			);
		} catch (err) {
			return res.status(400).json({ error: `Failed to unban: ${err.message}` });
		}

		// Remove ban record
		await prisma.channelBan.deleteMany({
			where: {
				channelId: id,
				telegramId: BigInt(telegramId),
			},
		});

		res.json({ success: true });
	} catch (error) {
		console.error('[Channels API] Unban error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Kick a user (remove without ban)
 */
router.post('/:id/kick', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		const { telegramId } = req.body;

		if (!telegramId) {
			return res.status(400).json({ error: 'telegramId is required' });
		}

		const channel = await prisma.telegramChannel.findUnique({ where: { id } });
		if (!channel) {
			return res.status(404).json({ error: 'Channel not found' });
		}

		const bot = getBot();
		if (!bot) {
			return res.status(500).json({ error: 'Bot not available' });
		}

		// Kick user (ban then immediately unban)
		try {
			await bot.api.banChatMember(Number(channel.chatId), Number(telegramId));
			await bot.api.unbanChatMember(Number(channel.chatId), Number(telegramId));
		} catch (err) {
			return res.status(400).json({ error: `Failed to kick: ${err.message}` });
		}

		res.json({ success: true });
	} catch (error) {
		console.error('[Channels API] Kick error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Get banned users list
 */
router.get('/:id/bans', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		const bans = await prisma.channelBan.findMany({
			where: { channelId: id },
			orderBy: { bannedAt: 'desc' },
		});

		res.json({
			bans: bans.map((b) => ({
				...b,
				chatId: b.chatId.toString(),
				telegramId: b.telegramId.toString(),
				bannedBy: b.bannedBy.toString(),
			})),
		});
	} catch (error) {
		console.error('[Channels API] Get bans error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Promote user to admin
 */
router.post('/:id/promote', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		const { telegramId, permissions } = req.body;

		if (!telegramId) {
			return res.status(400).json({ error: 'telegramId is required' });
		}

		const channel = await prisma.telegramChannel.findUnique({ where: { id } });
		if (!channel) {
			return res.status(404).json({ error: 'Channel not found' });
		}

		const bot = getBot();
		if (!bot) {
			return res.status(500).json({ error: 'Bot not available' });
		}

		// Default admin permissions
		const defaultPerms = {
			can_manage_chat: true,
			can_delete_messages: true,
			can_manage_video_chats: true,
			can_restrict_members: true,
			can_promote_members: false,
			can_change_info: false,
			can_invite_users: true,
			can_post_messages: channel.type === 'channel' ? true : undefined,
			can_edit_messages: channel.type === 'channel' ? true : undefined,
			can_pin_messages: true,
			...permissions,
		};

		try {
			await bot.api.promoteChatMember(
				Number(channel.chatId),
				Number(telegramId),
				defaultPerms
			);
		} catch (err) {
			return res
				.status(400)
				.json({ error: `Failed to promote: ${err.message}` });
		}

		res.json({ success: true });
	} catch (error) {
		console.error('[Channels API] Promote error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Demote admin to regular member
 */
router.post('/:id/demote', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		const { telegramId } = req.body;

		if (!telegramId) {
			return res.status(400).json({ error: 'telegramId is required' });
		}

		const channel = await prisma.telegramChannel.findUnique({ where: { id } });
		if (!channel) {
			return res.status(404).json({ error: 'Channel not found' });
		}

		const bot = getBot();
		if (!bot) {
			return res.status(500).json({ error: 'Bot not available' });
		}

		// Remove all admin permissions
		try {
			await bot.api.promoteChatMember(
				Number(channel.chatId),
				Number(telegramId),
				{
					can_manage_chat: false,
					can_delete_messages: false,
					can_manage_video_chats: false,
					can_restrict_members: false,
					can_promote_members: false,
					can_change_info: false,
					can_invite_users: false,
					can_post_messages: false,
					can_edit_messages: false,
					can_pin_messages: false,
				}
			);
		} catch (err) {
			return res
				.status(400)
				.json({ error: `Failed to demote: ${err.message}` });
		}

		res.json({ success: true });
	} catch (error) {
		console.error('[Channels API] Demote error:', error);
		res.status(500).json({ error: error.message });
	}
});

// ==================== MESSAGING ====================

/**
 * Send message to channel/group (supports text, media, media group)
 */
router.post('/:id/send', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		const {
			text,
			mediaType,
			mediaUrl,
			mediaGroup,
			buttons,
			parseMode = 'Markdown',
		} = req.body;

		const channel = await prisma.telegramChannel.findUnique({ where: { id } });
		if (!channel) {
			return res.status(404).json({ error: 'Channel not found' });
		}

		const bot = getBot();
		if (!bot) {
			return res.status(500).json({ error: 'Bot not available' });
		}

		const chatId = Number(channel.chatId);
		let sentMessage;

		// Build inline keyboard if buttons provided
		let replyMarkup = undefined;
		if (buttons && Array.isArray(buttons) && buttons.length > 0) {
			replyMarkup = {
				inline_keyboard: buttons.map((btn) => {
					if (btn.type === 'link') {
						return [{ text: btn.text, url: btn.value }];
					} else if (btn.type === 'callback') {
						return [{ text: btn.text, callback_data: btn.value }];
					}
					return [{ text: btn.text, url: btn.value || 'https://t.me' }];
				}),
			};
		}

		// Send media group (multiple photos/videos)
		if (mediaGroup && Array.isArray(mediaGroup) && mediaGroup.length > 1) {
			const media = mediaGroup.map((m, i) => ({
				type: m.type || 'photo',
				media: m.url,
				caption: i === 0 ? text : undefined, // Only first item gets caption
				parse_mode: i === 0 ? parseMode : undefined,
			}));

			const messages = await bot.api.sendMediaGroup(chatId, media);
			sentMessage = messages[0];
		}
		// Send single media
		else if (mediaType && mediaUrl) {
			const options = {
				caption: text,
				parse_mode: parseMode,
				reply_markup: replyMarkup,
			};

			switch (mediaType) {
				case 'photo':
					sentMessage = await bot.api.sendPhoto(chatId, mediaUrl, options);
					break;
				case 'video':
					sentMessage = await bot.api.sendVideo(chatId, mediaUrl, {
						...options,
						supports_streaming: true,
					});
					break;
				case 'audio':
					sentMessage = await bot.api.sendAudio(chatId, mediaUrl, options);
					break;
				case 'document':
					sentMessage = await bot.api.sendDocument(chatId, mediaUrl, options);
					break;
				case 'voice':
					sentMessage = await bot.api.sendVoice(chatId, mediaUrl, options);
					break;
				default:
					sentMessage = await bot.api.sendPhoto(chatId, mediaUrl, options);
			}
		}
		// Send text only
		else if (text) {
			sentMessage = await bot.api.sendMessage(chatId, text, {
				parse_mode: parseMode,
				reply_markup: replyMarkup,
			});
		} else {
			return res.status(400).json({ error: 'text or media is required' });
		}

		res.json({
			success: true,
			messageId: sentMessage.message_id,
		});
	} catch (error) {
		console.error('[Channels API] Send message error:', error);
		res.status(500).json({ error: error.message });
	}
});

export default router;
