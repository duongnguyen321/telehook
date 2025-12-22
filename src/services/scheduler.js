import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import cron from 'node-cron';
import fs from 'fs';
import {
	getDuePosts,
	updatePostStatus,
	needsRepost,
	scheduleReposts,
	getPendingCount,
} from '../utils/storage.js';

let bot = null;
let defaultChatId = null;

const QUEUE_NAME = 'tiktok-notify';

// Redis connection
const connection = new IORedis({
	host: process.env.REDIS_HOST || 'localhost',
	port: parseInt(process.env.REDIS_PORT || '6379'),
	maxRetriesPerRequest: null,
});

// Create queue
const notifyQueue = new Queue(QUEUE_NAME, { connection });

/**
 * Set the bot instance for notifications
 * @param {import('grammy').Bot} botInstance
 */
export function setBot(botInstance) {
	bot = botInstance;
}

/**
 * Set default chat ID for repost notifications
 * @param {number} chatId
 */
export function setDefaultChatId(chatId) {
	defaultChatId = chatId;
}

/**
 * Add notification job to queue
 * @param {Object} post
 * @param {Date} scheduledAt
 */
export async function scheduleUpload(post, scheduledAt) {
	const delay = scheduledAt.getTime() - Date.now();

	await notifyQueue.add(
		'notify',
		{ postId: post.id, ...post },
		{
			delay: Math.max(0, delay),
			removeOnComplete: true,
			removeOnFail: false,
		}
	);

	console.log(
		`[Queue] Scheduled notification for post ${
			post.id
		} at ${scheduledAt.toLocaleString()}`
	);
}

/**
 * Process notification job - sends video + metadata to user for manual posting
 */
async function processNotification(job) {
	const { postId, chatId, videoPath, title, description, hashtags, isRepost } =
		job.data;

	const repostLabel = isRepost ? ' (đăng lại)' : '';
	console.log(
		`[Worker] Processing notification for post ${postId}: "${title}"${repostLabel}`
	);

	try {
		if (!bot) {
			throw new Error('Bot not initialized');
		}

		// Check if video file exists
		if (!fs.existsSync(videoPath)) {
			throw new Error(`Video file not found: ${videoPath}`);
		}

		// Format caption for easy copy-paste
		const fullCaption = `${title}\n\n${description}\n\n${hashtags}`;

		// Send notification message
		await bot.api.sendMessage(
			chatId,
			`🔔 **ĐẾN GIỜ ĐĂNG VIDEO!**${repostLabel}\n\n` +
				`📌 **Tiêu đề:**\n\`${title}\`\n\n` +
				`📝 **Mô tả:**\n\`${description}\`\n\n` +
				`#️⃣ **Hashtags:**\n\`${hashtags}\`\n\n` +
				`📋 **Caption đầy đủ (copy để paste):**`,
			{ parse_mode: 'Markdown' }
		);

		// Send copyable caption
		await bot.api.sendMessage(chatId, fullCaption);

		// Send video file
		await bot.api.sendVideo(chatId, fs.createReadStream(videoPath), {
			caption: '👆 Video để đăng lên TikTok. Tải về và đăng thủ công.',
			supports_streaming: true,
		});

		// Send confirmation buttons
		await bot.api.sendMessage(
			chatId,
			`✅ Sau khi đăng xong, reply \`/done ${postId.slice(
				0,
				8
			)}\` để đánh dấu hoàn thành.\n` +
				`❌ Hoặc reply \`/skip ${postId.slice(0, 8)}\` để bỏ qua video này.`,
			{ parse_mode: 'Markdown' }
		);

		// Mark as "notified" (we'll add a new status later, for now mark as posted)
		updatePostStatus(postId, 'posted');
		console.log(`[Worker] Notification sent for: ${postId}`);

		return { success: true, postId };
	} catch (error) {
		console.error(`[Worker] Failed to notify for ${postId}:`, error.message);
		updatePostStatus(postId, 'failed', error.message);

		if (bot) {
			await bot.api.sendMessage(
				chatId,
				`❌ Lỗi khi gửi thông báo!\n\n` +
					`📌 Video: ${title}\n` +
					`❗ Lỗi: ${error.message}`
			);
		}

		throw error;
	}
}

/**
 * Check and schedule reposts if needed
 */
async function checkAndScheduleReposts() {
	if (!defaultChatId) {
		console.log('[Repost] No default chat ID set, skipping repost check');
		return;
	}

	const pendingCount = getPendingCount();
	console.log(`[Repost] Checking... Pending posts: ${pendingCount}`);

	if (needsRepost(defaultChatId)) {
		console.log(
			'[Repost] No videos scheduled for tomorrow, scheduling reposts...'
		);
		const scheduled = scheduleReposts(defaultChatId);

		if (scheduled.length > 0 && bot) {
			// Schedule the notification jobs
			for (const post of scheduled) {
				await scheduleUpload(post, new Date(post.scheduledAt));
			}

			// Notify user
			await bot.api.sendMessage(
				defaultChatId,
				`📢 Không có video mới, đã lên lịch đăng lại ${scheduled.length} video cũ:\n\n` +
					scheduled.map((p, i) => `${i + 1}. "${p.title}"`).join('\n')
			);
		}
	}
}

/**
 * Start the worker to process notification jobs
 */
export function startWorker() {
	console.log('[Worker] Starting TikTok notification worker');

	const worker = new Worker(QUEUE_NAME, processNotification, { connection });

	worker.on('completed', (job) => {
		console.log(`[Worker] Job ${job.id} completed`);
	});

	worker.on('failed', (job, err) => {
		console.error(`[Worker] Job ${job?.id} failed:`, err.message);
	});

	// Daily repost check at 8:00 AM
	console.log('[Scheduler] Setting up daily repost check at 8:00 AM');
	cron.schedule('0 8 * * *', () => {
		console.log('[Scheduler] Running daily repost check...');
		checkAndScheduleReposts().catch(console.error);
	});

	// Also check every 6 hours in case bot was restarted
	cron.schedule('0 */6 * * *', () => {
		console.log('[Scheduler] Running periodic repost check...');
		checkAndScheduleReposts().catch(console.error);
	});

	return worker;
}

/**
 * Get queue stats
 */
export async function getQueueStats() {
	const waiting = await notifyQueue.getWaitingCount();
	const delayed = await notifyQueue.getDelayedCount();
	const active = await notifyQueue.getActiveCount();

	return { waiting, delayed, active, total: waiting + delayed + active };
}

/**
 * Manually trigger repost check
 */
export async function triggerRepostCheck() {
	await checkAndScheduleReposts();
}

export { notifyQueue as uploadQueue };
