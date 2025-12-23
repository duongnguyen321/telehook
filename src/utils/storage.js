import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { prisma } from './prisma.js';
import {
	nowGMT7,
	toGMT7,
	getSlotKey,
	getDateKey,
	createGMT7Time,
} from './timezone.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, '../../data');
export const VIDEOS_DIR = path.join(DATA_DIR, 'videos');

// 9 videos/day at optimal times (GMT+7)
// 09:00, 10:45, 12:15, 14:00, 16:00, 18:00, 20:00, 22:00, 23:45
export const DAILY_SLOTS = [
	[9, 0], // Mở bát ngày mới
	[10, 45], // Giờ giải lao giữa sáng
	[12, 15], // ĐỈNH VIEW TRƯA - Nghỉ trưa
	[14, 0], // Đầu giờ chiều
	[16, 0], // Giờ "trà chiều"
	[18, 0], // Tan tầm
	[20, 0], // PRIME TIME - Giờ vàng
	[22, 0], // Giờ riêng tư
	[23, 45], // KHUNG GIỜ "HÚT" NHẤT - Content táo bạo
];
/**
 * Convert relative video path (filename) to absolute path
 * @param {string} relativePath - filename or relative path
 * @returns {string} absolute path
 */
export function getVideoFullPath(relativePath) {
	// If already absolute, return as is
	if (path.isAbsolute(relativePath)) {
		return relativePath;
	}
	return path.join(VIDEOS_DIR, relativePath);
}

/**
 * Convert absolute video path to relative (just filename)
 * @param {string} absolutePath
 * @returns {string} filename only
 */
