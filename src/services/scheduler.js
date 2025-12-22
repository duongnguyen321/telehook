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
	getPostById,
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

	// Only store postId and chatId - fetch fresh data when processing
	await notifyQueue.add(
		'notify',
		{ postId: post.id, chatId: post.chatId },
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
	const { postId, chatId } = job.data;

	console.log(`[Worker] Processing: ${postId.slice(0, 8)}`);

	try {
		if (!bot) {
			throw new Error('Bot not initialized');
		}

		// Get fresh data from database (in case content was updated)
		const post = getPostById(postId);
		if (!post) {
			throw new Error(`Post not found: ${postId}`);
		}

		const { videoPath, title, description, hashtags, isRepost } = post;
		const repostLabel = isRepost ? ' [REPOST]' : '';

		// Check if video file exists
		if (!fs.existsSync(videoPath)) {
			throw new Error(`Video file not found: ${videoPath}`);
		}

		// Format caption for TikTok (title + desc + hashtags)
		const tiktokCaption = `${title}\n\n${description}\n\n${hashtags}`;

		// Send video with full caption and confirm button
		const { InputFile, InlineKeyboard } = await import('grammy');

		const keyboard = new InlineKeyboard().text(
			'✅ Đã đăng TikTok',
			`posted_${postId}`
		);

		await bot.api.sendVideo(chatId, new InputFile(videoPath), {
			caption: `🔔 ĐẾN GIỜ ĐĂNG${repostLabel}\n\n${tiktokCaption}`,
			supports_streaming: true,
			reply_markup: keyboard,
		});

		// Note: Don't mark as posted yet - wait for user confirmation
		console.log(`[Worker] Sent notification: ${postId.slice(0, 8)}`);

		return { success: true, postId };
	} catch (error) {
		console.error(`[Worker] Failed ${postId.slice(0, 8)}:`, error.message);
		updatePostStatus(postId, 'failed', error.message);

		if (bot) {
			try {
				await bot.api.sendMessage(
					chatId,
					`❌ Lỗi đăng video!\nPost ID: ${postId.slice(
						0,
						8
					)}\nLỗi: ${error.message.replace(/[^\x00-\x7F]/g, '').slice(0, 100)}`
				);
			} catch (e) {
				console.error('[Worker] Failed to send error msg:', e.message);
			}
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
