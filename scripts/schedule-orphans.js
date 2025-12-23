/**
 * Schedule orphaned videos
 * Videos that are in downloaded_videos but not in scheduled_posts
 *
 * Run: bun scripts/schedule-orphans.js <chatId>
 */

import { Database } from 'bun:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/tiktok_bot.db');

const db = new Database(DB_PATH);

const chatId = process.argv[2];
if (!chatId) {
	console.log('Usage: bun scripts/schedule-orphans.js <chatId>');
	console.log('\nFinding chatId from existing posts...');
	const sample = db
		.prepare('SELECT chat_id FROM scheduled_posts LIMIT 1')
		.get();
	if (sample) {
		console.log(`Found chatId: ${sample.chat_id}`);
		console.log(`Run: bun scripts/schedule-orphans.js ${sample.chat_id}`);
	}
	process.exit(1);
}

console.log(`=== Schedule Orphaned Videos (chatId: ${chatId}) ===\n`);

// Find orphaned videos - match by filename only
const orphanedVideos = db
	.prepare(
		`
  SELECT dv.file_id, dv.video_path, dv.chat_id
  FROM downloaded_videos dv
  WHERE NOT EXISTS (
    SELECT 1 FROM scheduled_posts sp 
    WHERE sp.video_path = dv.video_path
  )
  AND dv.status != 'deleted'
`
	)
	.all();

console.log(`Found ${orphanedVideos.length} orphaned videos\n`);

if (orphanedVideos.length === 0) {
	console.log('No orphaned videos to schedule!');
	process.exit(0);
}

// Import content generator
const { generateContentOptions } = await import('../src/services/ai.js');

// Get current pending count
const pendingCount = db
	.prepare(
		"SELECT COUNT(*) as count FROM scheduled_posts WHERE status = 'pending'"
	)
	.get().count;

// Time slots - Optimized for TikTok (GMT+7)
const DAILY_SLOTS = [
	[7, 0], // Thức dậy, chuẩn bị đi làm
	[9, 30], // Giờ nghỉ giải lao buổi sáng
	[11, 30], // Nghỉ trưa - traffic cao nhất
	[13, 30], // Trước ca chiều
	[16, 30], // Giờ uể oải, chờ về
	[18, 30], // Đi làm về / chuẩn bị ăn tối
	[20, 0], // PRIME TIME - Giờ vàng
	[22, 0], // Thời gian riêng tư
	[23, 30], // "Cú đêm" - nam 20-30 hoạt động mạnh
];

// Start scheduling from next available slot
const now = new Date();
const gmt7Now = new Date(now.getTime() + 7 * 60 * 60 * 1000);
let currentDate = new Date(gmt7Now);
currentDate.setUTCHours(0, 0, 0, 0);

// Find starting day and slot based on current pending count
const startDayOffset = Math.floor(pendingCount / 9);
let slotIndex = pendingCount % 9;

currentDate.setUTCDate(currentDate.getUTCDate() + startDayOffset);

// Skip past slots for today
if (startDayOffset === 0) {
	for (let i = 0; i < DAILY_SLOTS.length; i++) {
		const [hour, minute] = DAILY_SLOTS[i];
		const testTime = new Date(currentDate);
		testTime.setUTCHours(hour - 7, minute, 0, 0); // Convert GMT+7 to UTC
		if (testTime > now) {
			slotIndex = Math.max(slotIndex, i);
			break;
		}
	}
}

const insertStmt = db.prepare(`
  INSERT INTO scheduled_posts (id, chat_id, video_path, title, description, hashtags, scheduled_at, status, is_repost)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0)
`);

let scheduled = 0;
for (const video of orphanedVideos) {
	const [hour, minute] = DAILY_SLOTS[slotIndex];

	// Create schedule time in UTC
	const scheduleTime = new Date(currentDate);
	scheduleTime.setUTCHours(hour - 7, minute, 0, 0); // GMT+7 to UTC

	// Generate content
	const [content] = generateContentOptions();
	const id = crypto.randomUUID();

	insertStmt.run(
		id,
		parseInt(chatId),
		video.video_path,
		content.title,
		content.description,
		content.hashtags,
		scheduleTime.toISOString()
	);

	// Update downloaded_videos status
	db.prepare(
		"UPDATE downloaded_videos SET status = 'scheduled' WHERE file_id = ?"
	).run(video.file_id);

	const displayDate = `${
		scheduleTime.getUTCDate() + (scheduleTime.getUTCHours() >= 17 ? 1 : 0)
	}`.padStart(2, '0');
	console.log(
		`Scheduled: ${video.video_path} -> ${hour}:${String(minute).padStart(
			2,
			'0'
		)}`
	);
	scheduled++;

	// Move to next slot
	slotIndex++;
	if (slotIndex >= DAILY_SLOTS.length) {
		slotIndex = 0;
		currentDate.setUTCDate(currentDate.getUTCDate() + 1);
	}
}

console.log(`\n=== Done! Scheduled ${scheduled} videos ===`);
db.close();