export function getVideoRelativePath(absolutePath) {
	return path.basename(absolutePath);
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(VIDEOS_DIR)) {
	fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

// ==================== SETTINGS ====================

/**
 * Get a setting value
 * @param {string} key
 * @returns {string | null}
 */
export async function getSetting(key) {
	const setting = await prisma.setting.findUnique({ where: { key } });
	return setting?.value ?? null;
}

/**
 * Set a setting value
 * @param {string} key
 * @param {string} value
 */
export async function setSetting(key, value) {
	await prisma.setting.upsert({
		where: { key },
		update: { value },
		create: { key, value },
	});
}

// Initialize default settings
async function initSettings() {
	const defaults = [
		['videos_per_day', '2'],
		['current_repost_cycle', '0'],
		['repost_index', '0'],
	];
	for (const [key, value] of defaults) {
		const existing = await prisma.setting.findUnique({ where: { key } });
		if (!existing) {
			await prisma.setting.create({ data: { key, value } });
		}
	}
}
initSettings().catch(console.error);

// ==================== SCHEDULED POSTS ====================

/**
 * @typedef {Object} ScheduledPost
 * @property {string} id
 * @property {number} chatId
 * @property {string} videoPath
 * @property {string} title
 * @property {string} description
 * @property {string} hashtags
 * @property {string} scheduledAt
 * @property {'pending' | 'posted' | 'failed'} status
 * @property {string} [error]
 * @property {boolean} isRepost
 */

/**
 * Map Prisma model to internal format
 */
function mapScheduledPost(row) {
	if (!row) return null;
	return {
		id: row.id,
		chatId: Number(row.chatId),
		videoPath: getVideoFullPath(row.videoPath),
		title: row.title,
		description: row.description,
		hashtags: row.hashtags,
		scheduledAt: row.scheduledAt,
		status: row.status,
		error: row.error,
		isRepost: row.isRepost === 1,
		telegramFileId: row.telegramFileId || null,
	};
}

/**
 * Add a new scheduled post with smart scheduling (1-2 videos/day)
 * @param {Omit<ScheduledPost, 'id' | 'status'>} post
 * @returns {Promise<ScheduledPost>}
 */
export async function addScheduledPost(post) {
	const id = crypto.randomUUID();
	const scheduledAt = await getSmartScheduleSlot();

	// Store relative path only
	const relativePath = getVideoRelativePath(post.videoPath);

	const created = await prisma.scheduledPost.create({
		data: {
			id,
			chatId: BigInt(post.chatId),
			videoPath: relativePath,
			title: post.title,
			description: post.description,
			hashtags: post.hashtags,
			scheduledAt,
			isRepost: post.isRepost ? 1 : 0,
		},
	});

	return mapScheduledPost(created);
}

// Track recently used slots to prevent race conditions
// Key format: "YYYY-MM-DD-HH" in GMT+7
const recentlyUsedSlots = new Set();

/**
 * Get smart schedule slot for next video
 * 9 videos/day: 3 per timeslot at 10:00, 15:00, 21:00 (GMT+7)
 * @returns {Promise<string>} ISO date string
 */
export async function getSmartScheduleSlot() {
	const SLOTS_PER_DAY = DAILY_SLOTS.length; // 9 total
	const now = nowGMT7();

	// Get all scheduled slots from DB - convert each to GMT+7 slot key
	const dbRows = await prisma.scheduledPost.findMany({
		where: { status: 'pending' },
		orderBy: { scheduledAt: 'desc' },
		select: { scheduledAt: true },
	});

	// Count slots per GOLDEN HOUR (not actual hour)
	// 9:30-10:30 -> 10 slot, 14:30-15:30 -> 15 slot, 20:30-21:30 -> 21 slot
	const slotCounts = new Map();

	function getSlotHour(date) {
		const d = toGMT7(date);
		const hour = d.getHours();
		const minute = d.getMinutes();
		const dateKey = getDateKey(d);

		// Find which slot this time belongs to
		for (const [slotH, slotM] of DAILY_SLOTS) {
			if (hour === slotH && Math.abs(minute - slotM) <= 15) {
				return `${dateKey}-${slotH}-${slotM}`;
			}
		}
		return `${dateKey}-${hour}-${minute}`;
	}

	for (const r of dbRows) {
		const key = getSlotHour(new Date(r.scheduledAt));
		slotCounts.set(key, (slotCounts.get(key) || 0) + 1);
	}

	// Also count recently used slots (already using golden hour keys)
	for (const key of recentlyUsedSlots) {
		slotCounts.set(key, (slotCounts.get(key) || 0) + 1);
	}

	console.log(
		`[Schedule] Total pending: ${dbRows.length}, recent: ${recentlyUsedSlots.size}`
	);

	// Start from today in GMT+7
	let checkDate = new Date(now);
	checkDate.setHours(0, 0, 0, 0);

	for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
		const dateKey = getDateKey(checkDate);

		// Count total videos scheduled for this day
		let dayTotal = 0;
		for (const [key, count] of slotCounts) {
			if (key.startsWith(dateKey)) dayTotal += count;
		}

		if (dayTotal < SLOTS_PER_DAY) {
			// Find available slot
			for (const [slotHour, slotMinute] of DAILY_SLOTS) {
				const slotKey = `${dateKey}-${slotHour}-${slotMinute}`;
				const slotCount = slotCounts.get(slotKey) || 0;

				if (slotCount < 1) {
					// Each slot only holds 1 video now
					const scheduleTime = createGMT7Time(
						checkDate.getFullYear(),
						checkDate.getMonth() + 1,
						checkDate.getDate(),
						slotHour
					);
					scheduleTime.setMinutes(slotMinute);

					// Make sure it's in the future
					if (scheduleTime > new Date()) {
						// Mark as used immediately
						recentlyUsedSlots.add(slotKey);
						slotCounts.set(slotKey, slotCount + 1);

						// Clean up after 30 seconds
						setTimeout(() => recentlyUsedSlots.delete(slotKey), 30000);

						console.log(
							`[Schedule] Slot: ${slotHour}:${String(slotMinute).padStart(
								2,
								'0'
							)} (GMT+7)`
						);
						return scheduleTime.toISOString();
					}
				}
			}
		}

		// Move to next day
		checkDate.setDate(checkDate.getDate() + 1);
	}

	// Fallback: 1 hour from now
	return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

/**
 * Reschedule all pending posts with new schedule AND new content
 * 9 videos/day: 3 per golden hour (9:30/10:00/10:30, 14:30/15:00/15:30, 20:30/21:00/21:30)
 * Videos are sorted by timestamp in filename (number before first underscore)
 * @param {number} chatId
 * @returns {Promise<number>} Number of posts rescheduled
 */
export async function rescheduleAllPending(chatId) {
	// Import content generator dynamically to avoid circular deps
	const { generateContentOptions } = await import('../services/ai.js');

	// Clear cache
	recentlyUsedSlots.clear();

	// Get all pending posts
	let posts = await prisma.scheduledPost.findMany({
		where: { chatId: BigInt(chatId), status: 'pending' },
	});

	if (posts.length === 0) {
		return 0;
	}

	// Sort by timestamp in filename (number before first underscore)
	// Filename format: 1234567890_abc123.mp4
	posts = posts.sort((a, b) => {
		const getTimestamp = (videoPath) => {
			const filename = path.basename(videoPath);
			const match = filename.match(/^(\d+)_/);
			return match ? parseInt(match[1], 10) : 0;
		};
		return getTimestamp(a.videoPath) - getTimestamp(b.videoPath);
	});

	console.log(
		`[Reschedule] Rescheduling ${posts.length} pending posts (sorted by filename timestamp)...`
	);

	// Start from now
	const nowGmt7 = nowGMT7();
	let currentDate = new Date(nowGmt7);
	currentDate.setHours(0, 0, 0, 0);

	let slotIndex = 0;

	// Find first slot that's in the future
	for (let i = 0; i < DAILY_SLOTS.length; i++) {
		const [hour, minute] = DAILY_SLOTS[i];
		const testTime = new Date(currentDate);
		testTime.setHours(hour, minute, 0, 0);
		if (testTime > nowGmt7) {
			slotIndex = i;
			break;
		}
		// If all slots today are past, start from tomorrow
		if (i === DAILY_SLOTS.length - 1) {
			currentDate.setDate(currentDate.getDate() + 1);
			slotIndex = 0;
		}
	}

	// Update all posts with new schedule AND new content
	let count = 0;
	for (const post of posts) {
		const [hour, minute] = DAILY_SLOTS[slotIndex];

		// Create schedule time
		const scheduleTime = createGMT7Time(
			currentDate.getFullYear(),
			currentDate.getMonth() + 1,
			currentDate.getDate(),
			hour
		);
		scheduleTime.setMinutes(minute);

		// Generate new random content
		const [content] = generateContentOptions();

		await prisma.scheduledPost.update({
			where: { id: post.id },
			data: {
				scheduledAt: scheduleTime.toISOString(),
				title: content.title,
				description: content.description,
				hashtags: content.hashtags,
			},
		});
		count++;

		const timeStr = `${
			currentDate.getMonth() + 1
		}/${currentDate.getDate()} ${hour}:${String(minute).padStart(2, '0')}`;
		console.log(
			`[Reschedule] ${count}/${
				posts.length
			}: ${timeStr} - "${content.title.slice(0, 25)}..."`
		);

		// Move to next slot
		slotIndex++;
		if (slotIndex >= DAILY_SLOTS.length) {
			slotIndex = 0;
			currentDate.setDate(currentDate.getDate() + 1);
		}
	}

	return count;
}

/**
 * Reschedule all pending posts - ONLY update times, keep existing content
 * Used when deleting a video to fill the schedule gap
 * @param {number} chatId
 * @returns {Promise<number>} Number of posts rescheduled
 */
export async function rescheduleTimesOnly(chatId) {
	// Clear cache
	recentlyUsedSlots.clear();

	// Get all pending posts
	let posts = await prisma.scheduledPost.findMany({
		where: { chatId: BigInt(chatId), status: 'pending' },
	});

	if (posts.length === 0) {
		return 0;
	}

	// Sort by timestamp in filename (number before first underscore)
	posts = posts.sort((a, b) => {
		const getTimestamp = (videoPath) => {
			const filename = path.basename(videoPath);
			const match = filename.match(/^(\d+)_/);
			return match ? parseInt(match[1], 10) : 0;
		};
		return getTimestamp(a.videoPath) - getTimestamp(b.videoPath);
	});

	console.log(
		`[Reschedule] Rescheduling times for ${posts.length} posts (keeping content)...`
	);

	// Start from now
	const nowGmt7 = nowGMT7();
	let currentDate = new Date(nowGmt7);
	currentDate.setHours(0, 0, 0, 0);

	let slotIndex = 0;

	// Find first slot that's in the future
	for (let i = 0; i < DAILY_SLOTS.length; i++) {
		const [hour, minute] = DAILY_SLOTS[i];
		const testTime = new Date(currentDate);
		testTime.setHours(hour, minute, 0, 0);
		if (testTime > nowGmt7) {
			slotIndex = i;
			break;
		}
		if (i === DAILY_SLOTS.length - 1) {
			currentDate.setDate(currentDate.getDate() + 1);
			slotIndex = 0;
		}
	}

	// Update ONLY scheduled_at, keep title/description/hashtags
	let count = 0;
	for (const post of posts) {
		const [hour, minute] = DAILY_SLOTS[slotIndex];

		const scheduleTime = createGMT7Time(
			currentDate.getFullYear(),
			currentDate.getMonth() + 1,
			currentDate.getDate(),
			hour
		);
		scheduleTime.setMinutes(minute);

		await prisma.scheduledPost.update({
			where: { id: post.id },
			data: { scheduledAt: scheduleTime.toISOString() },
		});
		count++;

		// Move to next slot
		slotIndex++;
		if (slotIndex >= DAILY_SLOTS.length) {
			slotIndex = 0;
			currentDate.setDate(currentDate.getDate() + 1);
		}
	}

	console.log(`[Reschedule] Updated times for ${count} posts`);
	return count;
}

/**
 * Get pending posts that are due AND haven't had notification sent yet
 * @returns {Promise<ScheduledPost[]>}
 */
export async function getDuePosts() {
	const now = new Date().toISOString();
	const posts = await prisma.scheduledPost.findMany({
		where: {
			status: 'pending',
			scheduledAt: { lte: now },
			notificationSent: 0, // Only get posts that haven't been notified
		},
		orderBy: { scheduledAt: 'asc' },
	});

	return posts.map(mapScheduledPost);
}

/**
 * Mark a post as having its notification sent (prevents duplicate notifications)
 * @param {string} postId
 */
export async function markNotificationSent(postId) {
	await prisma.scheduledPost.update({
		where: { id: postId },
		data: { notificationSent: 1 },
	});
	console.log(
		`[Storage] Marked notification sent for post ${postId.slice(0, 8)}`
	);
}

/**
 * Get a single post by ID (fresh data from database)
 * @param {string} postId
 * @returns {Promise<ScheduledPost | null>}
 */
export async function getPostById(postId) {
	const row = await prisma.scheduledPost.findUnique({ where: { id: postId } });
	return mapScheduledPost(row);
}

/**
 * Update post status and archive if posted
 * @param {string} id
 * @param {'pending' | 'posted' | 'failed'} status
 * @param {string} [error]
 */
export async function updatePostStatus(id, status, error = null) {
	await prisma.scheduledPost.update({
		where: { id },
		data: { status, error },
	});

	// If posted successfully, archive the video for future repost
	if (status === 'posted') {
		const post = await prisma.scheduledPost.findUnique({ where: { id } });
		if (post && post.isRepost !== 1) {
			await archiveVideo(post);
		}
	}
}

// ==================== VIDEO ARCHIVE ====================

/**
 * Archive a posted video for repost system
 * @param {Object} post
 */
async function archiveVideo(post) {
	const existing = await prisma.videoArchive.findFirst({
		where: { videoPath: post.videoPath },
	});
	if (existing) return; // Already archived

	await prisma.videoArchive.create({
		data: {
			id: crypto.randomUUID(),
			chatId: post.chatId,
			videoPath: post.videoPath,
			title: post.title,
			description: post.description,
			hashtags: post.hashtags,
			postedAt: new Date().toISOString(),
		},
	});
}

/**
 * Update video stats (views, likes)
 * @param {string} videoPath
 * @param {number} views
 * @param {number} likes
 */
export async function updateVideoStats(videoPath, views, likes) {
	await prisma.videoArchive.updateMany({
		where: { videoPath },
		data: { views, likes },
	});
}

/**
 * Get videos for repost - 3 oldest videos not yet reposted in current cycle
 * @param {number} chatId
 * @returns {Promise<Array|null>}
 */
export async function getVideosForRepost(chatId) {
	const currentCycle = parseInt(
		(await getSetting('current_repost_cycle')) || '0'
	);

	// Get IDs of videos already reposted in this cycle
	const repostedInCycle = await prisma.repostCycle.findMany({
		where: { cycleNumber: currentCycle },
		select: { videoId: true },
	});
	const repostedIds = repostedInCycle.map((r) => r.videoId);

	// Get 3 oldest videos not yet reposted in this cycle
	const available = await prisma.videoArchive.findMany({
		where: {
			chatId: BigInt(chatId),
			id: { notIn: repostedIds },
		},
		orderBy: { postedAt: 'asc' },
		take: 3,
	});

	if (available.length === 0) {
		// All videos reposted - start new cycle
		const totalVideos = await prisma.videoArchive.count({
			where: { chatId: BigInt(chatId) },
		});

		if (totalVideos === 0) {
			return null; // No videos to repost
		}

		// Start new cycle
		await setSetting('current_repost_cycle', String(currentCycle + 1));
		return getVideosForRepost(chatId); // Recursive call with new cycle
	}

	return available; // Return up to 3 oldest videos
}

/**
 * Mark videos as reposted in current cycle
 * @param {string[]} videoIds
 */
export async function markAsReposted(videoIds) {
	const currentCycle = parseInt(
		(await getSetting('current_repost_cycle')) || '0'
	);
	const today = new Date().toISOString().split('T')[0];

	for (const id of videoIds) {
		await prisma.repostCycle.create({
			data: {
				videoId: id,
				repostDate: today,
				cycleNumber: currentCycle,
			},
		});
	}
}

/**
 * Check if we need to schedule reposts (no pending posts for tomorrow)
 * @param {number} chatId
 * @returns {Promise<boolean>}
 */
export async function needsRepost(chatId) {
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	const tomorrowStr = tomorrow.toISOString().split('T')[0];

	// Check if there are pending posts for tomorrow or later
	const count = await prisma.scheduledPost.count({
		where: {
			chatId: BigInt(chatId),
			status: 'pending',
			scheduledAt: { gte: tomorrowStr },
		},
	});

	return count === 0;
}

/**
 * Schedule repost videos with new random content
 * @param {number} chatId
 */
export async function scheduleReposts(chatId) {
	// Import content generator dynamically to avoid circular deps
	const { generateContentOptions } = await import('../services/ai.js');

	const videos = await getVideosForRepost(chatId);

	if (!videos || videos.length === 0) {
		console.log('[Repost] No videos available for repost');
		return [];
	}

	const scheduled = [];

	for (const video of videos) {
		// Generate new random content for repost
		const [content] = generateContentOptions();

		const post = await addScheduledPost({
			chatId: Number(video.chatId),
			videoPath: getVideoFullPath(video.videoPath),
			title: content.title,
			description: content.description,
			hashtags: content.hashtags,
			isRepost: true,
		});

		scheduled.push(post);
		await markAsReposted([video.id]);

		console.log(`[Repost] Scheduled: "${content.title.slice(0, 20)}..."`);
	}

	return scheduled;
}

// ==================== UTILITY ====================

/**
 * Get pending posts count
 * @returns {Promise<number>}
 */
export async function getPendingCount() {
	return prisma.scheduledPost.count({ where: { status: 'pending' } });
}

/**
 * Get all pending posts for a chat
 * @param {number} chatId
 * @returns {Promise<ScheduledPost[]>}
 */
export async function getPendingPostsByChat(chatId) {
	const posts = await prisma.scheduledPost.findMany({
		where: { chatId: BigInt(chatId), status: 'pending' },
		orderBy: { scheduledAt: 'asc' },
	});

	return posts.map(mapScheduledPost);
}

/**
 * Get all posts for a chat (both pending and posted), sorted by scheduledAt asc (oldest first)
 * Order: oldest posted → ... → last posted (DEFAULT) → first pending → ... → newest pending
 * Also returns the index of the last posted video for default page
 * @param {number} chatId
 * @returns {Promise<{posts: ScheduledPost[], lastPostedIndex: number}>}
 */
export async function getAllPostsByChat(chatId) {
	const posts = await prisma.scheduledPost.findMany({
		where: {
			chatId: BigInt(chatId),
			status: { in: ['pending', 'posted'] },
		},
		orderBy: { scheduledAt: 'asc' }, // Oldest first
	});

	const mappedPosts = posts.map(mapScheduledPost);

	// Find the index of the LAST posted video (highest index with status='posted')
	// This is the boundary between posted and pending videos
	let lastPostedIndex = -1;
	for (let i = mappedPosts.length - 1; i >= 0; i--) {
		if (mappedPosts[i].status === 'posted') {
			lastPostedIndex = i;
			break;
		}
	}

	return {
		posts: mappedPosts,
		lastPostedIndex: lastPostedIndex >= 0 ? lastPostedIndex : 0,
	};
}

/**
 * Delete a scheduled post, its video file, and reschedule remaining posts
 * @param {string} postId - The post ID to delete
 * @param {number} chatId - Chat ID for rescheduling
 * @returns {Promise<{success: boolean, rescheduled: number}>}
 */
export async function deleteScheduledPost(postId, chatId) {
	// Get the post first
	const post = await prisma.scheduledPost.findUnique({ where: { id: postId } });

	if (!post) {
		return { success: false, rescheduled: 0 };
	}

	// Delete video file if exists
	const fullPath = getVideoFullPath(post.videoPath);
	if (fs.existsSync(fullPath)) {
		try {
			fs.unlinkSync(fullPath);
			console.log(`[Delete] Removed video file: ${post.videoPath}`);
		} catch (e) {
			console.error(`[Delete] Failed to remove file: ${e.message}`);
		}
	}

	// Delete from downloaded_videos if exists (by video path)
	await prisma.downloadedVideo.deleteMany({
		where: { videoPath: post.videoPath },
	});

	// Delete from scheduled_posts
	await prisma.scheduledPost.delete({ where: { id: postId } });
	console.log(`[Delete] Removed post from database: ${postId}`);

	// Reschedule remaining posts to fill the gap (keep existing content)
	const rescheduled = await rescheduleTimesOnly(chatId);

	return { success: true, rescheduled };
}

/**
 * Update a post's Telegram file_id for caching
 * @param {string} postId
 * @param {string} fileId
 */
export async function updatePostFileId(postId, fileId) {
	await prisma.scheduledPost.update({
		where: { id: postId },
		data: { telegramFileId: fileId },
	});
	console.log(`[Cache] Saved file_id for post ${postId}`);
}

/**
 * Clean orphaned posts where video file no longer exists
 * @param {number} chatId
 * @returns {Promise<{deleted: number, rescheduled: number}>}
 */
export async function cleanOrphanedPosts(chatId) {
	const posts = await prisma.scheduledPost.findMany({
		where: { chatId: BigInt(chatId), status: 'pending' },
		select: { id: true, videoPath: true },
	});

	let deleted = 0;
	for (const post of posts) {
		const fullPath = getVideoFullPath(post.videoPath);
		if (!fs.existsSync(fullPath)) {
			// Delete record
			await prisma.scheduledPost.delete({ where: { id: post.id } });
			await prisma.downloadedVideo.deleteMany({
				where: { videoPath: post.videoPath },
			});
			console.log(`[Fix] Removed orphaned record: ${post.id}`);
			deleted++;
		}
	}

	// Reschedule remaining posts
	let rescheduled = 0;
	if (deleted > 0) {
		rescheduled = await rescheduleTimesOnly(chatId);
	}

	return { deleted, rescheduled };
}

/**
 * Update post content (title, description, hashtags) with new random content
 * @param {string} postId - The post ID to update
 * @returns {Promise<{success: boolean, title: string, description: string, hashtags: string}>}
 */
export async function updatePostContent(postId) {
	// Import content generator dynamically to avoid circular deps
	const { generateContentOptions } = await import('../services/ai.js');

	// Check if post exists
	const post = await prisma.scheduledPost.findUnique({ where: { id: postId } });

	if (!post) {
		return { success: false, title: '', description: '', hashtags: '' };
	}

	// Generate new random content
	const [content] = generateContentOptions();

	// Update the post
	await prisma.scheduledPost.update({
		where: { id: postId },
		data: {
			title: content.title,
			description: content.description,
			hashtags: content.hashtags,
		},
	});

	console.log(
		`[Update] New content for ${postId}: "${content.title.slice(0, 25)}..."`
	);

	return {
		success: true,
		title: content.title,
		description: content.description,
		hashtags: content.hashtags,
	};
}

/**
 * Get archive stats
 * @param {number} chatId
 * @returns {Promise<{total: number, totalViews: number}>}
 */
export async function getArchiveStats(chatId) {
	const result = await prisma.videoArchive.aggregate({
		where: { chatId: BigInt(chatId) },
		_count: true,
		_sum: { views: true },
	});
	return {
		total: result._count || 0,
		totalViews: result._sum?.views || 0,
	};
}

// ==================== VIDEO TRACKING ====================

/**
 * Check if video was already downloaded
 * @param {string} fileId - Telegram file_id
 * @returns {Promise<boolean>}
 */
export async function isVideoDuplicate(fileId) {
	const existing = await prisma.downloadedVideo.findUnique({
		where: { fileId },
	});
	return !!existing;
}

/**
 * Track downloaded video
 * @param {string} fileId
 * @param {number} chatId
 * @param {string} videoPath
 * @param {number} fileSize
 */
export async function trackDownloadedVideo(
	fileId,
	chatId,
	videoPath,
	fileSize
) {
	const relativePath = getVideoRelativePath(videoPath);
	await prisma.downloadedVideo.create({
		data: {
			fileId,
			chatId: BigInt(chatId),
			videoPath: relativePath,
			fileSize,
		},
	});
}

/**
 * Update video status
 * @param {string} fileId
 * @param {'pending' | 'scheduled' | 'posted' | 'deleted'} status
 */
export async function updateVideoStatus(fileId, status) {
	await prisma.downloadedVideo.update({
		where: { fileId },
		data: { status },
	});
}

/**
 * Get all downloaded videos for a chat
 * @param {number} chatId
 * @returns {Promise<Array>}
 */
export async function getDownloadedVideos(chatId) {
	return prisma.downloadedVideo.findMany({
		where: { chatId: BigInt(chatId) },
		orderBy: { downloadedAt: 'desc' },
	});
}

/**
 * Delete a downloaded video record and file
 * @param {string} fileId
 * @returns {Promise<boolean>}
 */
export async function deleteDownloadedVideo(fileId) {
	const video = await prisma.downloadedVideo.findUnique({ where: { fileId } });

	if (!video) {
		return false;
	}

	// Delete file
	const fullPath = getVideoFullPath(video.videoPath);
	if (fs.existsSync(fullPath)) {
		fs.unlinkSync(fullPath);
	}

	// Delete record
	await prisma.downloadedVideo.delete({ where: { fileId } });
	return true;
}

/**
 * Get video stats
 * @param {number} chatId
 * @returns {Promise<{total: number, pending: number, scheduled: number, posted: number}>}
 */
export async function getVideoStats(chatId) {
	const [total, pending, scheduled, posted] = await Promise.all([
		prisma.downloadedVideo.count({ where: { chatId: BigInt(chatId) } }),
		prisma.downloadedVideo.count({
			where: { chatId: BigInt(chatId), status: 'pending' },
		}),
		prisma.downloadedVideo.count({
			where: { chatId: BigInt(chatId), status: 'scheduled' },
		}),
		prisma.downloadedVideo.count({
			where: { chatId: BigInt(chatId), status: 'posted' },
		}),
	]);

	return { total, pending, scheduled, posted };
}

// Export prisma for direct access if needed
export { prisma };
