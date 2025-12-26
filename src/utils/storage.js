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
// Weekday (Mon-Fri): 11:30, 12:15, 17:30, 19:45, 20:30, 21:15, 22:00, 22:45, 23:45
export const WEEKDAY_SLOTS = [
	[11, 30], // Lunch Open
	[12, 15], // Lunch Peak
	[17, 30], // Commute End
	[19, 45], // Evening Prime Open
	[20, 30], // Golden Hour
	[21, 15], // Private Hour
	[22, 0], // Gen Z Peak
	[22, 45], // Late Night Peak
	[23, 45], // The "Hut" Slot
];

// Saturday: Remove 19:45, 20:30. Add 16:00.
// 11:30, 12:15, 16:00, 17:30, 21:15, 22:00, 22:45, 23:45
export const SATURDAY_SLOTS = [
	[11, 30],
	[12, 15],
	[16, 0], // Get Ready slot
	[17, 30],
	[21, 15],
	[22, 0],
	[22, 45],
	[23, 45],
];

// Sunday: Add 01:00 (Sat Post-Party), 09:00, 10:00. Remove 23:45.
// 01:00, 09:00, 10:00, 11:30, 12:15, 17:30, 19:45, 20:30, 21:15, 22:00, 22:45
export const SUNDAY_SLOTS = [
	[1, 0], // Post-Party (technically Sun morning)
	[9, 0], // Sleeping in
	[10, 0], // Sleeping in
	[11, 30],
	[12, 15],
	[17, 30],
	[19, 45],
	[20, 30],
	[21, 15],
	[22, 0],
	[22, 45],
];

/**
 * Get slots for a specific date (GMT+7)
 * @param {Date} date
 * @returns {Array<[number, number]>}
 */
export function getSlotsForDate(date) {
	const gmt7Date = toGMT7(date);
	const day = gmt7Date.getDay(); // 0 is Sunday, 6 is Saturday

	if (day === 0) return SUNDAY_SLOTS;
	if (day === 6) return SATURDAY_SLOTS;
	return WEEKDAY_SLOTS;
}
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

		hashtags: row.hashtags,
		scheduledAt:
			row.scheduledAt instanceof Date
				? row.scheduledAt.toISOString()
				: row.scheduledAt,
		status: row.status,
		error: row.error,
		isRepost: Boolean(row.isRepost),
		telegramFileId: row.telegramFileId || null,
	};
}

/**
 * Add a new scheduled post with smart scheduling (1-2 videos/day)
 * @param {Omit<ScheduledPost, 'id' | 'status'>} post
 * @returns {Promise<ScheduledPost>}
 */
export async function addScheduledPost(post) {
	const scheduledAt = await getSmartScheduleSlot();

	// Store relative path only
	const relativePath = getVideoRelativePath(post.videoPath);

	const created = await prisma.scheduledPost.create({
		data: {
			chatId: BigInt(post.chatId),
			videoPath: relativePath,
			title: post.title,
			hashtags: post.hashtags,
			scheduledAt: new Date(scheduledAt),
			isRepost: Boolean(post.isRepost),
		},
	});

	return mapScheduledPost(created);
}

// Track recently used slots to prevent race conditions
// Key format: "YYYY-MM-DD-HH" in GMT+7
const recentlyUsedSlots = new Set();

/**
 * Get smart schedule slot for next video
 * Uses dynamic slots based on Weekday/Saturday/Sunday schedule (GMT+7)
 * @returns {Promise<string>} ISO date string
 */
