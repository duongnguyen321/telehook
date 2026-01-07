/**
 * Broadcast Routes - Template, Variable, and Message management (Admin only)
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from './auth.js';
import { isAdmin } from '../../services/roleService.js';
import {
	uploadVideo as s3Upload,
	isS3Enabled,
	getCdnUrl,
} from '../../utils/s3.js';
import {
	getVariables,
	createVariable,
	updateVariable,
	deleteVariable,
	replaceVariables,
	getTemplates,
	getTemplateById,
	createTemplate,
	updateTemplate,
	deleteTemplate,
	getMessages,
	getMessageById,
	createMessage,
	updateMessage,
} from '../../utils/broadcastStorage.js';
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

// Multer setup for file uploads
const upload = multer({
	storage: multer.diskStorage({
		destination: (req, file, cb) => {
			const uploadDir = path.join(process.cwd(), 'data', 'uploads');
			if (!fs.existsSync(uploadDir)) {
				fs.mkdirSync(uploadDir, { recursive: true });
			}
			cb(null, uploadDir);
		},
		filename: (req, file, cb) => {
			const ext = path.extname(file.originalname);
			const name = `broadcast_${Date.now()}${ext}`;
			cb(null, name);
		},
	}),
	limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
	fileFilter: (req, file, cb) => {
		const allowedTypes = [
			'image/jpeg',
			'image/png',
			'image/gif',
			'video/mp4',
			'video/quicktime',
		];
		if (allowedTypes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(new Error('Invalid file type. Only images and videos are allowed.'));
		}
	},
});

// ==================== VARIABLES ====================

/**
 * Get all variables
 */
