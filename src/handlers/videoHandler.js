import fs from 'fs';
import path from 'path';
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
	// Handle video messages - auto schedule without user input
	bot.on('message:video', async (ctx) => {
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

	// Handle commands
	bot.on('message:text', async (ctx) => {
		const text = ctx.message.text.trim();
		if (text.startsWith('/')) {
			await handleCommand(ctx, text);
		}
	});
}

/**
 * Handle commands
 */
async function handleCommand(ctx, command) {
	const chatId = ctx.chat.id;
	setDefaultChatId(chatId);

	if (command === '/start') {
		await ctx.reply(
			`Bot auto-schedule TikTok videos\n\n` +
				`Forward video -> auto schedule\n` +
				`9 videos/day (9:30-10:30, 14:30-15:30, 20:30-21:30 GMT+7)\n\n` +
				`/queue /stats /reschedule`
		);
		return;
	}

	if (command === '/reschedule') {
		await ctx.reply('Rescheduling all pending videos...');
		const count = rescheduleAllPending(chatId);
		await ctx.reply(
			`Done! Rescheduled ${count} videos with new schedule (9/day)`
		);
		return;
	}

	if (command === '/queue') {
		const posts = getPendingPostsByChat(chatId);
		if (posts.length === 0) {
			await ctx.reply('No pending videos');
			return;
		}

		let msg = `${posts.length} pending:\n\n`;
		posts.slice(0, 10).forEach((p, i) => {
			const time = formatVietnameseTime(new Date(p.scheduledAt));
			msg += `${i + 1}. ${time}\n`;
		});

		if (posts.length > 10) {
			msg += `\n+${posts.length - 10} more...`;
		}

		await ctx.reply(msg);
		return;
	}

	if (command === '/stats') {
		const stats = getArchiveStats(chatId);
		const videoStats = getVideoStats(chatId);
		await ctx.reply(
			`Stats:\n` +
				`Downloaded: ${videoStats?.total || 0}\n` +
				`Pending: ${videoStats?.scheduled || 0}\n` +
				`Posted: ${stats?.total || 0}`
		);
		return;
	}

	if (command === '/repost') {
		await ctx.reply('Checking for repost...');
		await triggerRepostCheck();
		return;
	}

	if (command === '/videos') {
		const videos = getDownloadedVideos(chatId);
		if (!videos?.length) {
			await ctx.reply('No videos yet');
			return;
		}
		await ctx.reply(`${videos.length} videos downloaded`);
		return;
	}
}