export async function getSmartScheduleSlot() {
	const now = nowGMT7();

	// Get all scheduled slots from DB - convert each to GMT+7 slot key
	const dbRows = await prisma.scheduledPost.findMany({
		where: { status: 'pending' },
		orderBy: { scheduledAt: 'desc' },
		select: { scheduledAt: true },
	});

	// Count slots per SLOTS (using precise matching)
	const slotCounts = new Map();

	function getSlotKeyForTime(date) {
		const d = toGMT7(date);
		const hour = d.getHours();
		const minute = d.getMinutes();
		const dateKey = getDateKey(d);
		const slots = getSlotsForDate(d);

		// Find which slot this time belongs to
		for (const [slotH, slotM] of slots) {
			// Allow 15 min window
			if (hour === slotH && Math.abs(minute - slotM) <= 15) {
				return `${dateKey}-${slotH}-${slotM}`;
			}
		}
		// Fallback for non-matching slots (shouldn't happen often)
		return `${dateKey}-${hour}-${minute}`;
	}

	for (const r of dbRows) {
		const key = getSlotKeyForTime(new Date(r.scheduledAt));
		slotCounts.set(key, (slotCounts.get(key) || 0) + 1);
	}

	// Also count recently used slots
	for (const key of recentlyUsedSlots) {
		slotCounts.set(key, (slotCounts.get(key) || 0) + 1);
	}

	// Start from today in GMT+7
	let checkDate = new Date(now);
	checkDate.setHours(0, 0, 0, 0);

	for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
		const dateKey = getDateKey(checkDate);
		const dailySlots = getSlotsForDate(checkDate);

		// Check each slot for this day
		for (const [slotHour, slotMinute] of dailySlots) {
			const slotKey = `${dateKey}-${slotHour}-${slotMinute}`;
			const slotCount = slotCounts.get(slotKey) || 0;

			if (slotCount < 1) {
				// Each slot only holds 1 video
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
						`[Schedule] Found slot: ${slotHour}:${String(slotMinute).padStart(
							2,
							'0'
						)} on ${dateKey}`
					);
					return scheduleTime.toISOString();
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
 * Uses dynamic "Private Wave" schedule (Weekday/Sat/Sun)
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

	// Find the next available slot from now
	let slotIndex = -1;
	let slots = getSlotsForDate(currentDate);

	// Helper to find next valid slot index today
	const findNextSlotIndex = () => {
		for (let i = 0; i < slots.length; i++) {
			const [hour, minute] = slots[i];
			const testTime = createGMT7Time(
				currentDate.getFullYear(),
				currentDate.getMonth() + 1,
				currentDate.getDate(),
				hour
			);
			testTime.setMinutes(minute);
			if (testTime > nowGmt7) {
				return i;
			}
		}
		return -1;
	};

	slotIndex = findNextSlotIndex();

	// If no slots left today, move to tomorrow
	if (slotIndex === -1) {
		currentDate.setDate(currentDate.getDate() + 1);
		currentDate.setHours(0, 0, 0, 0); // Reset to SOC
		slots = getSlotsForDate(currentDate);
		slotIndex = 0;
	}

	// Update all posts with new schedule AND new content
	let count = 0;
	for (const post of posts) {
		const [hour, minute] = slots[slotIndex];

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
		if (slotIndex >= slots.length) {
			// Move to next day
			currentDate.setDate(currentDate.getDate() + 1);
			slots = getSlotsForDate(currentDate);
			slotIndex = 0;
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

	// Find the next available slot from now
	let slotIndex = -1;
	let slots = getSlotsForDate(currentDate);

	// Helper to find next valid slot index today
	const findNextSlotIndex = () => {
		for (let i = 0; i < slots.length; i++) {
			const [hour, minute] = slots[i];
			const testTime = createGMT7Time(
				currentDate.getFullYear(),
				currentDate.getMonth() + 1,
				currentDate.getDate(),
				hour
			);
			testTime.setMinutes(minute);
			if (testTime > nowGmt7) {
				return i;
			}
		}
		return -1;
	};

	slotIndex = findNextSlotIndex();

	// If no slots left today, move to tomorrow
	if (slotIndex === -1) {
		currentDate.setDate(currentDate.getDate() + 1);
		currentDate.setHours(0, 0, 0, 0);
		slots = getSlotsForDate(currentDate);
		slotIndex = 0;
	}

	// Update ONLY scheduled_at, keep title/hashtags
	let count = 0;
	for (const post of posts) {
		const [hour, minute] = slots[slotIndex];

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
		if (slotIndex >= slots.length) {
			currentDate.setDate(currentDate.getDate() + 1);
			slots = getSlotsForDate(currentDate);
			slotIndex = 0;
		}
	}

	console.log(`[Reschedule] Updated times for ${count} posts`);
	return count;
}

/**
 * Retitle all pending posts - ONLY update titles/hashtags, keep existing schedule
 * Used for regenerating content without changing times
 * @param {number} chatId
 * @returns {Promise<number>} Number of posts retitled
 */
export async function retitleAllPending(chatId) {
	// Import content generator dynamically to avoid circular deps
	const { generateContentOptions } = await import('../services/ai.js');

	// Get all pending posts
	const posts = await prisma.scheduledPost.findMany({
		where: { chatId: BigInt(chatId), status: 'pending' },
	});

	if (posts.length === 0) {
		return 0;
	}

	console.log(`[Retitle] Generating new content for ${posts.length} posts...`);

	// Update ONLY title/hashtags, keep scheduledAt
	let count = 0;
	for (const post of posts) {
		const [content] = generateContentOptions();

		await prisma.scheduledPost.update({
			where: { id: post.id },
			data: {
				title: content.title,
				hashtags: content.hashtags,
			},
		});
		count++;

		console.log(
			`[Retitle] ${count}/${posts.length}: "${content.title.slice(0, 25)}..."`
		);
	}

	console.log(`[Retitle] Generated new content for ${count} posts`);
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
 * Get all pending posts (public - visible to all users)
 * @param {number} chatId - Kept for backward compatibility, not used in query
 * @returns {Promise<ScheduledPost[]>}
 */
export async function getPendingPostsByChat(chatId) {
	// NOTE: chatId is ignored - videos are public to all users
	const posts = await prisma.scheduledPost.findMany({
		where: { status: 'pending' },
		orderBy: { scheduledAt: 'asc' },
	});

	return posts.map(mapScheduledPost);
}

/**
 * Get all posts (public - visible to all users), sorted by scheduledAt asc (oldest first)
 * Order: oldest posted → ... → last posted (DEFAULT) → first pending → ... → newest pending
 * Also returns the index of the last posted video for default page
 * @param {number} chatId - Kept for backward compatibility, not used in query
 * @returns {Promise<{posts: ScheduledPost[], lastPostedIndex: number}>}
 */
export async function getAllPostsByChat(chatId) {
	// NOTE: chatId is ignored - videos are public to all users
	const posts = await prisma.scheduledPost.findMany({
		where: {
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
 * Update post content (title, hashtags) with new random content
 * @param {string} postId - The post ID to update
 * @returns {Promise<{success: boolean, title: string, hashtags: string}>}
 */
export async function updatePostContent(postId) {
	// Import content generator dynamically to avoid circular deps
	const { generateContentOptions } = await import('../services/ai.js');

	// Check if post exists
	const post = await prisma.scheduledPost.findUnique({ where: { id: postId } });

	if (!post) {
		return { success: false, title: '', hashtags: '' };
	}

	// Generate new random content
	const [content] = generateContentOptions();

	// Update the post
	await prisma.scheduledPost.update({
		where: { id: postId },
		data: {
			title: content.title,
			hashtags: content.hashtags,
		},
	});

	console.log(
		`[Update] New content for ${postId}: "${content.title.slice(0, 25)}..."`
	);

	return {
		success: true,
		title: content.title,
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
