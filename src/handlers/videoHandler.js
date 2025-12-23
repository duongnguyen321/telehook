import fs from 'fs';
import path from 'path';
import { InlineKeyboard } from 'grammy';
import {
	addScheduledPost,
	getPendingPostsByChat,
	getArchiveStats,
	isVideoDuplicate,
	trackDownloadedVideo,
	updateVideoStatus,
	updatePostStatus,
	getVideoStats,
	rescheduleAllPending,
	deleteScheduledPost,
	updatePostContent,
	updatePostFileId,
	cleanOrphanedPosts,
	DATA_DIR,
	prisma,
} from '../utils/storage.js';
import { formatVietnameseTime } from '../utils/timeParser.js';
import {
	scheduleUpload,
	setDefaultChatId,
	triggerRepostCheck,
} from '../services/scheduler.js';
import {
	generateContentOptions,
	getCategories,
	getCategoryOptions,
	generateContentFromCategories,
	getCategoryName,
	getOptionLabel,
	getCategoryKeyByIndex,
	getOptionKeyByIndex,
} from '../services/ai.js';
import { downloadVideo, queueDownload } from '../utils/downloader.js';

// Temporary storage for category selections during content generation
// Key: `${chatId}_${postId}`, Value: { POSE: 'FRONT', ACTION: 'SHOWING', ... }
const categorySelections = new Map();

// Temporary storage for generated options to allow user selection
// Key: `${chatId}_${postId}`, Value: Array of content options
const generatedOptions = new Map();

/**
 * Build category selection keyboard
 * @param {string} postId
 * @param {number} page
 * @param {Object} selections - Current selections
 * @returns {InlineKeyboard}
 */
function buildCategoryKeyboard(postId, page, selections = {}) {
	const keyboard = new InlineKeyboard();
	const categories = getCategories();

	// Add category buttons (2 per row)
	for (let i = 0; i < categories.length; i++) {
		const cat = categories[i];
		const isSelected = selections[cat.key];
		const label = isSelected
			? `✅ ${cat.emoji} ${cat.name}`
			: `${cat.emoji} ${cat.name}`;
		// Use index instead of key to save space
		keyboard.text(label, `cat_${postId}_${page}_${i}`);
		if (i % 2 === 1) keyboard.row();
	}

	// Add action buttons
	keyboard.row();
	keyboard.text('✅ Xong', `done_${postId}_${page}`);
	keyboard.text('🔀 Random', `rand_${postId}_${page}`);
	keyboard.row();
	keyboard.text('❌ Hủy', `cancel_${postId}_${page}`);

	return keyboard;
}

/**
 * Build options keyboard for a category
 * @param {string} postId
 * @param {number} page
 * @param {string} categoryKey
 * @param {Array} selectedOptions - Array of selected option keys for this category
 * @returns {InlineKeyboard}
 */
function buildOptionsKeyboard(postId, page, categoryKey, selectedOptions = []) {
	const keyboard = new InlineKeyboard();
	const options = getCategoryOptions(categoryKey);

	if (!options) return keyboard;

	// We need category index for the callback
	const categories = getCategories();
	const catIndex = categories.findIndex((c) => c.key === categoryKey);

	for (let i = 0; i < options.length; i++) {
		const opt = options[i];
		const isSelected = selectedOptions.includes(opt.key);
		const label = isSelected ? `✅ ${opt.label}` : opt.label;
		// Use indices: opt_ID_Page_CatIndex_OptIndex
		keyboard.text(label, `opt_${postId}_${page}_${catIndex}_${i}`);
		if (i % 2 === 1) keyboard.row();
	}

	// Back button
	keyboard.row();
	keyboard.text('⬅️ Quay lại', `back_${postId}_${page}`);

	return keyboard;
}

/**
 * Format all selections for display
 * @param {Object} selections - { CATEGORY_KEY: [optKey1, optKey2], ... }
 * @returns {string}
 */
