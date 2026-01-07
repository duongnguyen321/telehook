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
	saveNotificationMessageIds,
	clearNotificationMessageIds,
	getRawPostById,
	rescheduleToEnd,
	getUnnotifiedPosts,
	markChannelNotified,
	updateChannelMessageIds,
	clearChannelMessageIds,
} from '../utils/storage.js';
import { prisma } from '../utils/prisma.js';
import { getNotificationRecipients, getUserRole } from './roleService.js';
import {
	isS3Enabled,
	downloadVideo as s3DownloadVideo,
	isCdnEnabled,
	getCdnUrl,
} from '../utils/s3.js';

let bot = null;
let defaultChatId = null;

/**
 * Check for posts that have been posted/cancelled and notify channels
 */
/**
 * Send notification (video) to all active channels for a post
 * @param {Object} post
 */
export async function sendChannelNotification(post) {
	if (!bot) return;

	// Get active channels
	const channels = await prisma.telegramChannel.findMany({
		where: { isActive: true },
	});

	if (channels.length === 0) return;

	const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME || '';
	const BASE_URL = process.env.BASE_URL || 'http://localhost:8888';
	const fullLink = `${BASE_URL}/`;

	const tiktokLink = TIKTOK_USERNAME
		? `\n\n🔥 Follow: https://tiktok.com/@${TIKTOK_USERNAME}`
		: '';

	const isPosted = post.status === 'posted';
	const caption = `**${post.title}**\n\n${post.hashtags || ''}${
		isPosted ? tiktokLink : ''
	}`;

	const keyboard = new InlineKeyboard();
	if (fullLink.startsWith('https')) {
		keyboard.webApp('📱 Mở App', fullLink);
	}

	// Prepare video source
	const videoKey = path.basename(post.videoPath);
	const localPath = path.join(DATA_DIR, 'videos', videoKey);
	let videoSource = null;

	// Try to get video source: cached file_id > local > s3
	if (post.telegramFileId) {
		videoSource = post.telegramFileId;
	} else if (fs.existsSync(localPath)) {
		videoSource = new InputFile(localPath);
	} else if (isS3Enabled()) {
		// Download from S3 logic
		const cacheDir = path.join(DATA_DIR, 'videos');
		const videoBuffer = await s3DownloadVideo(videoKey, cacheDir);
		if (videoBuffer) {
			videoSource = new InputFile(videoBuffer, videoKey);
		}
	}

	if (!videoSource) {
		console.warn(
			`[Scheduler] Video source not found for ${post.id}, skipping channel notify`
		);
		return;
	}

	const sentMessageIds = [];

	// Send to all channels
	for (const channel of channels) {
		const targetId = channel.chatId.toString();
		const targetType = (channel.type || 'channel').toUpperCase();
		const targetLabel = `[${targetType}] ${channel.title || targetId}`;

		try {
			const sent = await bot.api.sendVideo(targetId, videoSource, {
				caption: caption,
				parse_mode: 'Markdown',
				reply_markup: keyboard,
				supports_streaming: true,
			});
			sentMessageIds.push(`${targetId}:${sent.message_id}`);
			console.log(`[Scheduler] Sent video to ${targetLabel}`);
		} catch (err) {
			console.error(
				`[Scheduler] Failed to send video to ${targetLabel}:`,
				err.message
			);
		}
	}

	// Update DB with message IDs
	if (sentMessageIds.length > 0) {
		await updateChannelMessageIds(post.id, sentMessageIds);
	} else {
		// If automated call and failed to send (but video existed), ensure we don't loop forever.
		// Use markChannelNotified as fallback if no messages were sent but we don't want to retry.
		// But in manual mode, user might want to retry.
		// For now, let's just leave it unnotified if failed, so retry cleans it up?
		// Or mark it to be safe.
		// Let's assume if it failed for ALL channels, something is wrong.
	}
}

/**
 * Delete channel notifications for a post
 * @param {Object} post
 */
export async function deleteChannelNotification(post) {
	if (!bot || !post.channelMessageIds || post.channelMessageIds.length === 0)
		return;

	for (const idString of post.channelMessageIds) {
		const parts = idString.split(':');
		if (parts.length >= 2) {
			const chatId = parts[0];
			const messageId = parts[1];

			try {
				await bot.api.deleteMessage(chatId, parseInt(messageId));
			} catch (err) {
				console.error(
					`[Scheduler] Failed to delete channel message ${idString}:`,
					err.message
				);
			}
		}
	}

	await clearChannelMessageIds(post.id);
}

