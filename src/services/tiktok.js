import axios from 'axios';
import fs from 'fs';
import path from 'path';

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

/**
 * TikTok Content Posting API Service
 *
 * Note: Requires approved TikTok Developer App with video.publish scope
 * See: https://developers.tiktok.com/doc/content-posting-api-get-started
 */

/**
 * Initialize video upload
 * @param {string} accessToken
 * @param {number} fileSize - Size in bytes
 * @returns {Promise<{publish_id: string, upload_url: string}>}
 */
export async function initializeUpload(accessToken, fileSize) {
	const response = await axios.post(
		`${TIKTOK_API_BASE}/post/publish/video/init/`,
		{
			post_info: {
				title: '',
				privacy_level: 'PUBLIC_TO_EVERYONE',
				disable_comment: false,
				disable_duet: false,
				disable_stitch: false,
			},
			source_info: {
				source: 'FILE_UPLOAD',
				video_size: fileSize,
				chunk_size: fileSize, // Single chunk upload
				total_chunk_count: 1,
			},
		},
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
		}
	);

	if (response.data.error?.code !== 'ok') {
		throw new Error(
			`TikTok init failed: ${response.data.error?.message || 'Unknown error'}`
		);
	}

	return response.data.data;
}

/**
 * Upload video file to TikTok
 * @param {string} uploadUrl
 * @param {string} videoPath
 */
export async function uploadVideoFile(uploadUrl, videoPath) {
	const fileBuffer = fs.readFileSync(videoPath);
	const fileSize = fs.statSync(videoPath).size;

	const response = await axios.put(uploadUrl, fileBuffer, {
		headers: {
			'Content-Type': 'video/mp4',
			'Content-Length': fileSize,
			'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
		},
	});

	return response.data;
}

/**
 * Check publish status
 * @param {string} accessToken
 * @param {string} publishId
 */
export async function checkPublishStatus(accessToken, publishId) {
	const response = await axios.post(
		`${TIKTOK_API_BASE}/post/publish/status/fetch/`,
		{ publish_id: publishId },
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
		}
	);

	return response.data;
}

/**
 * Full upload flow
 * @param {string} accessToken
 * @param {string} videoPath
 * @param {{title: string, description: string, hashtags: string}} metadata
 */
export async function uploadToTikTok(accessToken, videoPath, metadata) {
	if (!accessToken) {
		throw new Error('TikTok access token not configured');
	}

	const fileSize = fs.statSync(videoPath).size;

	console.log(
		`[TikTok] Initializing upload for ${path.basename(
			videoPath
		)} (${fileSize} bytes)`
	);

	// 1. Initialize upload
	const { publish_id, upload_url } = await initializeUpload(
		accessToken,
		fileSize
	);
	console.log(`[TikTok] Got publish_id: ${publish_id}`);

	// 2. Upload video
	console.log('[TikTok] Uploading video...');
	await uploadVideoFile(upload_url, videoPath);
	console.log('[TikTok] Video uploaded successfully');

	// 3. Check status (video processing takes time)
	let status = await checkPublishStatus(accessToken, publish_id);
	console.log('[TikTok] Publish status:', status);

	return {
		success: true,
		publishId: publish_id,
		status,
		metadata,
	};
}

/**
 * Mock upload for testing without TikTok credentials
 * @param {string} videoPath
 * @param {{title: string, description: string, hashtags: string}} metadata
 */
export async function mockUploadToTikTok(videoPath, metadata) {
	console.log('[TikTok Mock] Would upload video:', {
		videoPath,
		metadata,
	});

	// Simulate upload delay
	await new Promise((resolve) => setTimeout(resolve, 2000));

	return {
		success: true,
		publishId: `mock-${Date.now()}`,
		metadata,
	};
}