function formatSelectionsDisplay(selections) {
	const lines = [];
	for (const [catKey, optKeys] of Object.entries(selections)) {
		if (!optKeys || optKeys.length === 0) continue;
		const catName = getCategoryName(catKey);
		const optLabels = optKeys
			.map((k) => getOptionLabel(catKey, k))
			.filter(Boolean);
		if (optLabels.length > 0) {
			lines.push(`✅ **${catName}**: ${optLabels.join(', ')}`);
		}
	}
	return lines.length > 0 ? lines.join('\n') : 'Chưa chọn gì';
}

/**
 * Safely edit message caption (for video) or text
 * @param {import('grammy').Context} ctx
 * @param {string} text
 * @param {import('grammy').InlineKeyboard} keyboard
 */
async function safeEditMessage(ctx, text, keyboard) {
	try {
		const isVideo = !!ctx.callbackQuery?.message?.video;
		// Caption limit is 1024 chars
		if (isVideo && text.length <= 1024) {
			await ctx.editMessageCaption({
				caption: text,
				reply_markup: keyboard,
				parse_mode: 'Markdown',
			});
		} else {
			// If not video, or text too long, fall back to text edit
			if (isVideo && text.length > 1024) {
				// Must convert to text message
				try {
					await ctx.api.deleteMessage(
						ctx.chat.id,
						ctx.callbackQuery.message.message_id
					);
				} catch (e) {
					/* ignore */
				}
				await ctx.reply(text, {
					reply_markup: keyboard,
					parse_mode: 'Markdown',
				});
			} else {
				// Normal text message edit
				await ctx.editMessageText(text, {
					reply_markup: keyboard,
					parse_mode: 'Markdown',
				});
			}
		}
	} catch (e) {
		console.error('[UI] Error editing message:', e.message);
	}
}

/**
 * Send paginated queue page with video details + video file
 * @param {import('grammy').Context} ctx
 * @param {number} chatId
 * @param {number} page
 * @param {number|null} messageId
 * @param {boolean} isAdmin - Whether user is admin
 */
