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
 */
async function sendQueuePage(ctx, chatId, page, messageId = null) {
	const { InputFile } = await import('grammy');
	const posts = getPendingPostsByChat(chatId);

	if (posts.length === 0) {
		const text = 'No pending videos';
		if (messageId) {
			await ctx.api.editMessageText(chatId, messageId, text);
		} else {
			await ctx.reply(text);
		}
		return;
	}

	const post = posts[page];
	if (!post) {
		await sendQueuePage(ctx, chatId, 0, messageId);
		return;
	}

	const time = formatVietnameseTime(new Date(post.scheduledAt));
	const caption =
		`[${page + 1}/${posts.length}] ${time}\n\n` +
		`${post.title}\n\n` +
		`${post.description}\n\n` +
		`${post.hashtags}`;

	// Build keyboard
	const keyboard = new InlineKeyboard();
	if (page > 0) {
		keyboard.text('<< Prev', `queue_${page - 1}`);
	}
	if (page < posts.length - 1) {
		keyboard.text('Next >>', `queue_${page + 1}`);
	}

	// Check if video file exists
	if (!fs.existsSync(post.videoPath)) {
		const text = `[${page + 1}/${posts.length}] Video file missing!\n${time}`;
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

	// Handle pagination callbacks
	bot.on('callback_query:data', async (ctx) => {
		const data = ctx.callbackQuery.data;
		if (data.startsWith('queue_')) {
			const page = parseInt(data.replace('queue_', ''));
			const chatId = ctx.chat.id;
			const messageId = ctx.callbackQuery.message.message_id;
			await sendQueuePage(ctx, chatId, page, messageId);
			await ctx.answerCallbackQuery();
		}
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
		await sendQueuePage(ctx, chatId, 0);
		return;
	}

	if (command === '/queue') {
		await sendQueuePage(ctx, chatId, 0);
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
		const videos = getDownloadedVideos(chatId);
		if (!videos?.length) {
			await ctx.reply('No videos yet' + tiktokLink);
			return;
		}
		await ctx.reply(`${videos.length} videos downloaded` + tiktokLink);
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
