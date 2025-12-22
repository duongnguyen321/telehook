/**
 * Database cleanup script
 * - Fix absolute paths to relative
 * - Analyze downloaded_videos vs scheduled_posts mismatch
 *
 * Run: bun scripts/fix-paths.js
 */

import { Database } from 'bun:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/tiktok_bot.db');

const db = new Database(DB_PATH);

console.log('=== Database Cleanup Script ===\n');

// 1. Fix absolute paths in scheduled_posts
console.log('1. Fixing absolute paths in scheduled_posts...');
const scheduledPosts = db
	.prepare('SELECT id, video_path FROM scheduled_posts')
	.all();
let fixedScheduled = 0;

for (const post of scheduledPosts) {
	if (post.video_path.includes('/') && !post.video_path.startsWith('data/')) {
		const filename = path.basename(post.video_path);
		db.prepare('UPDATE scheduled_posts SET video_path = ? WHERE id = ?').run(
			filename,
			post.id
		);
		fixedScheduled++;
	}
}
console.log(`   Fixed ${fixedScheduled}/${scheduledPosts.length} records\n`);

// 2. Fix absolute paths in downloaded_videos
console.log('2. Fixing absolute paths in downloaded_videos...');
const downloadedVideos = db
	.prepare('SELECT file_id, video_path FROM downloaded_videos')
	.all();
let fixedDownloaded = 0;

for (const video of downloadedVideos) {
	if (video.video_path.includes('/') && !video.video_path.startsWith('data/')) {
		const filename = path.basename(video.video_path);
		db.prepare(
			'UPDATE downloaded_videos SET video_path = ? WHERE file_id = ?'
		).run(filename, video.file_id);
		fixedDownloaded++;
	}
}
console.log(`   Fixed ${fixedDownloaded}/${downloadedVideos.length} records\n`);

// 3. Fix absolute paths in video_archive
console.log('3. Fixing absolute paths in video_archive...');
const archivedVideos = db
	.prepare('SELECT id, video_path FROM video_archive')
	.all();
let fixedArchived = 0;

for (const video of archivedVideos) {
	if (video.video_path.includes('/') && !video.video_path.startsWith('data/')) {
		const filename = path.basename(video.video_path);
		db.prepare('UPDATE video_archive SET video_path = ? WHERE id = ?').run(
			filename,
			video.id
		);
		fixedArchived++;
	}
}
console.log(`   Fixed ${fixedArchived}/${archivedVideos.length} records\n`);

// 4. Analyze mismatch between downloaded_videos and scheduled_posts
console.log('4. Analyzing record mismatch...');
const downloadedCount = db
	.prepare('SELECT COUNT(*) as count FROM downloaded_videos')
	.get().count;
const scheduledCount = db
	.prepare(
		'SELECT COUNT(*) as count FROM scheduled_posts WHERE status = "pending"'
	)
	.get().count;
const postedCount = db
	.prepare(
		'SELECT COUNT(*) as count FROM scheduled_posts WHERE status = "posted"'
	)
	.get().count;
const failedCount = db
	.prepare(
		'SELECT COUNT(*) as count FROM scheduled_posts WHERE status = "failed"'
	)
	.get().count;

console.log(`   Downloaded videos: ${downloadedCount}`);
console.log(`   Scheduled posts (pending): ${scheduledCount}`);
console.log(`   Scheduled posts (posted): ${postedCount}`);
console.log(`   Scheduled posts (failed): ${failedCount}`);
console.log(
	`   Total scheduled: ${scheduledCount + postedCount + failedCount}`
);

// Find videos in downloaded but not in scheduled
const orphanedDownloads = db
	.prepare(
		`
  SELECT dv.file_id, dv.video_path, dv.status 
  FROM downloaded_videos dv
  LEFT JOIN scheduled_posts sp ON dv.video_path = sp.video_path OR dv.video_path = sp.video_path
  WHERE sp.id IS NULL
`
	)
	.all();

console.log(
	`\n   Orphaned downloads (in downloaded_videos but not scheduled): ${orphanedDownloads.length}`
);

if (orphanedDownloads.length > 0 && orphanedDownloads.length <= 10) {
	console.log('   Orphaned files:');
	for (const o of orphanedDownloads) {
		console.log(`     - ${o.video_path} (status: ${o.status})`);
	}
}

console.log('\n=== Done ===');
db.close();
