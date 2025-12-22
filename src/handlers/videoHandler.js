import fs from 'fs';
import path from 'path';
import axios from 'axios';
import {
	addScheduledPost,
	getPendingPostsByChat,
	getArchiveStats,
	isVideoDuplicate,
	trackDownloadedVideo,
	updateVideoStatus,
	getDownloadedVideos,
	getVideoStats,
	DATA_DIR,
} from '../utils/storage.js';
import { formatVietnameseTime } from '../utils/timeParser.js';
import {
	scheduleUpload,
	setDefaultChatId,
	triggerRepostCheck,
} from '../services/scheduler.js';
import { generateContentOptions } from '../services/ai.js';

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
			console.log(`[Video] Duplicate, skipping: ${video.file_id}`);
			return; // Silent skip
		}

		console.log(`[Video] Received: ${video.file_id.slice(-8)}`);

		try {
			// Download video
			const file = await ctx.api.getFile(video.file_id);
			const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

			const videoDir = path.join(DATA_DIR, 'videos');
			if (!fs.existsSync(videoDir)) {
				fs.mkdirSync(videoDir, { recursive: true });
			}

			const fileName = `${Date.now()}_${video.file_id.slice(-8)}.mp4`;
			const videoPath = path.join(videoDir, fileName);

			const response = await axios.get(fileUrl, {
				responseType: 'arraybuffer',
			});
			fs.writeFileSync(videoPath, response.data);

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

			// Notify user (batch summary)
			await ctx.reply(`✅ ${content.title.slice(0, 30)}...\n⏰ ${time}`);
		} catch (error) {
			console.error('[Video] Error:', error.message);
			await ctx.reply(`❌ Lỗi: ${error.message}`);
		}
	});

	bot.on('message:video_note', async (ctx) => {
		await ctx.reply('⚠️ Video tròn không hỗ trợ');
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
			`📹 Bot tự động đăng video TikTok\n\n` +
				`▸ Forward video → tự động lên lịch\n` +
				`▸ Tối đa 3 video/ngày (10h, 15h, 21h)\n` +
				`▸ Thừa → đẩy sang ngày sau\n` +
				`▸ Hết video mới → đăng lại video cũ\n\n` +
				`/queue /stats /repost /clear`
		);
		return;
	}

	if (command === '/queue') {
		const posts = getPendingPostsByChat(chatId);
		if (posts.length === 0) {
			await ctx.reply('📭 Không có video chờ');
			return;
		}

		let msg = `📋 ${posts.length} video chờ:\n\n`;
		posts.slice(0, 10).forEach((p, i) => {
			const time = formatVietnameseTime(new Date(p.scheduledAt));
			msg += `${i + 1}. ${time}\n   ${p.title.slice(0, 25)}...\n`;
		});

		if (posts.length > 10) {
			msg += `\n+${posts.length - 10} video nữa...`;
		}

		await ctx.reply(msg);
		return;
	}

	if (command === '/stats') {
		const stats = getArchiveStats(chatId);
		const videoStats = getVideoStats(chatId);
		await ctx.reply(
			`📊 Thống kê:\n` +
				`📥 Đã tải: ${videoStats?.total || 0}\n` +
				`📅 Đang chờ: ${videoStats?.scheduled || 0}\n` +
				`✅ Đã đăng: ${stats?.total || 0}\n` +
				`👀 Views: ${stats?.totalViews || 0}`
		);
		return;
	}

	if (command === '/repost') {
		await ctx.reply('🔄 Đang kiểm tra video cũ...');
		await triggerRepostCheck();
		return;
	}

	if (command === '/videos') {
		const videos = getDownloadedVideos(chatId);
		if (!videos?.length) {
			await ctx.reply('📭 Chưa có video');
			return;
		}
		await ctx.reply(`📹 ${videos.length} video đã tải`);
		return;
	}

	if (command === '/clear') {
		await ctx.reply('⚠️ Dùng /clearconfirm để xóa tất cả');
		return;
	}
}
