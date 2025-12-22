import fs from 'fs';
import path from 'path';
import axios from 'axios';

/**
 * Download queue for retry mechanism
 * @type {Array<{fileId: string, fileUrl: string, videoPath: string, chatId: number, retries: number}>}
 */
const downloadQueue = [];
let isProcessing = false;

/**
 * Download video with timeout
 * @param {string} fileUrl
 * @param {string} videoPath
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
export async function downloadVideo(fileUrl, videoPath, timeoutMs = 30000) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const writer = fs.createWriteStream(videoPath);
		const response = await axios({
			method: 'get',
			url: fileUrl,
			responseType: 'stream',
			signal: controller.signal,
			timeout: timeoutMs,
		});

		response.data.pipe(writer);

		await new Promise((resolve, reject) => {
			writer.on('finish', resolve);
			writer.on('error', reject);
		});

		clearTimeout(timeoutId);
		return true;
	} catch (error) {
		clearTimeout(timeoutId);
		// Clean up partial file
		if (fs.existsSync(videoPath)) {
			fs.unlinkSync(videoPath);
		}
		console.log(`[Download] Failed: ${error.message}`);
		return false;
	}
}

/**
 * Add video to download queue for background retry
 */
export function queueDownload(item) {
	downloadQueue.push({ ...item, retries: 0 });
	console.log(`[Download] Queued for retry: ${item.fileId.slice(-8)}`);
	processQueue();
}

/**
 * Process download queue in background
 */
async function processQueue() {
	if (isProcessing || downloadQueue.length === 0) return;

	isProcessing = true;

	while (downloadQueue.length > 0) {
		const item = downloadQueue[0];

		console.log(
			`[Download] Retry ${item.retries + 1}/3 for ${item.fileId.slice(-8)}`
		);

		// Try download with longer timeout for retry
		const success = await downloadVideo(item.fileUrl, item.videoPath, 60000);

		if (success) {
			console.log(`[Download] Retry success: ${item.fileId.slice(-8)}`);
			downloadQueue.shift();

			// Emit success event (will be handled by caller)
			if (item.onSuccess) {
				try {
					await item.onSuccess();
				} catch (e) {
					console.error('[Download] onSuccess error:', e.message);
				}
			}
		} else {
			item.retries++;

			if (item.retries >= 3) {
				console.log(`[Download] Max retries reached: ${item.fileId.slice(-8)}`);
				downloadQueue.shift();

				if (item.onFail) {
					try {
						await item.onFail();
					} catch (e) {
						console.error('[Download] onFail error:', e.message);
					}
				}
			} else {
				// Wait before retry
				await new Promise((r) => setTimeout(r, 5000));
			}
		}
	}

	isProcessing = false;
}

/**
 * Get queue status
 */
export function getQueueStatus() {
	return {
		pending: downloadQueue.length,
		processing: isProcessing,
	};
}
