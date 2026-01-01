import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
	HeadObjectCommand,
} from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// S3 configuration from environment
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_REGION = process.env.S3_REGION || 'ap-southeast-1';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_BUCKET = process.env.S3_BUCKET || 'videos';

// R2 CDN Public URL (for faster video delivery via Cloudflare edge)
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL;

// Check if S3 is configured
export function isS3Enabled() {
	return !!(S3_ENDPOINT && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY);
}

// Check if R2 CDN is configured
export function isCdnEnabled() {
	return !!S3_PUBLIC_URL;
}

/**
 * Get CDN URL for a video (preferred for fast delivery)
 * Falls back to computed public URL if CDN not configured
 * @param {string} key - Video filename
 * @returns {string} CDN URL
 */
export function getCdnUrl(key) {
	if (S3_PUBLIC_URL) {
		return `${S3_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
	}
	return getPublicUrl(key); // Fallback to computed URL
}

// Create S3 client (lazy initialization)
let s3Client = null;

function getS3Client() {
	if (!s3Client && isS3Enabled()) {
		s3Client = new S3Client({
			endpoint: S3_ENDPOINT,
			region: S3_REGION,
			credentials: {
				accessKeyId: S3_ACCESS_KEY_ID,
				secretAccessKey: S3_SECRET_ACCESS_KEY,
			},
			forcePathStyle: true, // Required for Supabase S3
		});
		console.log('[S3] Client initialized');
	}
	return s3Client;
}

/**
 * Upload a video file to S3
 * @param {string} localPath - Local file path
 * @param {string} key - S3 object key (filename)
 * @returns {Promise<boolean>} Success status
 */
export async function uploadVideo(localPath, key) {
	const client = getS3Client();
	if (!client) {
		console.log('[S3] Not configured, skipping upload');
		return false;
	}

	try {
		const fileBuffer = fs.readFileSync(localPath);
		const command = new PutObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
			Body: fileBuffer,
			ContentType: 'video/mp4',
		});

		await client.send(command);
		console.log(`[S3] Uploaded: ${key}`);
		return true;
	} catch (error) {
		console.error(`[S3] Upload failed for ${key}:`, error.message);
		return false;
	}
}

/**
 * Download a video from S3 to a buffer AND cache locally
 * @param {string} key - S3 object key (filename)
 * @param {string} cacheDir - Optional local cache directory (default: data/videos)
 * @returns {Promise<Buffer|null>} Video buffer or null on failure
 */
export async function downloadVideo(
	key,
	cacheDir = path.join(process.cwd(), 'data', 'videos')
) {
	// Check local cache first
	if (cacheDir) {
		const localPath = path.join(cacheDir, key);
		if (fs.existsSync(localPath)) {
			console.log(`[S3] Cache hit (local): ${localPath}`);
			return fs.readFileSync(localPath);
		}
	}

	const client = getS3Client();
	if (!client) {
		console.log('[S3] Not configured');
		return null;
	}

	try {
		const command = new GetObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
		});

		const response = await client.send(command);
		const chunks = [];
		for await (const chunk of response.Body) {
			chunks.push(chunk);
		}
		const buffer = Buffer.concat(chunks);
		console.log(`[S3] Downloaded: ${key}`);

		// Cache locally for faster future access
		if (cacheDir) {
			try {
				if (!fs.existsSync(cacheDir)) {
					fs.mkdirSync(cacheDir, { recursive: true });
				}
				const localPath = path.join(cacheDir, key);
				fs.writeFileSync(localPath, buffer);
				console.log(`[S3] Cached locally: ${key}`);
			} catch (cacheError) {
				console.error(`[S3] Failed to cache locally: ${cacheError.message}`);
			}
		}

		return buffer;
	} catch (error) {
		console.error(`[S3] Download failed for ${key}:`, error.message);
		return null;
	}
}

/**
 * Stream video directly from S3 (no buffering - for real-time streaming)
 * @param {string} key - S3 object key (filename)
 * @returns {Promise<{stream: ReadableStream, contentLength: number}|null>}
 */
export async function streamVideo(key) {
	const client = getS3Client();
	if (!client) {
		console.log('[S3] Not configured');
		return null;
	}

	try {
		const command = new GetObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
		});

		const response = await client.send(command);
		return {
			stream: response.Body,
			contentLength: response.ContentLength,
			contentType: response.ContentType || 'video/mp4',
		};
	} catch (error) {
		console.error(`[S3] Stream failed for ${key}:`, error.message);
		return null;
	}
}

/**
 * Download video from S3 to a local temp file
 * @param {string} key - S3 object key (filename)
 * @param {string} tempDir - Temp directory path
 * @returns {Promise<string|null>} Local file path or null on failure
 */
export async function downloadVideoToFile(key, tempDir) {
	const buffer = await downloadVideo(key);
	if (!buffer) return null;

	const tempPath = path.join(tempDir, key);
	fs.writeFileSync(tempPath, buffer);
	console.log(`[S3] Saved to temp: ${tempPath}`);
	return tempPath;
}

/**
 * Check if a video exists in S3
 * @param {string} key - S3 object key (filename)
 * @returns {Promise<boolean>} Existence status
 */
export async function videoExists(key) {
	const client = getS3Client();
	if (!client) return false;

	try {
		const command = new HeadObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
		});
		await client.send(command);
		return true;
	} catch (error) {
		if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
			return false;
		}
		console.error(`[S3] Check existence failed for ${key}:`, error.message);
		return false;
	}
}

/**
 * Delete a video from S3
 * @param {string} key - S3 object key (filename)
 * @returns {Promise<boolean>} Success status
 */
export async function deleteVideo(key) {
	const client = getS3Client();
	if (!client) return false;

	try {
		const command = new DeleteObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
		});
		await client.send(command);
		console.log(`[S3] Deleted: ${key}`);
		return true;
	} catch (error) {
		console.error(`[S3] Delete failed for ${key}:`, error.message);
		return false;
	}
}

/**
 * Get the public URL for a video
 * - R2: Requires public bucket or custom domain
 * - Supabase: Uses /storage/v1/object/public format
 * @param {string} key - S3 object key (filename)
 * @returns {string} Public URL
 */
export function getPublicUrl(key) {
	if (!S3_ENDPOINT) return '';

	// Check if it's Supabase (has /storage/v1/s3 in endpoint)
	if (S3_ENDPOINT.includes('/storage/v1/s3')) {
		// Supabase public URL format
		const baseUrl = S3_ENDPOINT.replace(
			'/storage/v1/s3',
			'/storage/v1/object/public'
		);
		return `${baseUrl}/${S3_BUCKET}/${key}`;
	}

	// Cloudflare R2 - need public access via custom domain or R2.dev subdomain
	// For R2, you need to enable public access in dashboard first
	// Default format: https://<account-id>.r2.dev/<bucket>/<key>
	const accountId = S3_ENDPOINT.match(
		/https:\/\/([^.]+)\.r2\.cloudflarestorage\.com/
	)?.[1];
	if (accountId) {
		return `https://pub-${accountId}.r2.dev/${S3_BUCKET}/${key}`;
	}

	// Fallback - direct S3 URL (may not work without auth)
	return `${S3_ENDPOINT}/${S3_BUCKET}/${key}`;
}