async function sendQueuePage(
	ctx,
	chatId,
	page,
	messageId = null,
	isAdmin = false
) {
	const { InputFile } = await import('grammy');
	const posts = await getPendingPostsByChat(chatId);
	const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME || '';
	const tiktokLink = TIKTOK_USERNAME
		? `\n\n🔥 Follow: https://tiktok.com/@${TIKTOK_USERNAME}`
		: '';

	if (posts.length === 0) {
		const text = 'No pending videos' + tiktokLink;
		if (messageId) {
			try {
				await ctx.api.editMessageText(chatId, messageId, text);
			} catch (e) {
				await ctx.reply(text);
			}
		} else {
			await ctx.reply(text);
		}
		return;
	}

	const post = posts[page];
	if (!post) {
		await sendQueuePage(ctx, chatId, 0, messageId, isAdmin);
		return;
	}

	const time = formatVietnameseTime(new Date(post.scheduledAt));
	const caption =
		`[${page + 1}/${posts.length}] ${time}\n\n` +
		`${post.title}\n\n` +
		`${post.description}\n\n` +
		`${post.hashtags}` +
		tiktokLink;

	// Build keyboard
	const keyboard = new InlineKeyboard();

	// Navigation row
	const navRow = [];
	if (page > 0) {
		navRow.push({ text: '⏮️ Start', callback_data: `queue_0` });
		navRow.push({ text: '◀️ Prev', callback_data: `queue_${page - 1}` });
	}
	if (page < posts.length - 1) {
		navRow.push({ text: 'Next ▶️', callback_data: `queue_${page + 1}` });
		navRow.push({ text: 'End ⏭️', callback_data: `queue_${posts.length - 1}` });
	}
	keyboard.row(...navRow);

	// Fast navigation row
	const fastNavRow = [];
	if (page >= 10) {
		fastNavRow.push({ text: '<< 10', callback_data: `queue_${page - 10}` });
	}
	if (page >= 5) {
		fastNavRow.push({ text: '<< 5', callback_data: `queue_${page - 5}` });
	}
	if (page <= posts.length - 6) {
		fastNavRow.push({ text: '5 >>', callback_data: `queue_${page + 5}` });
	}
	if (page <= posts.length - 11) {
		fastNavRow.push({ text: '10 >>', callback_data: `queue_${page + 10}` });
	}
	if (fastNavRow.length > 0) {
		keyboard.row(...fastNavRow);
	}

	// Admin: Add action buttons on new row
	if (isAdmin) {
		keyboard.row();
		keyboard.text('✏️ Đổi nội dung', `regen_${post.id}_${page}`);
		keyboard.text('🗑️ Xóa', `delask_${post.id}_${page}`);
	}

	// Check if video file exists
	if (!fs.existsSync(post.videoPath)) {
		const text =
			`[${page + 1}/${posts.length}] Video file missing!\n${time}` + tiktokLink;
		if (messageId) {
			try {
				await ctx.api.editMessageText(chatId, messageId, text, {
					reply_markup: keyboard,
				});
			} catch (e) {
				await ctx.reply(text, { reply_markup: keyboard });
			}
		} else {
			await ctx.reply(text, { reply_markup: keyboard });
		}
		return;
	}

	// Try editing content if messageId provided
	if (messageId) {
		try {
			let videoSource;
			if (post.telegramFileId) {
				videoSource = post.telegramFileId;
			} else {
				videoSource = new InputFile(post.videoPath);
			}

			await ctx.api.editMessageMedia(
				chatId,
				messageId,
				{
					type: 'video',
					media: videoSource,
					caption: caption,
					parse_mode: 'Markdown',
					supports_streaming: true,
				},
				{
					reply_markup: keyboard,
				}
			);
			return; // Edit success
		} catch (e) {
			console.log(
				'[Queue] Edit media failed, falling back to delete/send:',
				e.message
			);
			// Fallback to delete and send
			try {
				await ctx.api.deleteMessage(chatId, messageId);
			} catch (d) {
				/* ignore */
			}
		}
	}

	// Send new message (or fallback from failed edit)
	// Use cached file_id if available, otherwise upload from disk
	let videoSource;
	if (post.telegramFileId) {
		videoSource = post.telegramFileId;
	} else {
		videoSource = new InputFile(post.videoPath);
	}

	try {
		const sentMessage = await ctx.api.sendVideo(chatId, videoSource, {
			caption,
			reply_markup: keyboard,
			supports_streaming: true,
		});

		// Save file_id for future use if we uploaded from disk
		if (!post.telegramFileId && sentMessage.video?.file_id) {
			await updatePostFileId(post.id, sentMessage.video.file_id);
		}
	} catch (e) {
		console.error('[Queue] Error sending video:', e.message);
		await ctx.reply(`Error loading video: ${e.message.slice(0, 50)}...`);
	}
}

/**
 * Process video after successful download
 */
async function processVideoAfterDownload(ctx, video, videoPath, chatId) {
	try {
		// Track video
		await trackDownloadedVideo(
			video.file_id,
			chatId,
			videoPath,
			video.file_size || 0
		);

		// Generate random content
		const [content] = generateContentOptions();

		// Auto schedule
		const post = await addScheduledPost({
			chatId,
			videoPath,
			title: content.title,
			description: content.description,
			hashtags: content.hashtags,
			isRepost: false,
		});

		await scheduleUpload(post, new Date(post.scheduledAt));
		await updateVideoStatus(video.file_id, 'scheduled');

		const time = formatVietnameseTime(new Date(post.scheduledAt));
		console.log(`[Video] Scheduled: ${time}`);

		await ctx.reply(`Scheduled: ${time}`);
	} catch (error) {
		console.error('[Video] Process error:', error.message);
	}
}

