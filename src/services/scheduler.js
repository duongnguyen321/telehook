import cron from 'node-cron';
import fs from 'fs';
import {
	getDuePosts,
	updatePostStatus,
	markNotificationSent,
	needsRepost,
	scheduleReposts,
	getPendingCount,
	getPostById,
} from '../utils/storage.js';

let bot = null;
let defaultChatId = null;

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
 * Process a single post - sends video + metadata to user for manual posting
 * @param {Object} post
 */
async function processNotification(post) {
	const {
		id: postId,
		chatId,
		videoPath,
		title,
		description,
		hashtags,
		isRepost,
	} = post;
	const repostLabel = isRepost ? ' [REPOST]' : '';

	console.log(`[Scheduler] Processing: ${postId.slice(0, 8)}`);

	try {
		if (!bot) {
			throw new Error('Bot not initialized');
		}

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

		// Mark notification as sent BEFORE logging success
		markNotificationSent(postId);

		console.log(`[Scheduler] Sent notification: ${postId.slice(0, 8)}`);
		return { success: true, postId };
	} catch (error) {
		console.error(`[Scheduler] Failed ${postId.slice(0, 8)}:`, error.message);
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
				console.error('[Scheduler] Failed to send error msg:', e.message);
			}
		}

		throw error;
	}
}

/**
 * Check for due posts and process them
 * This runs every minute via cron
 */
async function checkAndProcessDuePosts() {
	try {
		const duePosts = getDuePosts();

		if (duePosts.length === 0) {
			return;
		}

		console.log(`[Scheduler] Found ${duePosts.length} due post(s) to process`);

		for (const post of duePosts) {
			try {
				await processNotification(post);
			} catch (error) {
				// Error already logged in processNotification
				// Continue with next post
			}
		}
	} catch (error) {
		console.error('[Scheduler] Error checking due posts:', error.message);
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
 * Schedule a post for notification (no-op now, just logs)
 * Posts are picked up by the cron job when their time comes
 * @param {Object} post
 * @param {Date} scheduledAt
 */
export async function scheduleUpload(post, scheduledAt) {
	console.log(
		`[Scheduler] Post ${post.id.slice(
			0,
			8
		)} scheduled for ${scheduledAt.toLocaleString()}`
	);
	// No need to do anything - cron will pick it up when due
}

/**
 * Start the scheduler - uses cron to check every minute for due posts
 */
export function startWorker() {
	console.log('[Scheduler] Starting TikTok notification scheduler');

	// Check for due posts every minute
	console.log('[Scheduler] Setting up every-minute check for due posts');
	cron.schedule('* * * * *', () => {
		checkAndProcessDuePosts().catch(console.error);
	});

	// Also run immediately on startup to catch any missed posts
	console.log('[Scheduler] Running initial check for due posts...');
	setTimeout(() => {
		checkAndProcessDuePosts().catch(console.error);
	}, 2000); // Wait 2s for bot to be ready

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

	console.log('[Scheduler] All cron jobs scheduled successfully');
	return null; // No worker to return
}

/**
 * Get scheduler stats (simplified - just counts from database)
 */
export async function getQueueStats() {
	const pendingCount = getPendingCount();
	return { waiting: 0, delayed: pendingCount, active: 0, total: pendingCount };
}

/**
 * Manually trigger repost check
 */
export async function triggerRepostCheck() {
	await checkAndScheduleReposts();
}

/**
 * Manually trigger due post check
 */
export async function triggerDuePostCheck() {
	await checkAndProcessDuePosts();
}

// Export for compatibility (no-op queue)
export const uploadQueue = null;
