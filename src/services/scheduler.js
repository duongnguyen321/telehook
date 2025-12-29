import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { InputFile, InlineKeyboard } from 'grammy';
import {
	getDuePosts,
	updatePostStatus,
	markNotificationSent,
	needsRepost,
	scheduleReposts,
	getPendingCount,
	DATA_DIR,
	updatePostFileId,
} from '../utils/storage.js';
import { getNotificationRecipients } from './roleService.js';
import { isS3Enabled, downloadVideo as s3DownloadVideo } from '../utils/s3.js';

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
 * Process a single post - sends video WITH metadata + download link to ALL admin/mod/reviewers for manual posting
 * @param {Object} post
 */
async function processNotification(post) {
	const {
		id: postId,
		chatId,
		videoPath,
		title,
		hashtags,
		isRepost,
		telegramFileId,
	} = post;
	const repostLabel = isRepost ? ' [REPOST]' : '';

	console.log(`[Scheduler] Processing: ${postId.slice(0, 8)}`);

	try {
		if (!bot) {
			throw new Error('Bot not initialized');
		}

		// Always use stream API endpoint - S3 direct URLs may be blocked
		const baseUrl = process.env.BASE_URL || 'http://localhost:8888';
		const downloadUrl = `${baseUrl}/api/videos/${postId}/stream`;

		// Caption for the video (Telegram caption limit: 1024 chars)
		const caption =
			`⏰ **STATUS${repostLabel}** - ${new Date().toLocaleTimeString(
				'vi-VN'
			)}\n\n` +
			`🎥 **${title}**\n\n` +
			`${hashtags}\n\n` +
			`📥 [Click để tải gốc (HD)](${downloadUrl})`;

		const keyboard = new InlineKeyboard()
			.url('📥 Tải Video Gốc (Full HD)', downloadUrl)
			.row()
			.text('✅ Đã đăng TikTok', `posted_${postId}`)
			.text('❌ Huỷ đăng', `cancelpost_${postId}`);

		// Get all recipients (admin, reviewers, mods)
		const recipients = getNotificationRecipients();

		if (recipients.length === 0) {
			console.log(
				'[Scheduler] No recipients configured, using original chatId'
			);
			recipients.push(chatId);
		}

		console.log(`[Scheduler] Sending to ${recipients.length} recipient(s)`);

		// Prepare video source with priority: file_id > local > S3
		const videoKey = path.basename(videoPath);
		const localPath = path.join(DATA_DIR, 'videos', videoKey);
		let videoSource = null;
		let needsFileIdSave = false;

		if (telegramFileId) {
			// Priority 1: Use cached Telegram file_id (instant)
			console.log(`[Scheduler] Using cached file_id: ${videoKey}`);
			videoSource = telegramFileId;
		} else if (fs.existsSync(localPath)) {
			// Priority 2: Use local file
			console.log(`[Scheduler] Using local file: ${videoKey}`);
			videoSource = new InputFile(localPath);
			needsFileIdSave = true;
		} else if (isS3Enabled()) {
			// Priority 3: Download from S3
			console.log(`[Scheduler] Downloading from S3: ${videoKey}`);
			const cacheDir = path.join(DATA_DIR, 'videos');
			const videoBuffer = await s3DownloadVideo(videoKey, cacheDir);
			if (videoBuffer) {
				videoSource = new InputFile(videoBuffer, videoKey);
				needsFileIdSave = true;
			}
		}

		// Fallback to text-only message if video not found
		if (!videoSource) {
			console.log(`[Scheduler] Video file not found, sending text-only`);
			for (const recipientId of recipients) {
				try {
					await bot.api.sendMessage(
						recipientId,
						caption + `\n\n⚠️ _Video file không tìm thấy_`,
						{
							parse_mode: 'Markdown',
							reply_markup: keyboard,
							link_preview_options: { is_disabled: true },
						}
					);
				} catch (sendError) {
					console.error(
						`[Scheduler] Failed to send to ${recipientId}:`,
						sendError.message
					);
				}
			}
		} else {
			// Send video to all recipients
			for (const recipientId of recipients) {
				try {
					const sentMessage = await bot.api.sendVideo(
						recipientId,
						videoSource,
						{
							caption,
							parse_mode: 'Markdown',
							reply_markup: keyboard,
							supports_streaming: true,
						}
					);

					// Save file_id for future use (only from first recipient)
					if (needsFileIdSave && sentMessage.video?.file_id) {
						await updatePostFileId(postId, sentMessage.video.file_id);
						console.log(`[Scheduler] Cached file_id for: ${videoKey}`);
						needsFileIdSave = false; // Only save once
					}

					console.log(`[Scheduler] Sent video to recipient: ${recipientId}`);
				} catch (sendError) {
					console.error(
						`[Scheduler] Failed to send to ${recipientId}:`,
						sendError.message
					);
				}
			}
		}

		// Mark notification as sent BEFORE logging success
		await markNotificationSent(postId);

		console.log(`[Scheduler] Notification complete: ${postId.slice(0, 8)}`);
		return { success: true, postId };
	} catch (error) {
		console.error(`[Scheduler] Failed ${postId.slice(0, 8)}:`, error.message);
		await updatePostStatus(postId, 'failed', error.message);

		// Send error to all recipients
		const recipients = getNotificationRecipients();
		if (bot && recipients.length > 0) {
			for (const recipientId of recipients) {
				try {
					await bot.api.sendMessage(
						recipientId,
						`❌ Lỗi đăng video!\nPost ID: ${postId.slice(
							0,
							8
						)}\nLỗi: ${error.message
							.replace(/[^\x00-\x7F]/g, '')
							.slice(0, 100)}`
					);
				} catch (e) {
					// Ignore individual send failures
				}
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
		const duePosts = await getDuePosts();

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

	const pendingCount = await getPendingCount();
	console.log(`[Repost] Checking... Pending posts: ${pendingCount}`);

	if (await needsRepost(defaultChatId)) {
		console.log(
			'[Repost] No videos scheduled for tomorrow, scheduling reposts...'
		);
		const scheduled = await scheduleReposts(defaultChatId);

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

	let minuteCounter = 0;

	// Check for due posts every minute
	console.log('[Scheduler] Setting up every-minute check for due posts');
	cron.schedule('* * * * *', () => {
		minuteCounter++;

		// Log heartbeat every 5 minutes
		if (minuteCounter % 5 === 0) {
			console.log(
				`[Scheduler] ❤️ Heartbeat: ${minuteCounter} minutes running, checking at ${new Date().toISOString()}`
			);
		}

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
	const pendingCount = await getPendingCount();
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