/**
 * Check for posts that have been posted/cancelled and notify channels
 */
async function checkAndNotifyChannelStatus() {
	if (!bot) return;

	try {
		const posts = await getUnnotifiedPosts();
		if (posts.length === 0) return;

		console.log(`[Scheduler] Found ${posts.length} posts to send to channels`);

		for (const post of posts) {
			await sendChannelNotification(post);
			// Fallback mark notified to prevent infinite loops if send partial fails or logic differs
			const updatedPost = await getRawPostById(post.id);
			if (!updatedPost.channelNotified) {
				await markChannelNotified(post.id);
			}
		}
	} catch (error) {
		console.error('[Scheduler] Error notifying channels:', error.message);
	}
}

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
	let {
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

		// Use CDN URL if configured (faster download via Cloudflare edge)
		// Fallback to stream API endpoint otherwise
		const baseUrl = process.env.BASE_URL || 'http://localhost:8888';
		const videoKey = path.basename(videoPath);
		const downloadUrl = isCdnEnabled()
			? getCdnUrl(videoKey)
			: `${baseUrl}/api/videos/${postId}/stream`;

		// Caption for the video (Telegram caption limit: 1024 chars)
		const caption = `**${title}**\n\n` + `${hashtags}\n\n`;

		// Helper to build keyboard with role-based miniapp button
		const buildKeyboardForRecipient = (recipientId) => {
			const userRole = getUserRole(recipientId);
			const isPrivileged = ['admin', 'mod', 'reviewer'].includes(userRole);
			const linkLabel = isPrivileged ? '🎬 Quản lý Video' : '📺 Xem Video';
			const linkPath = isPrivileged ? '/admin' : '/';
			const fullLink = `${baseUrl}${linkPath}`;

			const keyboard = new InlineKeyboard()
				.url('📥 Tải Video Gốc (Full HD)', downloadUrl)
				.row()
				.text('✅ Đã đăng TikTok', `posted_${postId}`)
				.text('❌ Huỷ đăng', `cancelpost_${postId}`)
				.row()
				.text('⏭️ Đẩy xuống cuối', `pushtoend_${postId}`)
				.row();

			if (fullLink.startsWith('https')) {
				keyboard.webApp(linkLabel, fullLink);
			}

			return keyboard;
		};

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
					const recipientKeyboard = buildKeyboardForRecipient(recipientId);
					await bot.api.sendMessage(
						recipientId,
						caption + `\n\n⚠️ _Video file không tìm thấy_`,
						{
							parse_mode: 'Markdown',
							reply_markup: recipientKeyboard,
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
			// Send video to all recipients and collect message IDs
			const sentMessageIds = [];

			for (const recipientId of recipients) {
				try {
					const recipientKeyboard = buildKeyboardForRecipient(recipientId);

					// Helper to send with retry logic
					const sendVideoWithRetry = async () => {
						try {
							return await bot.api.sendVideo(recipientId, videoSource, {
								caption,
								parse_mode: 'Markdown',
								reply_markup: recipientKeyboard,
								supports_streaming: true,
							});
						} catch (err) {
							// If failed with wrong file identifier, retry with local file
							if (
								telegramFileId &&
								err.description &&
								err.description.includes('wrong file identifier')
							) {
								console.warn(
									`[Scheduler] Invalid file_id for ${videoKey}, retrying with local file...`
								);

								// Clear invalid file_id
								await updatePostFileId(postId, null);
								telegramFileId = null; // Prevent using it for next recipients

								// Fallback to local file
								const cacheDir = path.join(DATA_DIR, 'videos');
								if (fs.existsSync(localPath)) {
									videoSource = new InputFile(localPath);
									needsFileIdSave = true;
								} else if (isS3Enabled()) {
									// Download from S3 if not local
									const videoBuffer = await s3DownloadVideo(videoKey, cacheDir);
									if (videoBuffer) {
										videoSource = new InputFile(videoBuffer, videoKey);
										needsFileIdSave = true;
									} else {
										throw new Error(
											'Local file missing and S3 download failed'
										);
									}
								} else {
									throw new Error('Local file missing and S3 disabled');
								}

								// Retry with new source
								return await bot.api.sendVideo(recipientId, videoSource, {
									caption,
									parse_mode: 'Markdown',
									reply_markup: recipientKeyboard,
									supports_streaming: true,
								});
							}
							throw err;
						}
					};

					const sentMessage = await sendVideoWithRetry();

					// Collect message ID for potential future deletion
					sentMessageIds.push(sentMessage.message_id.toString());

					// Save file_id for future use (only from first recipient)
					if (needsFileIdSave && sentMessage.video?.file_id) {
						await updatePostFileId(postId, sentMessage.video.file_id);
						console.log(`[Scheduler] Cached file_id for: ${videoKey}`);
						needsFileIdSave = false; // Only save once

						// Update local variable so next recipients use the new file_id (optimization)
						// Actually, InputFile is fine for multiple sends
					}

					console.log(`[Scheduler] Sent video to recipient: ${recipientId}`);
				} catch (sendError) {
					console.error(
						`[Scheduler] Failed to send to ${recipientId}:`,
						sendError.message
					);
					// Push empty string for failed sends to keep index alignment
					sentMessageIds.push('');
				}
			}

			// Save message IDs for potential deletion if post gets rescheduled
			if (sentMessageIds.some((id) => id !== '')) {
				await saveNotificationMessageIds(postId, sentMessageIds);
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
 * Delete notification messages for a post that will be rescheduled
 * @param {string} postId
 */
async function deleteNotificationMessages(postId) {
	if (!bot) return;

	const rawPost = await getRawPostById(postId);
	if (!rawPost || !rawPost.notificationMessageIds?.length) return;

	const recipients = getNotificationRecipients();
	const messageIds = rawPost.notificationMessageIds;

	for (let i = 0; i < recipients.length; i++) {
		const recipientId = recipients[i];
		const messageId = messageIds[i];

		if (messageId && messageId !== '') {
			try {
				await bot.api.deleteMessage(recipientId, parseInt(messageId));
				console.log(
					`[Scheduler] Deleted message ${messageId} for ${recipientId}`
				);
			} catch (err) {
				// Message may have been deleted manually or expired, ignore
				console.warn(`[Scheduler] Failed to delete message: ${err.message}`);
			}
		}
	}

	// Clear stored message IDs
	await clearNotificationMessageIds(postId);
}

/**
 * Check for due posts and process them
 * SMART LOGIC: When multiple posts are overdue, only process the NEWEST one
 * and reschedule older posts to the end of the queue
 * This runs every minute via cron
 */
async function checkAndProcessDuePosts() {
	try {
		const duePosts = await getDuePosts();

		if (duePosts.length === 0) {
			return;
		}

		console.log(`[Scheduler] Found ${duePosts.length} due post(s)`);

		// If only one post, process it normally
		if (duePosts.length === 1) {
			try {
				await processNotification(duePosts[0]);
			} catch (error) {
				// Error already logged in processNotification
			}
			return;
		}

		// Multiple overdue posts - smart reschedule logic
		// Sort by scheduledAt DESC: newest (closest to now) first
		duePosts.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));

		const newestPost = duePosts[0];
		const olderPosts = duePosts.slice(1);

		console.log(
			`[Scheduler] Smart reschedule: Processing newest post ${newestPost.id.slice(
				0,
				8
			)}, rescheduling ${olderPosts.length} older post(s)`
		);

		// Reschedule older posts to end of queue
		for (const oldPost of olderPosts) {
			try {
				// Delete old notification messages if they were sent
				await deleteNotificationMessages(oldPost.id);

				// Reschedule to end of queue
				const newTime = await rescheduleToEnd(oldPost.id);

				console.log(
					`[Scheduler] Rescheduled overdue post ${oldPost.id.slice(
						0,
						8
					)} to ${newTime.toISOString()}`
				);
			} catch (err) {
				console.error(
					`[Scheduler] Failed to reschedule ${oldPost.id.slice(0, 8)}:`,
					err.message
				);
			}
		}

		// Process only the newest post
		try {
			await processNotification(newestPost);
		} catch (error) {
			// Error already logged in processNotification
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
		checkAndNotifyChannelStatus().catch(console.error);
	});

	// Also run immediately on startup to catch any missed posts
	console.log('[Scheduler] Running initial check for due posts...');
	setTimeout(() => {
		checkAndProcessDuePosts().catch(console.error);
		checkAndNotifyChannelStatus().catch(console.error);
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
