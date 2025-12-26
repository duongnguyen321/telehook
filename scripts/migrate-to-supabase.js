#!/usr/bin/env bun
/**
 * Migration Script: SQLite → Supabase PostgreSQL + S3
 *
 * This script:
 * 1. Uploads all video files from data/videos/ to S3
 * 2. Migrates all SQLite data to Supabase PostgreSQL
 *
 * Run with: bun run scripts/migrate-to-supabase.js
 *
 * Options:
 *   --dry-run    Show what would be migrated without making changes
 *   --files-only Only migrate files to S3
 *   --data-only  Only migrate database data
 */

import 'dotenv/config';
import { Database } from 'bun:sqlite';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const VIDEOS_DIR = path.join(DATA_DIR, 'videos');
const SQLITE_PATH = path.join(DATA_DIR, 'tiktok_bot.db');

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FILES_ONLY = args.includes('--files-only');
const DATA_ONLY = args.includes('--data-only');

// S3 imports (dynamic to avoid loading if not needed)
let s3UploadVideo, isS3Enabled;

// Initialize Prisma for Supabase PostgreSQL
const prisma = new PrismaClient();

// Colors for console output
const colors = {
	reset: '\x1b[0m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	red: '\x1b[31m',
	cyan: '\x1b[36m',
	dim: '\x1b[2m',
};

function log(message, color = 'reset') {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function logProgress(current, total, label) {
	const percent = Math.round((current / total) * 100);
	const bar =
		'█'.repeat(Math.floor(percent / 5)) +
		'░'.repeat(20 - Math.floor(percent / 5));
	process.stdout.write(`\r[${bar}] ${percent}% | ${current}/${total} ${label}`);
	if (current === total) console.log('');
}

// ==================== FILE MIGRATION (S3) ====================

async function migrateFilesToS3() {
	log('\n📁 MIGRATING FILES TO S3', 'cyan');
	log('='.repeat(50), 'dim');

	// Load S3 module
	const s3Module = await import('../src/utils/s3.js');
	s3UploadVideo = s3Module.uploadVideo;
	isS3Enabled = s3Module.isS3Enabled;
	const s3VideoExists = s3Module.videoExists;

	if (!isS3Enabled()) {
		log('❌ S3 is not configured. Check S3_* environment variables.', 'red');
		return { success: 0, failed: 0, skipped: 0 };
	}

	if (!fs.existsSync(VIDEOS_DIR)) {
		log('❌ Videos directory not found: ' + VIDEOS_DIR, 'red');
		return { success: 0, failed: 0, skipped: 0 };
	}

	const files = fs.readdirSync(VIDEOS_DIR).filter((f) => f.endsWith('.mp4'));
	log(`Found ${files.length} video files to check`, 'yellow');

	if (DRY_RUN) {
		log('🔍 DRY RUN - No files will be uploaded', 'yellow');
		files.forEach((f) => log(`  Would upload: ${f}`, 'dim'));
		return { success: 0, failed: 0, skipped: files.length };
	}

	let success = 0,
		failed = 0,
		skipped = 0;

	for (let i = 0; i < files.length; i++) {
		const fileName = files[i];
		const filePath = path.join(VIDEOS_DIR, fileName);

		try {
			// Check if file already exists in S3
			const exists = await s3VideoExists(fileName);
			if (exists) {
				skipped++;
				logProgress(i + 1, files.length, `files (skip: ${skipped})`);
				continue;
			}

			const uploaded = await s3UploadVideo(filePath, fileName);
			if (uploaded) {
				success++;
				log(`\n✅ Uploaded: ${fileName}`, 'green');
			} else {
				failed++;
			}
		} catch (error) {
			log(`\n❌ Failed to upload ${fileName}: ${error.message}`, 'red');
			failed++;
		}

		logProgress(
			i + 1,
			files.length,
			`files (new: ${success}, skip: ${skipped})`
		);
	}

	log(
		`\n✅ S3 Migration Complete: ${success} uploaded, ${skipped} already existed, ${failed} failed`,
		'green'
	);
	return { success, failed, skipped };
}

// ==================== DATABASE MIGRATION ====================

async function migrateDatabase() {
	log('\n💾 MIGRATING DATABASE TO SUPABASE', 'cyan');
	log('='.repeat(50), 'dim');

	if (!fs.existsSync(SQLITE_PATH)) {
		log('❌ SQLite database not found: ' + SQLITE_PATH, 'red');
		return { tables: {}, errors: [] };
	}

	const sqlite = new Database(SQLITE_PATH);
	const results = { tables: {}, errors: [] };

	// Define migration order (respecting foreign keys)
	const tables = [
		{ name: 'settings', mapFn: mapSettings },
		{ name: 'users', mapFn: mapUsers },
		{ name: 'scheduled_posts', mapFn: mapScheduledPosts },
		{ name: 'video_archive', mapFn: mapVideoArchive },
		{ name: 'repost_cycle', mapFn: mapRepostCycle },
		{ name: 'downloaded_videos', mapFn: mapDownloadedVideos },
		{ name: 'audit_logs', mapFn: mapAuditLogs },
	];

	for (const { name, mapFn } of tables) {
		log(`\n📋 Migrating table: ${name}`, 'yellow');

		try {
			const rows = sqlite.prepare(`SELECT * FROM ${name}`).all();
			log(`  Found ${rows.length} rows`, 'dim');

			if (DRY_RUN) {
				log(`  🔍 DRY RUN - Would migrate ${rows.length} rows`, 'yellow');
				results.tables[name] = { migrated: 0, skipped: rows.length };
				continue;
			}

			let migrated = 0,
				skipped = 0;

			for (let i = 0; i < rows.length; i++) {
				try {
					await mapFn(rows[i]);
					migrated++;
				} catch (error) {
					if (error.code === 'P2002') {
						// Unique constraint - record already exists
						skipped++;
					} else {
						results.errors.push(`${name}[${i}]: ${error.message}`);
						skipped++;
					}
				}

				if (rows.length > 10) {
					logProgress(i + 1, rows.length, 'rows');
				}
			}

			results.tables[name] = { migrated, skipped };
			log(`  ✅ Migrated: ${migrated}, Skipped: ${skipped}`, 'green');
		} catch (error) {
			log(`  ❌ Error: ${error.message}`, 'red');
			results.errors.push(`${name}: ${error.message}`);
		}
	}

	sqlite.close();
	return results;
}

// ==================== TABLE MAPPING FUNCTIONS ====================

async function mapSettings(row) {
	await prisma.setting.upsert({
		where: { key: row.key },
		update: { value: row.value },
		create: { key: row.key, value: row.value },
	});
}

async function mapUsers(row) {
	await prisma.user.upsert({
		where: { telegramId: BigInt(row.telegram_id) },
		update: {
			username: row.username,
			firstName: row.first_name,
			lastName: row.last_name,
			role: row.role,
			lastActiveAt: parseDate(row.last_active_at),
		},
		create: {
			telegramId: BigInt(row.telegram_id),
			username: row.username,
			firstName: row.first_name || 'Unknown',
			lastName: row.last_name,
			role: row.role || 'user',
			createdAt: parseDate(row.created_at),
			lastActiveAt: parseDate(row.last_active_at),
		},
	});
}

async function mapScheduledPosts(row) {
	await prisma.scheduledPost.upsert({
		where: { id: row.id },
		update: {},
		create: {
			id: row.id,
			chatId: BigInt(row.chat_id),
			videoPath: row.video_path,
			title: row.title,
			hashtags: row.hashtags,
			scheduledAt: parseDate(row.scheduled_at),
			status: row.status || 'pending',
			error: row.error,
			createdAt: parseDate(row.created_at),
			isRepost: Boolean(row.is_repost),
			telegramFileId: row.telegram_file_id,
			notificationSent: Boolean(row.notification_sent),
		},
	});
}

async function mapVideoArchive(row) {
	await prisma.videoArchive.upsert({
		where: { id: row.id },
		update: {},
		create: {
			id: row.id,
			chatId: BigInt(row.chat_id),
			videoPath: row.video_path,
			title: row.title,
			hashtags: row.hashtags,
			views: row.views || 0,
			likes: row.likes || 0,
			postedAt: parseDate(row.posted_at),
			lastRepostAt: row.last_repost_at ? parseDate(row.last_repost_at) : null,
			repostCount: row.repost_count || 0,
		},
	});
}

async function mapRepostCycle(row) {
	await prisma.repostCycle.create({
		data: {
			videoId: row.video_id,
			repostDate: parseDate(row.repost_date),
			cycleNumber: row.cycle_number || 1,
		},
	});
}

async function mapDownloadedVideos(row) {
	await prisma.downloadedVideo.upsert({
		where: { fileId: row.file_id },
		update: {},
		create: {
			fileId: row.file_id,
			chatId: BigInt(row.chat_id),
			videoPath: row.video_path,
			fileSize: row.file_size,
			downloadedAt: parseDate(row.downloaded_at),
			status: row.status || 'pending',
		},
	});
}

async function mapAuditLogs(row) {
	await prisma.auditLog.create({
		data: {
			telegramId: BigInt(row.telegram_id),
			action: row.action,
			targetId: row.target_id,
			details: row.details,
			createdAt: parseDate(row.created_at),
		},
	});
}

// ==================== HELPER FUNCTIONS ====================

function parseDate(dateString) {
	if (!dateString) return new Date();

	// Handle ISO strings
	if (dateString.includes('T') || dateString.includes('-')) {
		return new Date(dateString);
	}

	// Handle SQLite CURRENT_TIMESTAMP format
	return new Date(dateString);
}

// ==================== MAIN ====================

async function main() {
	log('\n🚀 SUPABASE MIGRATION SCRIPT', 'cyan');
	log('='.repeat(50), 'cyan');

	if (DRY_RUN) {
		log('🔍 DRY RUN MODE - No changes will be made', 'yellow');
	}

	const startTime = Date.now();
	let fileResults = { success: 0, failed: 0, skipped: 0 };
	let dbResults = { tables: {}, errors: [] };

	try {
		// Test Supabase connection
		log('\n🔌 Testing Supabase connection...', 'yellow');
		await prisma.$connect();
		log('✅ Connected to Supabase PostgreSQL', 'green');

		// Migrate files to S3
		if (!DATA_ONLY) {
			fileResults = await migrateFilesToS3();
		}

		// Migrate database
		if (!FILES_ONLY) {
			dbResults = await migrateDatabase();
		}
	} catch (error) {
		log(`\n❌ Migration failed: ${error.message}`, 'red');
		console.error(error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}

	// Summary
	const duration = ((Date.now() - startTime) / 1000).toFixed(1);

	log('\n' + '='.repeat(50), 'cyan');
	log('📊 MIGRATION SUMMARY', 'cyan');
	log('='.repeat(50), 'cyan');

	if (!DATA_ONLY) {
		log(`\n📁 Files (S3):`, 'yellow');
		log(`   Uploaded: ${fileResults.success}`, 'green');
		log(
			`   Failed: ${fileResults.failed}`,
			fileResults.failed > 0 ? 'red' : 'dim'
		);
		log(`   Skipped: ${fileResults.skipped}`, 'dim');
	}

	if (!FILES_ONLY) {
		log(`\n💾 Database:`, 'yellow');
		for (const [table, counts] of Object.entries(dbResults.tables)) {
			log(
				`   ${table}: ${counts.migrated} migrated, ${counts.skipped} skipped`,
				'dim'
			);
		}

		if (dbResults.errors.length > 0) {
			log(`\n⚠️ Errors (${dbResults.errors.length}):`, 'red');
			dbResults.errors.slice(0, 10).forEach((e) => log(`   ${e}`, 'dim'));
			if (dbResults.errors.length > 10) {
				log(`   ... and ${dbResults.errors.length - 10} more`, 'dim');
			}
		}
	}

	log(`\n⏱️ Duration: ${duration}s`, 'dim');
	log('\n✅ Migration complete!', 'green');
}

main().catch(console.error);
