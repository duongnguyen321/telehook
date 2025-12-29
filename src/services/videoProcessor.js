import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Check if ffmpeg is installed
 * @returns {Promise<boolean>}
 */
export async function checkFfmpeg() {
	return new Promise((resolve) => {
		const process = spawn('ffmpeg', ['-version']);
		process.on('error', () => resolve(false));
		process.on('close', (code) => resolve(code === 0));
	});
}

// 19MB in bits (leave safety margin from 20MB)
const MAX_SIZE_BITS = 19 * 1024 * 1024 * 8;

/**
 * Get video duration using ffprobe
 * @param {string} inputPath
 * @returns {Promise<number>} Duration in seconds
 */
export async function getVideoDuration(inputPath) {
	return new Promise((resolve) => {
		const process = spawn('ffprobe', [
			'-v',
			'error',
			'-show_entries',
			'format=duration',
			'-of',
			'default=noprint_wrappers=1:nokey=1',
			inputPath,
		]);
		let stdout = '';
		process.stdout.on('data', (d) => (stdout += d.toString()));
		process.on('close', () => resolve(parseFloat(stdout.trim()) || 0));
	});
}

/**
 * Upscale video to 720p height with sharpening
 * @param {string} inputPath
 * @param {number} [duration] - Video duration in seconds. If not provided, will probe.
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export async function upscaleVideo(inputPath, duration) {
	const isFfmpegInstalled = await checkFfmpeg();
	if (!isFfmpegInstalled) {
		return { success: false, error: 'ffmpeg not installed' };
	}

	// Ensure we have duration to calculate bitrate
	if (!duration) {
		duration = await getVideoDuration(inputPath);
	}

	// Default bitrate (2000k) if duration unknown or very short, but capped by max size
	let bitrate = 2000;
	if (duration > 0) {
		// Calculate max bitrate to fit in 19MB
		// Bitrate (kbps) = MaxSize (bits) / Duration (s) / 1024
		const maxBitrate = Math.floor(MAX_SIZE_BITS / duration / 1024);
		// Cap at 2500k for HD quality, but respect max size
		bitrate = Math.min(2500, maxBitrate);
		// Ensure minimum viable bitrate (e.g. 500k) - if video too long, might be potato quality
		bitrate = Math.max(500, bitrate);
	}

	const ext = path.extname(inputPath);
	const baseName = path.basename(inputPath, ext);
	const tempDir = path.join(os.tmpdir(), `upscale_${Date.now()}`);

	if (!fs.existsSync(tempDir)) {
		fs.mkdirSync(tempDir, { recursive: true });
	}

	const outputPath = path.join(tempDir, `${baseName}_1080p${ext}`);

	console.log(
		`[Upscale] Target bitrate: ${bitrate}k for duration: ${duration}s`
	);

	// Filters:
	// scale: Smart 1080p
	// If landscape (iw > ih): height=1080, width=-2
	// If portrait (ih > iw): width=1080, height=-2
	// unsharp : Sharpen
	const args = [
		'-y',
		'-i',
		inputPath,
		'-vf',
		"scale='if(gt(iw,ih),-2,1080)':'if(gt(iw,ih),1080,-2)':flags=lanczos,unsharp=5:5:1.0:5:5:0.0",
		'-c:v',
		'libx264',
		'-preset',
		'faster', // Use faster preset for background job
		'-b:v',
		`${bitrate}k`, // Target bitrate
		'-maxrate',
		`${bitrate}k`,
		'-bufsize',
		`${bitrate * 2}k`,
		'-c:a',
		'copy',
		'-fs',
		'19900000', // Fail-safe: stop writing if file exceeds ~19.9MB (bytes)
		outputPath,
	];

	return new Promise((resolve) => {
		const process = spawn('ffmpeg', args);
		let stderr = '';

		process.stderr.on('data', (data) => {
			stderr += data.toString();
		});

		process.on('close', (code) => {
			if (code === 0) {
				// double check file size
				try {
					const stats = fs.statSync(outputPath);
					if (stats.size > 20 * 1024 * 1024) {
						resolve({
							success: false,
							error: `Output too large: ${(stats.size / 1024 / 1024).toFixed(
								2
							)}MB`,
						});
						return;
					}
				} catch (e) {}
				resolve({ success: true, outputPath });
			} else {
				try {
					fs.rmSync(tempDir, { recursive: true, force: true });
				} catch (e) {}
				resolve({
					success: false,
					error: `ffmpeg failed: ${stderr.slice(-200)}`,
				});
			}
		});

		process.on('error', (err) => {
			try {
				fs.rmSync(tempDir, { recursive: true, force: true });
			} catch (e) {}
			resolve({ success: false, error: err.message });
		});
	});
}

/**
 * Cleanup upscaled video file
 * @param {string} filePath
 */
export function cleanupUpscaledFile(filePath) {
	try {
		if (filePath && fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
			const dir = path.dirname(filePath);
			if (dir.includes('upscale_')) {
				try {
					fs.rmdirSync(dir);
				} catch (e) {}
			}
		}
	} catch (e) {
		console.error('[Upscale] Cleanup error:', e.message);
	}
}