/**
 * Setup video handler for the bot - fully automatic scheduling
 * @param {import('grammy').Bot} bot
 */
export function setupVideoHandler(bot) {
	// Admin user ID from env
	const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID || '0', 10);

	if (!ADMIN_USER_ID) {
		console.warn('[Config] WARNING: ADMIN_USER_ID not set in .env');
	}

	// Handle video messages - auto schedule without user input
	bot.on('message:video', async (ctx) => {
		const userId = ctx.from?.id;

		// Check authorization
		if (userId !== ADMIN_USER_ID) {
			await ctx.reply('You do not have permission to upload videos.');
			return;
		}

		const video = ctx.message.video;
		const chatId = ctx.chat.id;

		setDefaultChatId(chatId);

		// Check for duplicate
		if (await isVideoDuplicate(video.file_id)) {
			console.log(`[Video] Duplicate, skipping`);
			return;
		}

		const sizeMB = ((video.file_size || 0) / 1024 / 1024).toFixed(1);
		console.log(`[Video] Received: ${video.file_id.slice(-8)} (${sizeMB}MB)`);

		// Check file size (>20MB)
		if (video.file_size && video.file_size > 20 * 1024 * 1024) {
			console.log(`[Video] Too big: ${sizeMB}MB`);
			await ctx.reply('Video too big (>20MB), skipped.');
			return;
		}

		try {
			// Get file URL
			const file = await ctx.api.getFile(video.file_id);
			const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

			const videoDir = path.join(DATA_DIR, 'videos');
			if (!fs.existsSync(videoDir)) {
				fs.mkdirSync(videoDir, { recursive: true });
			}

			const fileName = `${Date.now()}_${video.file_id.slice(-8)}.mp4`;
			const videoPath = path.join(videoDir, fileName);

			// Try download with 30s timeout
			console.log('[Video] Downloading (30s timeout)...');
			const success = await downloadVideo(fileUrl, videoPath, 30000);

			if (!success) {
				// Queue for background retry
				console.log('[Video] Timeout, queuing for retry...');
				await ctx.reply('Download slow, retrying in background...');

				queueDownload({
					fileId: video.file_id,
					fileUrl,
					videoPath,
					chatId,
					onSuccess: async () => {
						await processVideoAfterDownload(ctx, video, videoPath, chatId);
					},
					onFail: async () => {
						console.log(
							`[Video] Failed after 3 retries: ${video.file_id.slice(-8)}`
						);
					},
				});
				return;
			}

			// Process immediately if download succeeded
			await processVideoAfterDownload(ctx, video, videoPath, chatId);
		} catch (error) {
			console.error('[Video] Error:', error.message);
			await ctx.reply(`Error: ${error.message.replace(/[^\x00-\x7F]/g, '')}`);
		}
	});

	bot.on('message:video_note', async (ctx) => {
		await ctx.reply('Round video not supported');
	});

	// Handle pagination and delete callbacks
	bot.on('callback_query:data', async (ctx) => {
		const data = ctx.callbackQuery.data;
		const chatId = ctx.chat.id;
		const userId = ctx.from?.id;
		const messageId = ctx.callbackQuery.message.message_id;
		const isAdmin = userId === ADMIN_USER_ID;
		const safeAnswer = async (text) => {
			try {
				await ctx.answerCallbackQuery(text);
			} catch (e) {
				// Ignore timeout errors
			}
		};

		// Handle pagination
		if (data.startsWith('queue_')) {
			const page = parseInt(data.replace('queue_', ''));
			await sendQueuePage(ctx, chatId, page, messageId, isAdmin);
			await safeAnswer();
			return;
		}

		// Handle delete confirmation request (admin only)
		if (data.startsWith('delask_') && isAdmin) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;

			// Show confirmation buttons
			const confirmKeyboard = new InlineKeyboard()
				.text('⚠️ Xác nhận XÓA', `delyes_${postId}_${currentPage}`)
				.text('❌ Hủy', `delno_${postId}_${currentPage}`);

			await safeAnswer('Bạn có chắc muốn xóa video này?');

			// Use safeEditMessage instead of delete+reply
			await safeEditMessage(
				ctx,
				'⚠️ **XÁC NHẬN XÓA VIDEO?**\n\nVideo sẽ bị xóa vĩnh viễn khỏi hệ thống và ổ cứng!',
				confirmKeyboard
			);
			return;
		}

		// Handle delete confirmed (admin only)
		if (data.startsWith('delyes_') && isAdmin) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;

			const result = await deleteScheduledPost(postId, chatId);
			if (result.success) {
				await safeAnswer(`Đã xóa! Đã reschedule ${result.rescheduled} video`);
				// Reuse message bubble -> pass messageId
				const newPage = Math.max(0, currentPage - 1);
				await sendQueuePage(ctx, chatId, newPage, messageId, isAdmin);
			} else {
				await safeAnswer('Lỗi: Không tìm thấy video');
			}
			return;
		}

		// Handle delete cancelled (admin only)
		if (data.startsWith('delno_') && isAdmin) {
			const parts = data.split('_');
			const currentPage = parseInt(parts[2]) || 0;

			await safeAnswer('Đã hủy xóa');

			// Return to queue view (restore video/caption)
			// Pass messageId to reuse the bubble
			await sendQueuePage(ctx, chatId, currentPage, messageId, isAdmin);
			return;
		}

		// Handle regenerate content - show category selection (admin only)
		if (data.startsWith('regen_') && isAdmin) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;
			const selectionKey = `${chatId}_${postId}`;

			// Initialize or get existing selections
			if (!categorySelections.has(selectionKey)) {
				categorySelections.set(selectionKey, {});
			}

			const selections = categorySelections.get(selectionKey);
			const keyboard = buildCategoryKeyboard(postId, currentPage, selections);

			// Use safeEditMessage
			await safeEditMessage(
				ctx,
				'📝 **CHỌN CATEGORY ĐỂ TẠO NỘI DUNG**\n\n' +
					'Chọn các category phù hợp với video:\n' +
					'✅ = đã chọn\n\n' +
					'Bấm **Xong** khi đã chọn đủ, hoặc **Random** để tạo ngẫu nhiên.',
				keyboard
			);
			await safeAnswer();
			return;
		}

		// Handle category selection - show options (admin only)
		if (data.startsWith('cat_') && isAdmin) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;
			const categoryIndex = parseInt(parts[3]);

			const categoryKey = getCategoryKeyByIndex(categoryIndex);
			if (!categoryKey) {
				await safeAnswer('Lỗi: Category không tồn tại');
				return;
			}

			const catName = getCategoryName(categoryKey);
			const selections = categorySelections.get(`${chatId}_${postId}`) || {};
			const selectedOpts = selections[categoryKey] || [];
			const keyboard = buildOptionsKeyboard(
				postId,
				currentPage,
				categoryKey,
				selectedOpts
			);

			await safeEditMessage(
				ctx,
				`📝 Chọn **${catName}** (bấm lại để bỏ chọn):`,
				keyboard
			);
			await safeAnswer();
			return;
		}

		// Handle option selection - save and return to categories (admin only)
		if (data.startsWith('opt_') && isAdmin) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;
			const categoryIndex = parseInt(parts[3]);
			const optionIndex = parseInt(parts[4]);

			const categoryKey = getCategoryKeyByIndex(categoryIndex);
			const optionKey = getOptionKeyByIndex(categoryKey, optionIndex);

			if (!categoryKey || !optionKey) {
				await safeAnswer('Lỗi: Option không tồn tại');
				return;
			}

			const selectionKey = `${chatId}_${postId}`;

			// Initialize or get existing selections
			if (!categorySelections.has(selectionKey)) {
				categorySelections.set(selectionKey, {});
			}
			const selections = categorySelections.get(selectionKey);

			// Initialize category array if needed
			if (!selections[categoryKey]) {
				selections[categoryKey] = [];
			}

			// Toggle selection
			const idx = selections[categoryKey].indexOf(optionKey);
			if (idx >= 0) {
				// Remove if exists
				selections[categoryKey].splice(idx, 1);
			} else {
				// Add if not exists
				selections[categoryKey].push(optionKey);
			}

			const optLabel = getOptionLabel(categoryKey, optionKey);
			const catName = getCategoryName(categoryKey);

			// Stay on options screen with updated checkmarks
			const keyboard = buildOptionsKeyboard(
				postId,
				currentPage,
				categoryKey,
				selections[categoryKey]
			);
			await safeEditMessage(
				ctx,
				`📝 Chọn **${catName}** (bấm lại để bỏ chọn):`,
				keyboard
			);
			await safeAnswer(
				idx >= 0 ? `Bỏ chọn: ${optLabel}` : `Đã chọn: ${optLabel}`
			);
			return;
		}

		// Handle back to categories (admin only)
		if (data.startsWith('back_') && isAdmin) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;
			const selectionKey = `${chatId}_${postId}`;

			const selections = categorySelections.get(selectionKey) || {};
			const keyboard = buildCategoryKeyboard(postId, currentPage, selections);
			const selectionsText = formatSelectionsDisplay(selections);

			await safeEditMessage(
				ctx,
				'📝 **CHỌN CATEGORY ĐỂ TẠO NỘI DUNG**\n\n' +
					selectionsText +
					'\n\n' +
					'Tiếp tục chọn hoặc bấm **Xong** để tạo nội dung.',
				keyboard
			);
			await safeAnswer();
			return;
		}

		// Handle done - generate content options for selection (admin only)
		if (data.startsWith('done_') && isAdmin) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;
			const selectionKey = `${chatId}_${postId}`;

			const selections = categorySelections.get(selectionKey) || {};

			// Generate 10 options (sorted by keyword match count)
			const optionCount = 10;
			let options;
			if (Object.keys(selections).length > 0) {
				options = generateContentFromCategories(selections, optionCount);
			} else {
				options = generateContentOptions(optionCount);
			}

			// Save generated options for selection
			generatedOptions.set(selectionKey, options);

			// Build message text
			let messageText = '📝 **CHỌN NỘI DUNG ƯNG Ý NHẤT**\n\n';
			options.forEach((opt, index) => {
				messageText += `${index + 1}. **${opt.title}**\n${opt.description}\n\n`;
			});
			messageText += '👇 Bấm số tương ứng để chọn:';

			// Build selection keyboard (based on actual options count)
			const keyboard = new InlineKeyboard();
			const actualCount = options.length;
			for (let i = 0; i < actualCount; i++) {
				keyboard.text(`${i + 1}`, `choose_${postId}_${currentPage}_${i}`);
				// 5 buttons per row
				if ((i + 1) % 5 === 0) keyboard.row();
			}

			// Navigation buttons
			keyboard.row();
			keyboard.text('⬅️', `back_${postId}_${currentPage}`);
			keyboard.text('🔀 Random mới', `choose_random_${postId}_${currentPage}`);
			keyboard.text('❌ Hủy', `cancel_${postId}_${currentPage}`);

			// Edit message
			// Edit message (caption safely)
			await safeEditMessage(ctx, messageText, keyboard);

			await safeAnswer();
			return;
		}

		// Handle option choice (admin only)
		if (
			data.startsWith('choose_') &&
			!data.startsWith('choose_random_') &&
			isAdmin
		) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;
			const choiceIndex = parseInt(parts[3]);
			const selectionKey = `${chatId}_${postId}`;

			const options = generatedOptions.get(selectionKey);
			if (!options || !options[choiceIndex]) {
				await safeAnswer('Lỗi: Option không tồn tại hoặc hết hạn');
				return;
			}

			const content = options[choiceIndex];

			// Update post in database using Prisma
			await prisma.scheduledPost.update({
				where: { id: postId },
				data: {
					title: content.title,
					description: content.description,
					hashtags: content.hashtags,
				},
			});

			// Cleanup
			categorySelections.delete(selectionKey);
			generatedOptions.delete(selectionKey);

			await safeAnswer(`Đã chọn: "${content.title.slice(0, 20)}..."`);
			await sendQueuePage(ctx, chatId, currentPage, messageId, isAdmin);
			return;
		}

		// Handle choose random (failed to load options or want fresh random)
		if (data.startsWith('choose_random_') && isAdmin) {
			const parts = data.split('_');
			const postId = parts[2];
			const currentPage = parseInt(parts[3]) || 0;
			const selectionKey = `${chatId}_${postId}`;

			// Generate random content
			const result = await updatePostContent(postId);

			// Cleanup
			categorySelections.delete(selectionKey);
			generatedOptions.delete(selectionKey);

			// Delete message and return to queue
			try {
				await ctx.api.deleteMessage(chatId, messageId);
			} catch (e) {
				// Ignore
			}

			if (result.success) {
				await safeAnswer(`Random: "${result.title.slice(0, 20)}..."`);
			} else {
				await safeAnswer('Lỗi: Không tìm thấy video');
			}
			await sendQueuePage(ctx, chatId, currentPage, null, isAdmin);
			return;
		}

		// Handle random - generate random content (admin only)
		if (data.startsWith('rand_') && isAdmin) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;
			const selectionKey = `${chatId}_${postId}`;

			// Generate random content
			const result = await updatePostContent(postId);

			// Cleanup
			categorySelections.delete(selectionKey);
			// map generatedOptions also needs cleanup if it exists? (unlikely here but safe)

			// Delete message and return to queue
			try {
				await ctx.api.deleteMessage(chatId, messageId);
			} catch (e) {
				// Ignore
			}

			if (result.success) {
				await safeAnswer(`Random: "${result.title.slice(0, 20)}..."`);
			} else {
				await safeAnswer('Lỗi: Không tìm thấy video');
			}
			await sendQueuePage(ctx, chatId, currentPage, null, isAdmin);
			return;
		}

		// Handle cancel - abort category selection (admin only)
		if (data.startsWith('cancel_') && isAdmin) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;
			const selectionKey = `${chatId}_${postId}`;

			// Cleanup
			categorySelections.delete(selectionKey);

			// Handle cancel - restore viewing state
			// Just call sendQueuePage will restore full view.
			// Since we act on the same message, we can just "go back".

			await safeAnswer('Đã hủy');
			await sendQueuePage(ctx, chatId, currentPage, null, isAdmin);
			return;
		}

		// Handle posted confirmation (from scheduler notification)
		if (data.startsWith('posted_')) {
			const postId = data.replace('posted_', '');

			await updatePostStatus(postId, 'posted');

			// Delete the notification message
			try {
				await ctx.api.deleteMessage(chatId, messageId);
			} catch (e) {
				// Ignore if can't delete
			}

			await safeAnswer('✅ Đã đánh dấu đã đăng!');
			return;
		}

		await safeAnswer();
	});

	// Handle commands
	bot.on('message:text', async (ctx) => {
		const text = ctx.message.text.trim();
		if (text.startsWith('/')) {
			await handleCommand(ctx, text);
		}
	});
}