router.get('/variables', adminOnly, async (req, res) => {
	try {
		const variables = await getVariables();
		res.json({ variables });
	} catch (error) {
		console.error('[Broadcast API] Get variables error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Create a new variable
 */
router.post('/variables', adminOnly, async (req, res) => {
	try {
		const { key, value, description } = req.body;
		if (!key || !value) {
			return res.status(400).json({ error: 'Key and value are required' });
		}
		const variable = await createVariable({ key, value, description });
		res.json({ variable });
	} catch (error) {
		console.error('[Broadcast API] Create variable error:', error);
		if (error.code === 'P2002') {
			return res.status(400).json({ error: 'Variable key already exists' });
		}
		res.status(500).json({ error: error.message });
	}
});

/**
 * Update a variable
 */
router.put('/variables/:id', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		const { key, value, description } = req.body;
		const variable = await updateVariable(id, { key, value, description });
		res.json({ variable });
	} catch (error) {
		console.error('[Broadcast API] Update variable error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Delete a variable
 */
router.delete('/variables/:id', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		await deleteVariable(id);
		res.json({ success: true });
	} catch (error) {
		console.error('[Broadcast API] Delete variable error:', error);
		res.status(500).json({ error: error.message });
	}
});

// ==================== TEMPLATES ====================

/**
 * Get all templates
 */
router.get('/templates', adminOnly, async (req, res) => {
	try {
		const page = parseInt(req.query.page || '1', 10);
		const limit = parseInt(req.query.limit || '20', 10);
		const { templates, total } = await getTemplates({ page, limit });
		res.json({
			templates,
			meta: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error('[Broadcast API] Get templates error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Get single template
 */
router.get('/templates/:id', adminOnly, async (req, res) => {
	try {
		const template = await getTemplateById(req.params.id);
		if (!template) {
			return res.status(404).json({ error: 'Template not found' });
		}
		res.json({ template });
	} catch (error) {
		console.error('[Broadcast API] Get template error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Create a new template
 */
router.post('/templates', adminOnly, async (req, res) => {
	try {
		const { name, title, content, mediaUrl, mediaType, buttons } = req.body;
		if (!name || !title || !content) {
			return res
				.status(400)
				.json({ error: 'Name, title, and content are required' });
		}
		const template = await createTemplate({
			name,
			title,
			content,
			mediaUrl,
			mediaType,
			buttons,
		});
		res.json({ template });
	} catch (error) {
		console.error('[Broadcast API] Create template error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Update a template
 */
router.put('/templates/:id', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		const { name, title, content, mediaUrl, mediaType, buttons } = req.body;
		const template = await updateTemplate(id, {
			name,
			title,
			content,
			mediaUrl,
			mediaType,
			buttons,
		});
		res.json({ template });
	} catch (error) {
		console.error('[Broadcast API] Update template error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Delete a template
 */
router.delete('/templates/:id', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		await deleteTemplate(id);
		res.json({ success: true });
	} catch (error) {
		console.error('[Broadcast API] Delete template error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Preview template with variables replaced
 */
router.post('/templates/:id/preview', adminOnly, async (req, res) => {
	try {
		const template = await getTemplateById(req.params.id);
		if (!template) {
			return res.status(404).json({ error: 'Template not found' });
		}

		const title = await replaceVariables(template.title);
		const content = await replaceVariables(template.content);

		res.json({
			preview: {
				...template,
				title,
				content,
			},
		});
	} catch (error) {
		console.error('[Broadcast API] Preview error:', error);
		res.status(500).json({ error: error.message });
	}
});

// ==================== MESSAGES ====================

/**
 * Get all sent messages
 */
router.get('/messages', adminOnly, async (req, res) => {
	try {
		const page = parseInt(req.query.page || '1', 10);
		const limit = parseInt(req.query.limit || '20', 10);
		const { messages, total } = await getMessages({ page, limit });

		res.json({
			messages: messages.map((m) => ({
				...m,
				sentBy: m.sentBy.toString(),
			})),
			meta: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error('[Broadcast API] Get messages error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Publish a broadcast message to users and/or channels
 */
router.post('/publish', adminOnly, async (req, res) => {
	try {
		const { templateId, targetRole, channelIds } = req.body;
		const adminId = parseInt(req.user.telegramId, 10);

		if (!templateId) {
			return res.status(400).json({ error: 'templateId is required' });
		}

		// Must have at least one target
		const hasUserTarget =
			targetRole && ['user', 'mod', 'reviewer', 'all'].includes(targetRole);
		const hasChannelTarget = Array.isArray(channelIds) && channelIds.length > 0;

		if (!hasUserTarget && !hasChannelTarget) {
			return res
				.status(400)
				.json({ error: 'Must specify targetRole and/or channelIds' });
		}

		// Get template
		const template = await getTemplateById(templateId);
		if (!template) {
			return res.status(404).json({ error: 'Template not found' });
		}

		// Replace variables
		const title = await replaceVariables(template.title);
		const content = await replaceVariables(template.content);
		const fullMessage = `*${title}*\n\n${content}`;

		const bot = getBot();
		if (!bot) {
			return res.status(500).json({ error: 'Bot not available' });
		}

		// Build inline keyboard from buttons
		let keyboard = null;
		if (
			template.buttons &&
			Array.isArray(template.buttons) &&
			template.buttons.length > 0
		) {
			keyboard = {
				inline_keyboard: template.buttons.map((btn) => {
					if (btn.type === 'link') {
						return [{ text: btn.text, url: btn.value }];
					} else if (btn.type === 'copy') {
						return [
							{
								text: btn.text,
								callback_data: `copy_${btn.value.substring(0, 50)}`,
							},
						];
					} else if (btn.type === 'callback') {
						return [{ text: btn.text, callback_data: btn.value }];
					}
					return [{ text: btn.text, url: btn.value || 'https://t.me' }];
				}),
			};
		}

		const messageRecords = [];
		let userSuccess = 0;
		let userFail = 0;
		let userTotal = 0;

		// Send to users (if targetRole specified)
		if (hasUserTarget) {
			let where = {};
			if (targetRole !== 'all') {
				where.role = targetRole;
			}
			const users = await prisma.user.findMany({ where });
			userTotal = users.length;

			for (const user of users) {
				try {
					let sentMessage;
					const chatId = Number(user.telegramId);

					if (template.mediaUrl && template.mediaType) {
						const mediaUrl = template.mediaUrl.startsWith('http')
							? template.mediaUrl
							: getCdnUrl(template.mediaUrl);

						if (template.mediaType === 'image') {
							sentMessage = await bot.api.sendPhoto(chatId, mediaUrl, {
								caption: fullMessage,
								parse_mode: 'Markdown',
								reply_markup: keyboard,
							});
						} else if (template.mediaType === 'video') {
							sentMessage = await bot.api.sendVideo(chatId, mediaUrl, {
								caption: fullMessage,
								parse_mode: 'Markdown',
								reply_markup: keyboard,
							});
						}
					} else {
						sentMessage = await bot.api.sendMessage(chatId, fullMessage, {
							parse_mode: 'Markdown',
							reply_markup: keyboard,
						});
					}

					messageRecords.push({
						chatId: chatId.toString(),
						messageId: sentMessage.message_id.toString(),
						type: 'user',
					});
					userSuccess++;
				} catch (err) {
					console.error(
						`[Broadcast] Failed to send to user ${user.telegramId}:`,
						err.message
					);
					userFail++;
				}
			}
		}

		// Send to channels (if channelIds specified)
		let channelSuccess = 0;
		let channelFail = 0;
		let channelTotal = 0;

		if (hasChannelTarget) {
			const channels = await prisma.telegramChannel.findMany({
				where: { id: { in: channelIds }, isActive: true },
			});
			channelTotal = channels.length;

			for (const channel of channels) {
				try {
					let sentMessage;
					const chatId = channel.chatId;

					if (template.mediaUrl && template.mediaType) {
						const mediaUrl = template.mediaUrl.startsWith('http')
							? template.mediaUrl
							: getCdnUrl(template.mediaUrl);

						if (template.mediaType === 'image') {
							sentMessage = await bot.api.sendPhoto(chatId, mediaUrl, {
								caption: fullMessage,
								parse_mode: 'Markdown',
								reply_markup: keyboard,
							});
						} else if (template.mediaType === 'video') {
							sentMessage = await bot.api.sendVideo(chatId, mediaUrl, {
								caption: fullMessage,
								parse_mode: 'Markdown',
								reply_markup: keyboard,
							});
						}
					} else {
						sentMessage = await bot.api.sendMessage(chatId, fullMessage, {
							parse_mode: 'Markdown',
							reply_markup: keyboard,
						});
					}

					messageRecords.push({
						chatId: chatId.toString(),
						messageId: sentMessage.message_id.toString(),
						type: 'channel',
						channelId: channel.id,
					});
					channelSuccess++;
				} catch (err) {
					console.error(
						`[Broadcast] Failed to send to channel ${channel.chatId}:`,
						err.message
					);
					channelFail++;
				}
			}
		}

		// Save message record
		const message = await createMessage({
			templateId,
			targetRole: targetRole || null,
			channelIds: hasChannelTarget ? channelIds : [],
			sentBy: adminId,
			messageRecords,
			status: 'sent',
		});

		res.json({
			success: true,
			message: {
				...message,
				sentBy: message.sentBy.toString(),
			},
			stats: {
				total: userTotal,
				success: userSuccess,
				failed: userFail,
			},
			channelStats: {
				total: channelTotal,
				success: channelSuccess,
				failed: channelFail,
			},
		});
	} catch (error) {
		console.error('[Broadcast API] Publish error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Edit a sent broadcast message
 */
router.put('/messages/:id/edit', adminOnly, async (req, res) => {
	try {
		const { id } = req.params;
		const { title, content } = req.body;

		const message = await getMessageById(id);
		if (!message) {
			return res.status(404).json({ error: 'Message not found' });
		}

		// Replace variables in new content
		const newTitle = await replaceVariables(title || message.template.title);
		const newContent = await replaceVariables(
			content || message.template.content
		);
		const fullMessage = `*${newTitle}*\n\n${newContent}`;

		const bot = getBot();
		if (!bot) {
			return res.status(500).json({ error: 'Bot not available' });
		}

		// Edit each sent message
		let successCount = 0;
		let failCount = 0;
		const records = message.messageRecords || [];

		for (const record of records) {
			try {
				const chatId = parseInt(record.chatId, 10);
				const messageId = parseInt(record.messageId, 10);

				if (message.template.mediaUrl) {
					// Edit caption for media messages
					await bot.api.editMessageCaption(chatId, messageId, {
						caption: fullMessage,
						parse_mode: 'Markdown',
					});
				} else {
					// Edit text for text messages
					await bot.api.editMessageText(chatId, messageId, fullMessage, {
						parse_mode: 'Markdown',
					});
				}
				successCount++;
			} catch (err) {
				console.error(
					`[Broadcast] Failed to edit message ${record.messageId}:`,
					err.message
				);
				failCount++;
			}
		}

		// Update template content if editing in place
		if (title || content) {
			await updateTemplate(message.templateId, {
				title: title || message.template.title,
				content: content || message.template.content,
			});
		}

		// Update message status
		await updateMessage(id, { status: 'edited' });

		res.json({
			success: true,
			stats: {
				total: records.length,
				success: successCount,
				failed: failCount,
			},
		});
	} catch (error) {
		console.error('[Broadcast API] Edit message error:', error);
		res.status(500).json({ error: error.message });
	}
});

// ==================== UPLOAD ====================

/**
 * Upload media file for broadcast
 */
router.post('/upload', adminOnly, upload.single('file'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' });
		}

		const localPath = req.file.path;
		const filename = req.file.filename;
		const mimetype = req.file.mimetype;

		let mediaUrl = filename;
		let mediaType = mimetype.startsWith('image/') ? 'image' : 'video';

		// Upload to S3 if enabled
		if (isS3Enabled()) {
			const success = await s3Upload(localPath, filename);
			if (success) {
				mediaUrl = getCdnUrl(filename);
				// Clean up local file
				fs.unlinkSync(localPath);
			}
		}

		res.json({
			success: true,
			media: {
				url: mediaUrl,
				type: mediaType,
				filename,
			},
		});
	} catch (error) {
		console.error('[Broadcast API] Upload error:', error);
		res.status(500).json({ error: error.message });
	}
});

export default router;
