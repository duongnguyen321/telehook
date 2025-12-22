import { Database } from 'bun:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
	nowGMT7,
	toGMT7,
	getSlotKey,
	getDateKey,
	createGMT7Time,
} from './timezone.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'tiktok_bot.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(path.join(DATA_DIR, 'videos'))) {
	fs.mkdirSync(path.join(DATA_DIR, 'videos'), { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);

// Create tables
db.run(`
  CREATE TABLE IF NOT EXISTS scheduled_posts (
    id TEXT PRIMARY KEY,
    chat_id INTEGER NOT NULL,
    video_path TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    hashtags TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'posted', 'failed')),
    error TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    is_repost INTEGER DEFAULT 0
  )
`);

// Posted videos archive for repost system
db.run(`
  CREATE TABLE IF NOT EXISTS video_archive (
    id TEXT PRIMARY KEY,
    chat_id INTEGER NOT NULL,
    video_path TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    hashtags TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    posted_at TEXT NOT NULL,
    last_repost_at TEXT,
    repost_count INTEGER DEFAULT 0
  )
`);

// Repost tracking - to know which videos have been reposted in current cycle
db.run(`
  CREATE TABLE IF NOT EXISTS repost_cycle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    repost_date TEXT NOT NULL,
    cycle_number INTEGER DEFAULT 1
  )
`);

// Settings table
db.run(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

// Downloaded videos tracking - prevent duplicates
db.run(`
  CREATE TABLE IF NOT EXISTS downloaded_videos (
    file_id TEXT PRIMARY KEY,
    chat_id INTEGER NOT NULL,
    video_path TEXT NOT NULL,
    file_size INTEGER,
    downloaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'scheduled', 'posted', 'deleted'))
  )
`);

db.run(
	`CREATE INDEX IF NOT EXISTS idx_downloaded_videos_chat ON downloaded_videos(chat_id)`
);

// Initialize default settings
const initSetting = db.prepare(
	`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`
);
initSetting.run('videos_per_day', '2');
initSetting.run('current_repost_cycle', '0');
initSetting.run('repost_index', '0');

db.run(
	`CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status)`
);
db.run(
	`CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at)`
);
db.run(
	`CREATE INDEX IF NOT EXISTS idx_video_archive_views ON video_archive(views DESC)`
);

// ==================== SETTINGS ====================

/**
 * Get a setting value
 * @param {string} key
 * @returns {string | null}
 */
export function getSetting(key) {
	const stmt = db.prepare(`SELECT value FROM settings WHERE key = ?`);
	const row = stmt.get(key);
	return row ? row.value : null;
}

/**
 * Set a setting value
 * @param {string} key
 * @param {string} value
 */
export function setSetting(key, value) {
	const stmt = db.prepare(
		`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`
	);
	stmt.run(key, value);
}

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
 * Add a new scheduled post with smart scheduling (1-2 videos/day)
 * @param {Omit<ScheduledPost, 'id' | 'status'>} post
 * @returns {ScheduledPost}
 */
export function addScheduledPost(post) {
	const id = crypto.randomUUID();
	const scheduledAt = getSmartScheduleSlot();

	const stmt = db.prepare(`
    INSERT INTO scheduled_posts (id, chat_id, video_path, title, description, hashtags, scheduled_at, status, is_repost)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `);

	stmt.run(
		id,
		post.chatId,
		post.videoPath,
		post.title,
		post.description,
		post.hashtags,
		scheduledAt,
		post.isRepost ? 1 : 0
	);

	return {
		id,
		...post,
		scheduledAt,
		status: 'pending',
	};
}

// Track recently used slots to prevent race conditions
// Key format: "YYYY-MM-DD-HH" in GMT+7
const recentlyUsedSlots = new Set();

/**
 * Get smart schedule slot for next video
 * 9 videos/day: 3 per timeslot at 10:00, 15:00, 21:00 (GMT+7)
 * @returns {string} ISO date string
 */
export function getSmartScheduleSlot() {
	const VIDEOS_PER_SLOT = 3;
	const TIME_SLOTS = [10, 15, 21]; // 10AM, 3PM, 9PM in GMT+7
	const SLOTS_PER_DAY = VIDEOS_PER_SLOT * TIME_SLOTS.length; // 9 total
	const now = nowGMT7();

	// Get all scheduled slots from DB - convert each to GMT+7 slot key
	const stmt = db.prepare(
		`SELECT scheduled_at FROM scheduled_posts WHERE status = 'pending' ORDER BY scheduled_at DESC`
	);
	const dbRows = stmt.all();

	// Count slots per GOLDEN HOUR (not actual hour)
	// 9:30-10:30 -> 10 slot, 14:30-15:30 -> 15 slot, 20:30-21:30 -> 21 slot
	const slotCounts = new Map();

	function getGoldenHourSlot(date) {
		const d = toGMT7(date);
		const hour = d.getHours();
		const minute = d.getMinutes();
		const dateKey = getDateKey(d);

		// Map to golden hour based on time
		let goldenHour;
		if ((hour === 9 && minute >= 30) || (hour === 10 && minute <= 30)) {
			goldenHour = 10;
		} else if ((hour === 14 && minute >= 30) || (hour === 15 && minute <= 30)) {
			goldenHour = 15;
		} else if ((hour === 20 && minute >= 30) || (hour === 21 && minute <= 30)) {
			goldenHour = 21;
		} else {
			// Default: use actual hour
			goldenHour = hour;
		}

		return `${dateKey}-${goldenHour}`;
	}

	for (const r of dbRows) {
		const key = getGoldenHourSlot(new Date(r.scheduled_at));
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
			for (const slotHour of TIME_SLOTS) {
				const slotKey = `${dateKey}-${slotHour}`;
				const slotCount = slotCounts.get(slotKey) || 0;

				if (slotCount < VIDEOS_PER_SLOT) {
					// Create the actual schedule time
					// Position: 0 = -30min, 1 = 0min (golden hour), 2 = +30min
					const minuteOffsets = [-30, 0, 30];
					const minuteOffset = minuteOffsets[slotCount];

					// Calculate hour and minute
					let scheduleHour = slotHour;
					let scheduleMinute = minuteOffset;

					if (minuteOffset < 0) {
						scheduleHour = slotHour - 1;
						scheduleMinute = 30; // -30 means previous hour :30
					}

					const scheduleTime = createGMT7Time(
						checkDate.getFullYear(),
						checkDate.getMonth() + 1,
						checkDate.getDate(),
						scheduleHour
					);
					scheduleTime.setMinutes(scheduleMinute);

					// Make sure it's in the future
					if (scheduleTime > new Date()) {
						// Mark as used immediately
						recentlyUsedSlots.add(slotKey);
						slotCounts.set(slotKey, slotCount + 1);

						// Clean up after 30 seconds
						setTimeout(() => recentlyUsedSlots.delete(slotKey), 30000);

						console.log(
							`[Schedule] Slot: ${slotKey}:${String(minuteOffset).padStart(
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
 * Reschedule all pending posts with new schedule
 * @param {number} chatId
 * @returns {number} Number of posts rescheduled
 */
export function rescheduleAllPending(chatId) {
	// Clear recent slots cache
	recentlyUsedSlots.clear();

	// Get all pending posts ordered by creation time
	const stmt = db.prepare(`
		SELECT * FROM scheduled_posts 
		WHERE chat_id = ? AND status = 'pending'
		ORDER BY id ASC
	`);
	const posts = stmt.all(chatId);

	if (posts.length === 0) {
		return 0;
	}

	console.log(`[Reschedule] Rescheduling ${posts.length} pending posts...`);

	// Reset all scheduled times
	const updateStmt = db.prepare(`
		UPDATE scheduled_posts SET scheduled_at = ? WHERE id = ?
	`);

	let count = 0;
	for (const post of posts) {
		const newTime = getSmartScheduleSlot();
		updateStmt.run(newTime, post.id);
		count++;
		console.log(
			`[Reschedule] ${count}/${posts.length}: ${post.id.slice(
				0,
				8
			)} -> ${newTime.slice(0, 16)}`
		);
	}

	return count;
}

/**
 * Get pending posts that are due
 * @returns {ScheduledPost[]}
 */
export function getDuePosts() {
	const now = new Date().toISOString();
	const stmt = db.prepare(`
    SELECT * FROM scheduled_posts
    WHERE status = 'pending' AND scheduled_at <= ?
    ORDER BY scheduled_at ASC
  `);

	return stmt.all(now).map((row) => ({
		id: row.id,
		chatId: row.chat_id,
		videoPath: row.video_path,
		title: row.title,
		description: row.description,
		hashtags: row.hashtags,
		scheduledAt: row.scheduled_at,
		status: row.status,
		error: row.error,
		isRepost: row.is_repost === 1,
	}));
}

/**
 * Update post status and archive if posted
 * @param {string} id
 * @param {'pending' | 'posted' | 'failed'} status
 * @param {string} [error]
 */
export function updatePostStatus(id, status, error = null) {
	const stmt = db.prepare(
		`UPDATE scheduled_posts SET status = ?, error = ? WHERE id = ?`
	);
	stmt.run(status, error, id);

	// If posted successfully, archive the video for future repost
	if (status === 'posted') {
		const post = db
			.prepare(`SELECT * FROM scheduled_posts WHERE id = ?`)
			.get(id);
		if (post && !post.is_repost) {
			archiveVideo(post);
		}
	}
}

// ==================== VIDEO ARCHIVE ====================

/**
 * Archive a posted video for repost system
 * @param {Object} post
 */
function archiveVideo(post) {
	const existing = db
		.prepare(`SELECT id FROM video_archive WHERE video_path = ?`)
		.get(post.video_path);
	if (existing) return; // Already archived

	const stmt = db.prepare(`
    INSERT INTO video_archive (id, chat_id, video_path, title, description, hashtags, views, likes, posted_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)
  `);

	stmt.run(
		crypto.randomUUID(),
		post.chat_id,
		post.video_path,
		post.title,
		post.description,
		post.hashtags,
		new Date().toISOString()
	);
}

/**
 * Update video stats (views, likes)
 * @param {string} videoPath
 * @param {number} views
 * @param {number} likes
 */
export function updateVideoStats(videoPath, views, likes) {
	const stmt = db.prepare(
		`UPDATE video_archive SET views = ?, likes = ? WHERE video_path = ?`
	);
	stmt.run(views, likes, videoPath);
}

/**
 * Get videos for repost - 3 oldest videos not yet reposted in current cycle
 * @param {number} chatId
 * @returns {Array|null}
 */
export function getVideosForRepost(chatId) {
	const currentCycle = parseInt(getSetting('current_repost_cycle') || '0');

	// Get 3 oldest videos not yet reposted in this cycle
	const available = db
		.prepare(
			`
    SELECT va.* FROM video_archive va
    WHERE va.chat_id = ?
    AND va.id NOT IN (
      SELECT video_id FROM repost_cycle WHERE cycle_number = ?
    )
    ORDER BY va.posted_at ASC
    LIMIT 3
  `
		)
		.all(chatId, currentCycle);

	if (available.length === 0) {
		// All videos reposted - start new cycle
		const totalVideos = db
			.prepare(`SELECT COUNT(*) as count FROM video_archive WHERE chat_id = ?`)
			.get(chatId).count;

		if (totalVideos === 0) {
			return null; // No videos to repost
		}

		// Start new cycle
		setSetting('current_repost_cycle', String(currentCycle + 1));
		return getVideosForRepost(chatId); // Recursive call with new cycle
	}

	return available; // Return up to 3 oldest videos
}

/**
 * Mark videos as reposted in current cycle
 * @param {string[]} videoIds
 */
export function markAsReposted(videoIds) {
	const currentCycle = parseInt(getSetting('current_repost_cycle') || '0');
	const stmt = db.prepare(
		`INSERT INTO repost_cycle (video_id, repost_date, cycle_number) VALUES (?, ?, ?)`
	);

	const today = new Date().toISOString().split('T')[0];
	for (const id of videoIds) {
		stmt.run(id, today, currentCycle);
	}
}

/**
 * Check if we need to schedule reposts (no pending posts for tomorrow)
 * @param {number} chatId
 * @returns {boolean}
 */
export function needsRepost(chatId) {
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	const tomorrowStr = tomorrow.toISOString().split('T')[0];

	// Check if there are pending posts for tomorrow
	const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM scheduled_posts 
    WHERE chat_id = ? AND status = 'pending' AND DATE(scheduled_at) >= ?
  `);

	const result = stmt.get(chatId, tomorrowStr);
	return result.count === 0;
}

/**
 * Schedule repost videos with new random content
 * @param {number} chatId
 */
export function scheduleReposts(chatId) {
	// Import content generator dynamically to avoid circular deps
	const { generateContentOptions } = require('../services/ai.js');

	const videos = getVideosForRepost(chatId);

	if (!videos || videos.length === 0) {
		console.log('[Repost] No videos available for repost');
		return [];
	}

	const scheduled = [];

	for (const video of videos) {
		// Generate new random content for repost
		const [content] = generateContentOptions();

		const post = addScheduledPost({
			chatId: video.chat_id,
			videoPath: video.video_path,
			title: content.title,
			description: content.description,
			hashtags: content.hashtags,
			isRepost: true,
		});

		scheduled.push(post);
		markAsReposted([video.id]);

		console.log(`[Repost] Scheduled: "${content.title.slice(0, 20)}..."`);
	}

	return scheduled;
}

// ==================== UTILITY ====================

/**
 * Get pending posts count
 * @returns {number}
 */
export function getPendingCount() {
	const stmt = db.prepare(
		`SELECT COUNT(*) as count FROM scheduled_posts WHERE status = 'pending'`
	);
	return stmt.get().count;
}

/**
 * Get all pending posts for a chat
 * @param {number} chatId
 * @returns {ScheduledPost[]}
 */
export function getPendingPostsByChat(chatId) {
	const stmt = db.prepare(`
    SELECT * FROM scheduled_posts
    WHERE chat_id = ? AND status = 'pending'
    ORDER BY scheduled_at ASC
  `);

	return stmt.all(chatId).map((row) => ({
		id: row.id,
		chatId: row.chat_id,
		videoPath: row.video_path,
		title: row.title,
		description: row.description,
		hashtags: row.hashtags,
		scheduledAt: row.scheduled_at,
		status: row.status,
		isRepost: row.is_repost === 1,
	}));
}

/**
 * Get archive stats
 * @param {number} chatId
 * @returns {{total: number, totalViews: number}}
 */
export function getArchiveStats(chatId) {
	const stmt = db.prepare(`
    SELECT COUNT(*) as total, COALESCE(SUM(views), 0) as totalViews 
    FROM video_archive WHERE chat_id = ?
  `);
	return stmt.get(chatId);
}

// ==================== VIDEO TRACKING ====================

/**
 * Check if video was already downloaded
 * @param {string} fileId - Telegram file_id
 * @returns {boolean}
 */
export function isVideoDuplicate(fileId) {
	const stmt = db.prepare(
		`SELECT file_id FROM downloaded_videos WHERE file_id = ?`
	);
	return !!stmt.get(fileId);
}

/**
 * Track downloaded video
 * @param {string} fileId
 * @param {number} chatId
 * @param {string} videoPath
 * @param {number} fileSize
 */
export function trackDownloadedVideo(fileId, chatId, videoPath, fileSize) {
	const stmt = db.prepare(`
    INSERT OR REPLACE INTO downloaded_videos (file_id, chat_id, video_path, file_size, status)
    VALUES (?, ?, ?, ?, 'pending')
  `);
	stmt.run(fileId, chatId, videoPath, fileSize);
}

/**
 * Update video status
 * @param {string} fileId
 * @param {'pending' | 'scheduled' | 'posted' | 'deleted'} status
 */
export function updateVideoStatus(fileId, status) {
	const stmt = db.prepare(
		`UPDATE downloaded_videos SET status = ? WHERE file_id = ?`
	);
	stmt.run(status, fileId);
}

/**
 * Get all downloaded videos for a chat
 * @param {number} chatId
 * @returns {Array}
 */
export function getDownloadedVideos(chatId) {
	const stmt = db.prepare(`
    SELECT * FROM downloaded_videos 
    WHERE chat_id = ? 
    ORDER BY downloaded_at DESC
    LIMIT 50
  `);
	return stmt.all(chatId);
}

/**
 * Delete a downloaded video record and file
 * @param {string} fileId
 * @returns {boolean}
 */
export function deleteDownloadedVideo(fileId) {
	const video = db
		.prepare(`SELECT video_path FROM downloaded_videos WHERE file_id = ?`)
		.get(fileId);
	if (video) {
		// Delete file if exists
		if (fs.existsSync(video.video_path)) {
			fs.unlinkSync(video.video_path);
		}
		// Delete record
		db.prepare(`DELETE FROM downloaded_videos WHERE file_id = ?`).run(fileId);
		return true;
	}
	return false;
}

/**
 * Get video stats
 * @param {number} chatId
 * @returns {{total: number, pending: number, scheduled: number, posted: number}}
 */
export function getVideoStats(chatId) {
	const stmt = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
      SUM(CASE WHEN status = 'posted' THEN 1 ELSE 0 END) as posted
    FROM downloaded_videos WHERE chat_id = ?
  `);
	return stmt.get(chatId);
}

export { db };
