/**
 * Migration Script: Update video durations using ffprobe
 *
 * This script updates existing videos that have INTEGER duration values
 * (from Telegram API) to precise values from ffprobe.
 *
 * It SKIPS videos that already have decimal durations (already processed).
 *
 * Usage: node scripts/update-durations.js
 */

import { prisma } from '../src/utils/storage.js';
import { getVideoDuration } from '../src/services/videoProcessor.js';
import {
	downloadVideo as s3DownloadVideo,
	isS3Enabled,
} from '../src/utils/s3.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

const DATA_DIR = path.join(process.cwd(), 'data');
const VIDEOS_DIR = path.join(DATA_DIR, 'videos');

async function updateDurations() {
	console.log('=== Updating Video Durations ===\n');

	// Get ONLY videos with integer duration (not yet processed)
	const videos = await prisma.scheduledPost.findMany({
		where: {
			status: { in: ['pending', 'posted'] },
			duration: { not: null },
		},
		select: {
			id: true,
			videoPath: true,
			duration: true,
		},
	});

	// Filter to only videos with integer durations (from Telegram)
	// Use 0.005 tolerance to handle floating point and .001 markers
	const needsUpdate = videos.filter((v) => {
		if (v.duration === null) return false;
		const decimalPart = Math.abs(v.duration - Math.round(v.duration));
		// Skip if already has a meaningful decimal (> 0.005)
		return decimalPart < 0.005;
	});

	console.log(`Total videos: ${videos.length}`);
	console.log(
		`Already precise (skipped): ${videos.length - needsUpdate.length}`
	);
	console.log(`Need update: ${needsUpdate.length}\n`);

	if (needsUpdate.length === 0) {
		console.log('All videos already have precise durations!');
		await prisma.$disconnect();
		return;
	}

	let updated = 0;
	let failed = 0;
	let skipped = 0;

	for (let i = 0; i < needsUpdate.length; i++) {
		const video = needsUpdate[i];
		const videoKey = path.basename(video.videoPath);
		const localPath = path.join(VIDEOS_DIR, videoKey);

		process.stdout.write(`[${i + 1}/${needsUpdate.length}] ${videoKey}: `);

		try {
			let durationSourcePath = localPath;
			let needsCleanup = false;

			// Check if file exists locally
			if (!fs.existsSync(localPath)) {
				if (isS3Enabled()) {
					// Download from S3 to temp directory
					const tempDir = path.join(os.tmpdir(), `duration_${Date.now()}`);
					fs.mkdirSync(tempDir, { recursive: true });

					const downloaded = await s3DownloadVideo(videoKey, tempDir);
					if (downloaded) {
						durationSourcePath = path.join(tempDir, videoKey);
						needsCleanup = true;
					} else {
						console.log('SKIP (S3 download failed)');
						skipped++;
						continue;
					}
				} else {
					console.log('SKIP (file not found)');
					skipped++;
					continue;
				}
			}

			// Get precise duration
			const preciseDuration = await getVideoDuration(durationSourcePath);

			// Cleanup temp file if downloaded from S3
			if (needsCleanup) {
				try {
					fs.rmSync(path.dirname(durationSourcePath), {
						recursive: true,
						force: true,
					});
				} catch (e) {}
			}

			if (!preciseDuration || preciseDuration <= 0) {
				console.log('SKIP (could not get duration)');
				skipped++;
				continue;
			}

			// Round to 2 decimal places
			let roundedDuration = Math.round(preciseDuration * 100) / 100;

			// If ffprobe returns an integer, add 0.005 to mark as "processed with ffprobe"
			// This distinguishes from Telegram's integer + 0.001 marker
			if (Math.abs(roundedDuration - Math.round(roundedDuration)) < 0.001) {
				roundedDuration = Math.round(roundedDuration) + 0.005;
			}

			// Update database
			await prisma.scheduledPost.update({
				where: { id: video.id },
				data: { duration: roundedDuration },
			});

			console.log(`OK (${video.duration}s → ${roundedDuration}s)`);
			updated++;
		} catch (error) {
			console.log(`FAILED (${error.message})`);
			failed++;
		}
	}

	console.log('\n=== Summary ===');
	console.log(`Updated: ${updated}`);
	console.log(`Skipped: ${skipped}`);
	console.log(`Failed: ${failed}`);
	console.log(`Total processed: ${needsUpdate.length}`);

	await prisma.$disconnect();
}

updateDurations().catch(console.error);
