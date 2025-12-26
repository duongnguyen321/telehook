#!/usr/bin/env bun
/**
 * Download All Videos from R2 to Local Cache
 *
 * Downloads all videos from Cloudflare R2 to data/videos/ for faster local access.
 * Skips files that already exist locally.
 *
 * Run with: bun run scripts/download-all-to-local.js
 * With warm cache: bun run scripts/download-all-to-local.js --warm-cache
 */

import 'dotenv/config';
import {
	S3Client,
	ListObjectsV2Command,
	GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Bot, InputFile } from 'grammy';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEOS_DIR = path.join(__dirname, '../data/videos');

// Parse CLI args
const args = process.argv.slice(2);
const WARM_CACHE = args.includes('--warm-cache');

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_DIR)) {
	fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

// Validate S3 credentials
if (
	!process.env.S3_ENDPOINT ||
	!process.env.S3_ACCESS_KEY_ID ||
	!process.env.S3_SECRET_ACCESS_KEY
) {
	console.error('❌ Missing S3/R2 credentials!');
	console.error('');
	console.error(
		'Please ensure these environment variables are set in your .env file:'
	);
	console.error('  S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com');
	console.error('  S3_ACCESS_KEY_ID=your_access_key_id');
	console.error('  S3_SECRET_ACCESS_KEY=your_secret_access_key');
	console.error('  S3_BUCKET=videos');
	console.error('');
	console.error('Current values:');
	console.error(
		`  S3_ENDPOINT: ${process.env.S3_ENDPOINT ? '✓ set' : '✗ missing'}`
	);
	console.error(
		`  S3_ACCESS_KEY_ID: ${
			process.env.S3_ACCESS_KEY_ID ? '✓ set' : '✗ missing'
		}`
	);
	console.error(
		`  S3_SECRET_ACCESS_KEY: ${
			process.env.S3_SECRET_ACCESS_KEY ? '✓ set' : '✗ missing'
		}`
	);
	process.exit(1);
}

// Validate warm cache requirements
if (WARM_CACHE) {
	if (!process.env.TELEGRAM_BOT_TOKEN) {
		console.error('❌ TELEGRAM_BOT_TOKEN is required for --warm-cache');
		process.exit(1);
	}
	if (!process.env.ADMIN_USER_ID) {
		console.error('❌ ADMIN_USER_ID is required for --warm-cache');
		console.error('Set the Telegram user ID to send videos to for caching.');
		process.exit(1);
	}
}

// R2 Client
const s3Client = new S3Client({
	endpoint: process.env.S3_ENDPOINT,
	region: 'auto',
	credentials: {
		accessKeyId: process.env.S3_ACCESS_KEY_ID,
		secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
	},
	forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET || 'videos';

// Prisma client for database access
const prisma = new PrismaClient();

// Bot for warm cache (lazy init)
let bot = null;

async function listAllVideos() {
	const videos = [];
	let continuationToken = undefined;

	do {
		const command = new ListObjectsV2Command({
			Bucket: BUCKET,
			MaxKeys: 1000,
			ContinuationToken: continuationToken,
		});

		const response = await s3Client.send(command);
		const files = response.Contents || [];

		for (const file of files) {
			if (file.Key && file.Key.endsWith('.mp4')) {
				videos.push({
					key: file.Key,
					size: file.Size,
				});
			}
		}

		continuationToken = response.NextContinuationToken;
	} while (continuationToken);

	return videos;
}

async function downloadFile(key) {
	const localPath = path.join(VIDEOS_DIR, key);

	// Skip if already exists
	if (fs.existsSync(localPath)) {
		return { status: 'skipped', key, localPath };
	}

	try {
		const command = new GetObjectCommand({
			Bucket: BUCKET,
			Key: key,
		});

		const response = await s3Client.send(command);

		// Stream to buffer then write
		const chunks = [];
		for await (const chunk of response.Body) {
			chunks.push(chunk);
		}
		const buffer = Buffer.concat(chunks);

		fs.writeFileSync(localPath, buffer);
		return { status: 'downloaded', key, size: buffer.length, localPath };
	} catch (error) {
		return { status: 'failed', key, error: error.message };
	}
}

/**
 * Find post by video filename and update its telegramFileId
 */
async function warmCacheForVideo(key, localPath) {
	// Find post by videoPath (ends with this key)
	const post = await prisma.scheduledPost.findFirst({
		where: {
			videoPath: { endsWith: key },
			telegramFileId: null, // Only update if not already cached
		},
	});

	if (!post) {
		return { status: 'no_post', key };
	}

	// Initialize bot if needed
	if (!bot) {
		bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
	}

	const adminId = parseInt(process.env.ADMIN_USER_ID);

	try {
		// Send video to admin to get file_id
		const sentMessage = await bot.api.sendVideo(
			adminId,
			new InputFile(localPath),
			{
				caption: `🔄 Warming cache: ${key}`,
				disable_notification: true,
			}
		);

		const fileId = sentMessage.video?.file_id;
		if (!fileId) {
			return { status: 'no_file_id', key };
		}

		// Save file_id to database
		await prisma.scheduledPost.update({
			where: { id: post.id },
			data: { telegramFileId: fileId },
		});

		// Delete the cache message to keep admin chat clean
		try {
			await bot.api.deleteMessage(adminId, sentMessage.message_id);
		} catch (e) {
			// Ignore deletion errors
		}

		return { status: 'cached', key, postId: post.id };
	} catch (error) {
		return { status: 'error', key, error: error.message };
	}
}

function formatBytes(bytes) {
	if (bytes < 1024) return bytes + ' B';
	if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
	if (bytes < 1024 * 1024 * 1024)
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

async function main() {
	console.log('🔍 Listing all videos in R2...');
	const videos = await listAllVideos();
	console.log(`Found ${videos.length} videos in R2\n`);

	if (videos.length === 0) {
		console.log('No videos to download.');
		return;
	}

	// Calculate total size
	const totalSize = videos.reduce((sum, v) => sum + (v.size || 0), 0);
	console.log(`Total size: ${formatBytes(totalSize)}`);

	if (WARM_CACHE) {
		console.log(
			'⚡ Warm cache mode enabled - will send videos to Telegram to get file_ids\n'
		);
	}
	console.log('');

	let downloaded = 0;
	let skipped = 0;
	let failed = 0;
	let downloadedBytes = 0;
	let cached = 0;
	let cacheSkipped = 0;

	console.log('📥 Downloading videos to local cache...\n');

	for (let i = 0; i < videos.length; i++) {
		const video = videos[i];
		const result = await downloadFile(video.key);

		if (result.status === 'downloaded') {
			downloaded++;
			downloadedBytes += result.size;
			process.stdout.write(`✓`);
		} else if (result.status === 'skipped') {
			skipped++;
			process.stdout.write(`.`);
		} else {
			failed++;
			process.stdout.write(`x`);
			console.error(`\nFailed: ${video.key} - ${result.error}`);
		}

		// Warm cache if enabled and file exists locally
		if (WARM_CACHE && result.localPath) {
			const cacheResult = await warmCacheForVideo(video.key, result.localPath);
			if (cacheResult.status === 'cached') {
				cached++;
				process.stdout.write(`⚡`);
			} else if (
				cacheResult.status === 'no_post' ||
				cacheResult.status === 'no_file_id'
			) {
				cacheSkipped++;
			} else if (cacheResult.status === 'error') {
				console.error(`\nCache error: ${video.key} - ${cacheResult.error}`);
			}
		}

		// Progress update every 50 files
		if ((i + 1) % 50 === 0) {
			console.log(` [${i + 1}/${videos.length}]`);
		}
	}

	console.log('\n\n' + '='.repeat(50));
	console.log('✅ Download Complete');
	console.log('='.repeat(50));
	console.log(`Downloaded: ${downloaded} (${formatBytes(downloadedBytes)})`);
	console.log(`Skipped:    ${skipped} (already local)`);
	console.log(`Failed:     ${failed}`);

	if (WARM_CACHE) {
		console.log('');
		console.log('⚡ Cache Warm-up:');
		console.log(`   Cached:  ${cached} (file_id saved)`);
		console.log(
			`   Skipped: ${cacheSkipped} (no matching post or already cached)`
		);
	}

	console.log(`\nLocal cache: ${VIDEOS_DIR}`);

	// Disconnect Prisma
	await prisma.$disconnect();
}

main().catch(async (err) => {
	console.error('Fatal error:', err);
	await prisma.$disconnect();
	process.exit(1);
});