/**
 * Handle commands (admin only except /start)
 */
async function handleCommand(ctx, command) {
	const chatId = ctx.chat.id;
	const userId = ctx.from?.id;
	const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID || '0', 10);
	const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME || '';
	const tiktokLink = TIKTOK_USERNAME
		? `\n\n🔥 Follow TikTok: https://tiktok.com/@${TIKTOK_USERNAME}`
		: '';

	setDefaultChatId(chatId);

	// ========== PUBLIC COMMANDS (GET data) ==========
	if (command === '/start') {
		await ctx.reply(
			`Bot auto-schedule TikTok videos\n\n` +
				`Forward video -> auto schedule\n` +
				`9 videos/day (9:30-10:30, 14:30-15:30, 20:30-21:30 GMT+7)\n\n` +
				`/queue /stats /reschedule` +
				tiktokLink
		);
		// Show queue after welcome message
		const isAdmin = userId === ADMIN_USER_ID;
		await sendQueuePage(ctx, chatId, 0, null, isAdmin);
		return;
	}

	if (command === '/queue') {
		const isAdmin = userId === ADMIN_USER_ID;
		await sendQueuePage(ctx, chatId, 0, null, isAdmin);
		return;
	}

	if (command === '/stats') {
		const stats = await getArchiveStats(chatId);
		const videoStats = await getVideoStats(chatId);
		await ctx.reply(
			`Stats:\n` +
				`Downloaded: ${videoStats?.total || 0}\n` +
				`Pending: ${videoStats?.scheduled || 0}\n` +
				`Posted: ${stats?.total || 0}` +
				tiktokLink
		);
		return;
	}

	if (command === '/videos') {
		const posts = await getPendingPostsByChat(chatId);
		if (!posts?.length) {
			await ctx.reply('Không có video nào trong lịch' + tiktokLink);
			return;
		}

		// Format schedule list: title - date - time
		const scheduleList = posts
			.slice(0, 30)
			.map((post, i) => {
				const date = new Date(post.scheduledAt);
				const gmt7 = new Date(date.getTime() + 7 * 60 * 60 * 1000);
				const day = gmt7.getUTCDate().toString().padStart(2, '0');
				const month = (gmt7.getUTCMonth() + 1).toString().padStart(2, '0');
				const hours = gmt7.getUTCHours().toString().padStart(2, '0');
				const mins = gmt7.getUTCMinutes().toString().padStart(2, '0');
				const titleShort =
					post.title.slice(0, 25) + (post.title.length > 25 ? '...' : '');
				return `${i + 1}. ${titleShort} - ${day}/${month} ${hours}:${mins}`;
			})
			.join('\n');

		const moreText =
			posts.length > 30 ? `\n\n... và ${posts.length - 30} video khác` : '';
		await ctx.reply(
			`📅 LỊCH ĐĂNG (${posts.length} video):\n\n${scheduleList}${moreText}` +
				tiktokLink
		);
		return;
	}

	// ========== ADMIN COMMANDS (UPDATE data) ==========
	if (userId !== ADMIN_USER_ID) {
		await ctx.reply('You do not have permission to use this command.');
		return;
	}

	if (command === '/reschedule') {
		await ctx.reply('Rescheduling all pending videos with new content...');
		const count = await rescheduleAllPending(chatId);
		await ctx.reply(
			`Done! Rescheduled ${count} videos:\n- New schedule (9/day)\n- New Vietnamese content`
		);
		return;
	}

	if (command === '/fix') {
		await ctx.reply('🔧 Đang kiểm tra và dọn dẹp dữ liệu...');
		const result = await cleanOrphanedPosts(chatId);
		if (result.deleted > 0) {
			await ctx.reply(
				`✅ Đã xóa ${result.deleted} record không có video file.\n` +
					`📅 Đã reschedule ${result.rescheduled} video còn lại.`
			);
		} else {
			await ctx.reply('✅ Không có record lỗi. Database đã clean!');
		}
		return;
	}

	if (command === '/repost') {
		await ctx.reply('Checking for repost...');
		await triggerRepostCheck();
		return;
	}
}
