#!/usr/bin/env bun
/**
 * Download All Videos from R2 to Local Cache
 *
 * Downloads all videos from Cloudflare R2 to data/videos/ for faster local access.
 * Skips files that already exist locally.
 *
 * Run with: bun run scripts/download-all-to-local.js
 */

import 'dotenv/config';
import {
	S3Client,
	ListObjectsV2Command,
	GetObjectCommand,
} from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEOS_DIR = path.join(__dirname, '../data/videos');

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_DIR)) {
	fs.mkdirSync(VIDEOS_DIR, { recursive: true });
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
		return { status: 'skipped', key };
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
		return { status: 'downloaded', key, size: buffer.length };
	} catch (error) {
		return { status: 'failed', key, error: error.message };
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
	console.log(`Total size: ${formatBytes(totalSize)}\n`);

	let downloaded = 0;
	let skipped = 0;
	let failed = 0;
	let downloadedBytes = 0;

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
	console.log(`\nLocal cache: ${VIDEOS_DIR}`);
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
