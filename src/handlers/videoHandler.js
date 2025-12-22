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
	getDownloadedVideos,
	getVideoStats,
	rescheduleAllPending,
	deleteScheduledPost,
	updatePostContent,
	DATA_DIR,
} from '../utils/storage.js';
import { formatVietnameseTime } from '../utils/timeParser.js';
import {
	scheduleUpload,
	setDefaultChatId,
	triggerRepostCheck,
} from '../services/scheduler.js';
import { generateContentOptions } from '../services/ai.js';
import { downloadVideo, queueDownload } from '../utils/downloader.js';

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
	const posts = getPendingPostsByChat(chatId);
	const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME || '';
	const tiktokLink = TIKTOK_USERNAME
		? `\n\n🔥 Follow: https://tiktok.com/@${TIKTOK_USERNAME}`
		: '';

	if (posts.length === 0) {
		const text = 'No pending videos' + tiktokLink;
		if (messageId) {
			await ctx.api.editMessageText(chatId, messageId, text);
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
	if (page > 0) {
		keyboard.text('<< Prev', `queue_${page - 1}`);
	}
	if (page < posts.length - 1) {
		keyboard.text('Next >>', `queue_${page + 1}`);
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
			await ctx.api.editMessageText(chatId, messageId, text, {
				reply_markup: keyboard,
			});
		} else {
			await ctx.reply(text, { reply_markup: keyboard });
		}
		return;
	}

	// For pagination, we need to delete old message and send new video
	// because you can't edit a text message to become a video
	if (messageId) {
		try {
			await ctx.api.deleteMessage(chatId, messageId);
		} catch (e) {
			// Ignore delete error
		}
	}

	await ctx.api.sendVideo(chatId, new InputFile(post.videoPath), {
		caption,
		reply_markup: keyboard,
		supports_streaming: true,
	});
}

/**
 * Process video after successful download
 */
async function processVideoAfterDownload(ctx, video, videoPath, chatId) {
	try {
		// Track video
		trackDownloadedVideo(
			video.file_id,
			chatId,
			videoPath,
			video.file_size || 0
		);

		// Generate random content
		const [content] = generateContentOptions();

		// Auto schedule
		const post = addScheduledPost({
			chatId,
			videoPath,
			title: content.title,
			description: content.description,
			hashtags: content.hashtags,
			isRepost: false,
		});

		await scheduleUpload(post, new Date(post.scheduledAt));
		updateVideoStatus(video.file_id, 'scheduled');

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
		if (isVideoDuplicate(video.file_id)) {
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

		// Handle pagination
		if (data.startsWith('queue_')) {
			const page = parseInt(data.replace('queue_', ''));
			await sendQueuePage(ctx, chatId, page, messageId, isAdmin);
			await ctx.answerCallbackQuery();
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

			await ctx.answerCallbackQuery('Bạn có chắc muốn xóa video này?');

			// Delete old message and send confirmation
			try {
				await ctx.api.deleteMessage(chatId, messageId);
			} catch (e) {
				// Ignore
			}

			await ctx.reply(
				'⚠️ XÁC NHẬN XÓA VIDEO?\n\nVideo sẽ bị xóa vĩnh viễn khỏi hệ thống và ổ cứng!',
				{ reply_markup: confirmKeyboard }
			);
			return;
		}

		// Handle delete confirmed (admin only)
		if (data.startsWith('delyes_') && isAdmin) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;

			const result = deleteScheduledPost(postId, chatId);
			if (result.success) {
				await ctx.answerCallbackQuery(
					`Đã xóa! Đã reschedule ${result.rescheduled} video`
				);
				// Delete confirmation message
				try {
					await ctx.api.deleteMessage(chatId, messageId);
				} catch (e) {
					// Ignore
				}
				// Show previous page or first page
				const newPage = Math.max(0, currentPage - 1);
				await sendQueuePage(ctx, chatId, newPage, null, isAdmin);
			} else {
				await ctx.answerCallbackQuery('Lỗi: Không tìm thấy video');
			}
			return;
		}

		// Handle delete cancelled (admin only)
		if (data.startsWith('delno_') && isAdmin) {
			const parts = data.split('_');
			const currentPage = parseInt(parts[2]) || 0;

			await ctx.answerCallbackQuery('Đã hủy xóa');

			// Delete confirmation message and return to queue
			try {
				await ctx.api.deleteMessage(chatId, messageId);
			} catch (e) {
				// Ignore
			}
			await sendQueuePage(ctx, chatId, currentPage, null, isAdmin);
			return;
		}

		// Handle regenerate content (admin only)
		if (data.startsWith('regen_') && isAdmin) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;

			const result = updatePostContent(postId);
			if (result.success) {
				await ctx.answerCallbackQuery('Đã đổi nội dung mới!');
				// Refresh current page to show new content
				await sendQueuePage(ctx, chatId, currentPage, messageId, isAdmin);
			} else {
				await ctx.answerCallbackQuery('Lỗi: Không tìm thấy video');
			}
			return;
		}

		// Handle posted confirmation (from scheduler notification)
		if (data.startsWith('posted_')) {
			const postId = data.replace('posted_', '');

			updatePostStatus(postId, 'posted');

			// Edit message to remove the button and show confirmation
			try {
				await ctx.editMessageReplyMarkup({ reply_markup: undefined });
			} catch (e) {
				// Ignore if can't edit
			}

			await ctx.answerCallbackQuery('✅ Đã đánh dấu đã đăng!');
			return;
		}

		await ctx.answerCallbackQuery();
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
		const stats = getArchiveStats(chatId);
		const videoStats = getVideoStats(chatId);
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
		const posts = getPendingPostsByChat(chatId);
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
		const count = rescheduleAllPending(chatId);
		await ctx.reply(
			`Done! Rescheduled ${count} videos:\n- New schedule (9/day)\n- New Vietnamese content`
		);
		return;
	}

	if (command === '/repost') {
		await ctx.reply('Checking for repost...');
		await triggerRepostCheck();
		return;
	}
}
