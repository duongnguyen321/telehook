#!/usr/bin/env bun
/**
 * Upscale Existing Videos Script
 *
 * Finds and upscales videos that are below 1080p resolution.
 * This script is meant to be run for videos that were uploaded
 * before the automatic upscaling feature was enabled.
 *
 * Usage:
 *   bun run scripts/upscale-existing.js [options]
 *
 * Options:
 *   --dry-run     Preview what would be upscaled without making changes
 *   --limit N     Process only N videos (useful for testing)
 *   --skip N      Skip first N videos (for resuming)
 */

import 'dotenv/config';
import {
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
	DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { Bot, InputFile } from 'grammy';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
// Since I can't easily install packages, I'll implement a simple semaphore queue.

/**
 * Simple concurrency limiter
 * @param {number} concurrency
 * @returns {Function}
 */
function createLimit(concurrency) {
	const queue = [];
	let active = 0;

	const next = () => {
		if (queue.length > 0 && active < concurrency) {
			active++;
			const { fn, resolve, reject } = queue.shift();
			fn()
				.then(resolve)
				.catch(reject)
				.finally(() => {
					active--;
					next();
				});
		}
	};

	return (fn) =>
		new Promise((resolve, reject) => {
			queue.push({ fn, resolve, reject });
			next();
		});
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const VIDEOS_DIR = path.join(DATA_DIR, 'videos');

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = args.includes('--limit')
	? parseInt(args[args.indexOf('--limit') + 1]) || Infinity
	: Infinity;
const SKIP = args.includes('--skip')
	? parseInt(args[args.indexOf('--skip') + 1]) || 0
	: 0;
const FORCE = args.includes('--force');
const CONCURRENCY = args.includes('--concurrency')
	? parseInt(args[args.indexOf('--concurrency') + 1]) || 3
	: 3; // Default 3 parallel processes

// Prisma client
const prisma = new PrismaClient();

// S3/R2 client
const s3Client = process.env.S3_ENDPOINT
	? new S3Client({
			endpoint: process.env.S3_ENDPOINT,
			region: 'auto',
			credentials: {
				accessKeyId: process.env.S3_ACCESS_KEY_ID,
				secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
			},
			forcePathStyle: true,
	  })
	: null;

const BUCKET = process.env.S3_BUCKET || 'videos';
const MIN_RESOLUTION = 720; // Minimum resolution on smallest dimension
const MAX_SIZE_BITS = 19 * 1024 * 1024 * 8; // 19MB in bits (Telegram limit is 20MB)

// Telegram Bot for warm cache (lazy init)
let bot = null;

/**
 * Initialize Telegram bot
 */
function initBot() {
	if (!process.env.TELEGRAM_BOT_TOKEN) {
		console.error('❌ TELEGRAM_BOT_TOKEN is required for warm cache');
		process.exit(1);
	}
	if (!process.env.ADMIN_USER_ID) {
		console.error('❌ ADMIN_USER_ID is required for warm cache');
		process.exit(1);
	}
	bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
	return bot;
}

/**
 * Upload video to Telegram and get file_id
 * @param {string} videoPath - Path to video file
 * @param {string} videoKey - Video filename for caption
 * @returns {Promise<string|null>} - Telegram file_id or null
 */
async function warmCacheToTelegram(videoPath, videoKey) {
	if (!bot) initBot();

	const adminId = parseInt(process.env.ADMIN_USER_ID);

	try {
		// Send video to admin to get file_id
		const sentMessage = await bot.api.sendVideo(
			adminId,
			new InputFile(videoPath),
			{
				caption: `🔄 Upscale cache: ${videoKey}`,
				disable_notification: true,
			}
		);

		const fileId = sentMessage.video?.file_id;

		// Delete the cache message to keep admin chat clean
		try {
			await bot.api.deleteMessage(adminId, sentMessage.message_id);
		} catch (e) {
			// Ignore deletion errors
		}

		return fileId || null;
	} catch (error) {
		console.error(`[Telegram] Failed to warm cache: ${error.message}`);
		return null;
	}
}

/**
 * Get video duration using ffprobe
 * @param {string} videoPath
 * @returns {Promise<number>} Duration in seconds
 */
async function getVideoDuration(videoPath) {
	return new Promise((resolve) => {
		const proc = spawn('ffprobe', [
			'-v',
			'error',
			'-show_entries',
			'format=duration',
			'-of',
			'default=noprint_wrappers=1:nokey=1',
			videoPath,
		]);

		let stdout = '';
		proc.stdout.on('data', (d) => (stdout += d.toString()));
		proc.on('close', () => resolve(parseFloat(stdout.trim()) || 0));
		proc.on('error', () => resolve(0));
	});
}

/**
 * Get video resolution using ffprobe
 * @param {string} videoPath
 * @returns {Promise<{width: number, height: number} | null>}
 */
async function getVideoResolution(videoPath) {
	return new Promise((resolve) => {
		const proc = spawn('ffprobe', [
			'-v',
			'error',
			'-select_streams',
			'v:0',
			'-show_entries',
			'stream=width,height',
			'-of',
			'csv=p=0',
			videoPath,
		]);

		let stdout = '';
		proc.stdout.on('data', (data) => (stdout += data.toString()));
		proc.on('close', (code) => {
			if (code !== 0) {
				resolve(null);
				return;
			}
			const parts = stdout.trim().split(',');
			if (parts.length >= 2) {
				resolve({
					width: parseInt(parts[0]),
					height: parseInt(parts[1]),
				});
			} else {
				resolve(null);
			}
		});
		proc.on('error', () => resolve(null));
	});
}

/**
 * Download video from S3 to local path
 * @param {string} key
 * @param {string} destPath
 * @returns {Promise<boolean>}
 */
async function downloadFromS3(key, destPath) {
	if (!s3Client) return false;

	try {
		const command = new GetObjectCommand({
			Bucket: BUCKET,
			Key: key,
		});

		const response = await s3Client.send(command);
		const chunks = [];
		for await (const chunk of response.Body) {
			chunks.push(chunk);
		}
		fs.writeFileSync(destPath, Buffer.concat(chunks));
		return true;
	} catch (error) {
		console.error(`[S3] Download failed: ${error.message}`);
		return false;
	}
}

/**
 * Upload video to S3
 * @param {string} filePath
 * @param {string} key
 * @returns {Promise<boolean>}
 */
async function uploadToS3(filePath, key) {
	if (!s3Client) return false;

	try {
		const fileContent = fs.readFileSync(filePath);
		const command = new PutObjectCommand({
			Bucket: BUCKET,
			Key: key,
			Body: fileContent,
			ContentType: 'video/mp4',
		});

		await s3Client.send(command);
		return true;
	} catch (error) {
		console.error(`[S3] Upload failed: ${error.message}`);
		return false;
	}
}

/**
 * Delete video from S3
 * @param {string} key
 * @returns {Promise<boolean>}
 */
async function deleteFromS3(key) {
	if (!s3Client) return false;

	try {
		const command = new DeleteObjectCommand({
			Bucket: BUCKET,
			Key: key,
		});

		await s3Client.send(command);
		return true;
	} catch (error) {
		console.error(`[S3] Delete failed: ${error.message}`);
		return false;
	}
}

/**
 * Upscale video to 720p with size limit for Telegram
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {number} duration - Video duration in seconds
 * @returns {Promise<boolean>}
 */
async function upscaleVideo(inputPath, outputPath, duration) {
	// Calculate bitrate to fit in 19MB (same logic as videoProcessor.js)
	let bitrate = 2000;
	if (duration > 0) {
		// Bitrate (kbps) = MaxSize (bits) / Duration (s) / 1024
		const maxBitrate = Math.floor(MAX_SIZE_BITS / duration / 1024);
		// Cap at 2500k for HD quality, but respect max size
		bitrate = Math.min(2500, maxBitrate);
		// Ensure minimum viable bitrate (e.g. 500k)
		bitrate = Math.max(500, bitrate);
	}

	console.log(`[Upscale] Bitrate: ${bitrate}k for ${duration.toFixed(1)}s`);

	return new Promise((resolve) => {
		// Detect OS for hardware acceleration
		const isMac = os.platform() === 'darwin';
		const videoCodec = isMac ? 'h264_videotoolbox' : 'libx264';

		const args = [
			'-y',
			'-i',
			inputPath,
			'-vf',
			"scale='if(gt(iw,ih),-2,720)':'if(gt(iw,ih),720,-2)':flags=lanczos,unsharp=5:5:1.0:5:5:0.0",
			'-c:v',
			videoCodec, // Use hardware acceleration if available
			// '-preset' is not used with videotoolbox, but harmless used with libx264
		];

		if (isMac) {
			// VideoToolbox specific params
			args.push(
				'-b:v',
				`${bitrate}k`,
				'-maxrate',
				`${bitrate}k`
				// videotoolbox doesn't support bufsize or crf in the same way
			);
		} else {
			// Software encoding params
			args.push(
				'-preset',
				'faster',
				'-b:v',
				`${bitrate}k`,
				'-maxrate',
				`${bitrate}k`,
				'-bufsize',
				`${bitrate * 2}k`
			);
		}

		args.push('-c:a', 'copy', '-fs', '19900000', outputPath);

		const proc = spawn('ffmpeg', args);
		let stderr = '';

		proc.stderr.on('data', (data) => {
			stderr += data.toString();
		});

		proc.on('close', (code) => {
			if (code === 0) {
				resolve(true);
			} else {
				console.error(`[FFmpeg] Failed: ${stderr.slice(-200)}`);
				resolve(false);
			}
		});

		proc.on('error', (err) => {
			console.error(`[FFmpeg] Error: ${err.message}`);
			resolve(false);
		});
	});
}

/**
 * Process a single video
 * @param {Object} post
 * @returns {Promise<{status: string, message: string}>}
 */
async function processVideo(post) {
	const videoKey = path.basename(post.videoPath);
	const tempDir = path.join(os.tmpdir(), `upscale_check_${Date.now()}`);
	const localPath = path.join(VIDEOS_DIR, videoKey);

	try {
		// Create temp directory
		if (!fs.existsSync(tempDir)) {
			fs.mkdirSync(tempDir, { recursive: true });
		}

		let inputPath = localPath;

		// Check if file exists locally
		if (!fs.existsSync(localPath)) {
			if (s3Client) {
				// Download from S3
				inputPath = path.join(tempDir, videoKey);
				const downloaded = await downloadFromS3(videoKey, inputPath);
				if (!downloaded) {
					return { status: 'error', message: 'Failed to download from S3' };
				}
			} else {
				return {
					status: 'error',
					message: 'File not found locally and S3 not configured',
				};
			}
		}

		// Get current resolution
		const resolution = await getVideoResolution(inputPath);
		if (!resolution) {
			return { status: 'error', message: 'Failed to get video resolution' };
		}

		const minDim = Math.min(resolution.width, resolution.height);

		// Perfect 720p check (allow small tolerance 710-730)
		const is720p = minDim >= 710 && minDim <= 730;

		if (is720p) {
			return {
				status: 'skip',
				message: `Already 720p (${resolution.width}x${resolution.height}) - Skipping to protect quality`,
			};
		}

		if (minDim >= MIN_RESOLUTION && !FORCE) {
			return {
				status: 'skip',
				message: `Already ${resolution.width}x${resolution.height} (>= ${MIN_RESOLUTION}p)`,
			};
		}

		// Need to upscale (or downscale/fix if forced)
		const action = FORCE && minDim > 730 ? 'downscale-fix' : 'upscale';

		if (DRY_RUN) {
			return {
				status: 'would_upscale',
				message: `${resolution.width}x${resolution.height} -> 720p (${action})`,
			};
		}

		// Get video duration for bitrate calculation
		const duration = await getVideoDuration(inputPath);
		if (duration <= 0) {
			return { status: 'error', message: 'Failed to get video duration' };
		}

		// Perform upscale with size limit
		const outputPath = path.join(tempDir, `upscaled_${videoKey}`);
		const success = await upscaleVideo(inputPath, outputPath, duration);

		if (!success || !fs.existsSync(outputPath)) {
			return { status: 'error', message: 'Upscale failed' };
		}

		// Get new file size
		const oldSize = fs.statSync(inputPath).size;
		const newSize = fs.statSync(outputPath).size;

		// Check if output exceeds 20MB limit
		if (newSize > 20 * 1024 * 1024) {
			return {
				status: 'error',
				message: `Output too large: ${(newSize / 1024 / 1024).toFixed(
					1
				)}MB > 20MB`,
			};
		}

		// Upload to S3 if configured
		if (s3Client) {
			const uploaded = await uploadToS3(outputPath, videoKey);
			if (!uploaded) {
				return { status: 'error', message: 'Failed to upload to S3' };
			}
		}

		// Update local file if it exists locally
		if (fs.existsSync(localPath)) {
			fs.copyFileSync(outputPath, localPath);
		}

		// Warm cache: Upload to Telegram and get file_id
		const fileId = await warmCacheToTelegram(outputPath, videoKey);

		// Update database with new video path and telegramFileId
		await prisma.scheduledPost.update({
			where: { id: post.id },
			data: { telegramFileId: fileId }, // null if warm cache failed
		});

		const sizeDiff = (((newSize - oldSize) / oldSize) * 100).toFixed(1);
		const cacheStatus = fileId ? '✓cached' : '⚠️no-cache';
		return {
			status: 'upscaled',
			message: `${resolution.width}x${
				resolution.height
			} -> 720p (${cacheStatus}, size: ${sizeDiff > 0 ? '+' : ''}${sizeDiff}%)`,
		};
	} catch (error) {
		return { status: 'error', message: error.message };
	} finally {
		// Cleanup temp directory
		try {
			if (fs.existsSync(tempDir)) {
				fs.rmSync(tempDir, { recursive: true, force: true });
			}
		} catch (e) {
			// Ignore cleanup errors
		}
	}
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
	if (bytes < 1024) return bytes + ' B';
	if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
	if (bytes < 1024 * 1024 * 1024)
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

async function main() {
	console.log('🎬 Upscale Existing Videos Script');
	console.log('='.repeat(50));

	if (DRY_RUN) {
		console.log('⚠️  DRY RUN MODE - No changes will be made\n');
	}

	// Check ffmpeg
	try {
		const ffmpegCheck = spawn('ffmpeg', ['-version']);
		await new Promise((resolve, reject) => {
			ffmpegCheck.on('close', (code) =>
				code === 0 ? resolve(true) : reject()
			);
			ffmpegCheck.on('error', reject);
		});
	} catch (e) {
		console.error('❌ ffmpeg not found! Please install ffmpeg first.');
		process.exit(1);
	}

	// Fetch all videos
	console.log('📂 Fetching videos from database...');
	const posts = await prisma.scheduledPost.findMany({
		orderBy: { scheduledAt: 'asc' },
		skip: SKIP,
		take: LIMIT === Infinity ? undefined : LIMIT,
	});

	console.log(`Found ${posts.length} videos to check\n`);

	if (posts.length === 0) {
		console.log('No videos to process.');
		await prisma.$disconnect();
		return;
	}

	// Process videos
	const stats = {
		total: posts.length,
		skipped: 0,
		upscaled: 0,
		wouldUpscale: 0,
		errors: 0,
	};

	// Process videos with concurrency
	const limit = createLimit(CONCURRENCY);
	const promises = [];

	for (let i = 0; i < posts.length; i++) {
		const post = posts[i];
		const index = i; // capture index

		promises.push(
			limit(async () => {
				const videoKey = path.basename(post.videoPath);
				// Use console.log with newline to prevent overwrite in parallel output
				console.log(
					`[${index + 1}/${posts.length}] Starting ${videoKey.slice(0, 30)}...`
				);

				const result = await processVideo(post);

				switch (result.status) {
					case 'skip':
						stats.skipped++;
						console.log(
							`[${index + 1}/${posts.length}] ⏭️  ${
								result.message
							} - ${videoKey}`
						);
						break;
					case 'upscaled':
						stats.upscaled++;
						console.log(
							`[${index + 1}/${posts.length}] ✅ ${
								result.message
							} - ${videoKey}`
						);
						break;
					case 'would_upscale':
						stats.wouldUpscale++;
						console.log(
							`[${index + 1}/${posts.length}] 🔍 ${
								result.message
							} - ${videoKey}`
						);
						break;
					case 'error':
						stats.errors++;
						console.error(
							`[${index + 1}/${posts.length}] ❌ ${
								result.message
							} - ${videoKey}`
						);
						break;
				}
			})
		);
	}

	await Promise.all(promises);

	// Summary
	console.log('\n' + '='.repeat(50));
	console.log('📊 Summary');
	console.log('='.repeat(50));
	console.log(`Total processed: ${stats.total}`);
	console.log(`Already HD:      ${stats.skipped}`);

	if (DRY_RUN) {
		console.log(`Would upscale:   ${stats.wouldUpscale}`);
	} else {
		console.log(`Upscaled:        ${stats.upscaled}`);
	}

	console.log(`Errors:          ${stats.errors}`);

	await prisma.$disconnect();
}

main().catch(async (err) => {
	console.error('Fatal error:', err);
	await prisma.$disconnect();
	process.exit(1);
});
