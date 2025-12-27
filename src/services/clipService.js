/**
 * Clip Service - Handle video clipping operations
 * Cắt bỏ các đoạn thời gian khỏi video
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Check if ffmpeg is installed
 * @returns {boolean}
 */
function checkFfmpeg() {
	try {
		execSync('ffmpeg -version', { stdio: 'pipe' });
		return true;
	} catch {
		return false;
	}
}

/**
 * Get video duration using ffprobe
 * @param {string} inputPath
 * @returns {number} Duration in seconds
 */
function getVideoDuration(inputPath) {
	try {
		const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
		return parseFloat(execSync(cmd, { encoding: 'utf-8' }).trim());
	} catch {
		return 0;
	}
}

/**
 * Run ffmpeg command
 * @param {string[]} args
 * @returns {Promise<void>}
 */
function runFfmpeg(args) {
	return new Promise((resolve, reject) => {
		const process = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });
		let stderr = '';
		process.stderr.on('data', (data) => {
			stderr += data.toString();
		});
		process.on('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`ffmpeg error: ${stderr.slice(-200)}`));
		});
		process.on('error', reject);
	});
}

/**
 * Parse clip command arguments
 * @param {string} argsString - e.g. "5 3-7 15-20"
 * @returns {{ page: number, ranges: Array<{start: number, end: number}> } | null}
 */
export function parseClipArgs(argsString) {
	const parts = argsString.trim().split(/\s+/);
	if (parts.length < 2) return null;

	// First part is page number
	const page = parseInt(parts[0], 10);
	if (isNaN(page) || page < 1) return null;

	// Rest are time ranges
	const ranges = [];
	for (let i = 1; i < parts.length; i++) {
		const match = parts[i].match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
		if (!match) continue;

		const start = parseFloat(match[1]);
		const end = parseFloat(match[2]);

		if (start >= end) continue;
		ranges.push({ start, end });
	}

	if (ranges.length === 0) return null;

	// Sort ranges by start time
	ranges.sort((a, b) => a.start - b.start);

	return { page: page - 1, ranges }; // Convert to 0-based index
}

/**
 * Calculate segments to KEEP based on ranges to CUT
 * @param {number} duration - Total video duration
 * @param {Array<{start: number, end: number}>} cutRanges - Ranges to remove
 * @returns {Array<{start: number, end: number}>} Ranges to keep
 */
function calculateKeepRanges(duration, cutRanges) {
	const keepRanges = [];
	let currentStart = 0;

	for (const range of cutRanges) {
		if (range.start > currentStart) {
			keepRanges.push({ start: currentStart, end: range.start });
		}
		currentStart = Math.max(currentStart, range.end);
	}

	// Add final segment if any
	if (currentStart < duration) {
		keepRanges.push({ start: currentStart, end: duration });
	}

	return keepRanges;
}

/**
 * Clip video by removing specified time ranges
 * @param {string} inputPath - Path to input video
 * @param {Array<{start: number, end: number}>} cutRanges - Time ranges to remove
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
export async function clipVideo(inputPath, cutRanges) {
	if (!checkFfmpeg()) {
		return { success: false, error: 'ffmpeg not installed' };
	}

	if (!fs.existsSync(inputPath)) {
		return { success: false, error: 'Input file not found' };
	}

	// Get video duration
	const duration = getVideoDuration(inputPath);
	if (duration <= 0) {
		return { success: false, error: 'Cannot get video duration' };
	}

	// Validate ranges
	for (const range of cutRanges) {
		if (range.end > duration) {
			return {
				success: false,
				error: `Range ${range.start}-${
					range.end
				} exceeds video duration (${duration.toFixed(1)}s)`,
			};
		}
	}

	// Calculate segments to keep
	const keepRanges = calculateKeepRanges(duration, cutRanges);

	if (keepRanges.length === 0) {
		return { success: false, error: 'No segments remain after clipping' };
	}

	// Create temp directory for segments
	const tempDir = path.join(os.tmpdir(), `clip_${Date.now()}`);
	fs.mkdirSync(tempDir, { recursive: true });

	const segmentFiles = [];
	const ext = path.extname(inputPath);
	const baseName = path.basename(inputPath, ext);

	try {
		// Step 1: Extract each segment
		console.log(`[Clip] Extracting ${keepRanges.length} segments...`);
		for (let i = 0; i < keepRanges.length; i++) {
			const range = keepRanges[i];
			const segmentPath = path.join(
				tempDir,
				`seg_${String(i).padStart(3, '0')}${ext}`
			);

			const args = [
				'-y',
				'-ss',
				String(range.start),
				'-i',
				inputPath,
				'-t',
				String(range.end - range.start),
				'-c',
				'copy',
				'-avoid_negative_ts',
				'make_zero',
				segmentPath,
			];

			await runFfmpeg(args);
			segmentFiles.push(segmentPath);
			console.log(
				`[Clip] Segment ${i + 1}/${keepRanges.length}: ${range.start.toFixed(
					1
				)}s - ${range.end.toFixed(1)}s`
			);
		}

		// Step 2: Create concat list file
		const listPath = path.join(tempDir, 'concat_list.txt');
		const listContent = segmentFiles.map((f) => `file '${f}'`).join('\n');
		fs.writeFileSync(listPath, listContent);

		// Step 3: Concatenate segments
		const outputPath = path.join(tempDir, `${baseName}_clipped${ext}`);
		console.log(`[Clip] Concatenating segments...`);

		const concatArgs = [
			'-y',
			'-f',
			'concat',
			'-safe',
			'0',
			'-i',
			listPath,
			'-c',
			'copy',
			outputPath,
		];

		await runFfmpeg(concatArgs);

		// Step 4: Cleanup segment files (keep output)
		for (const segFile of segmentFiles) {
			try {
				fs.unlinkSync(segFile);
			} catch {
				/* ignore */
			}
		}
		try {
			fs.unlinkSync(listPath);
		} catch {
			/* ignore */
		}

		console.log(`[Clip] Success: ${outputPath}`);
		return { success: true, outputPath };
	} catch (error) {
		// Cleanup on error
		try {
			fs.rmSync(tempDir, { recursive: true, force: true });
		} catch {
			/* ignore */
		}

		console.error('[Clip] Error:', error.message);
		return { success: false, error: error.message };
	}
}

/**
 * Cleanup temp file after clip is done
 * @param {string} filePath
 */
export function cleanupTempFile(filePath) {
	try {
		if (filePath && fs.existsSync(filePath)) {
			// Remove the file
			fs.unlinkSync(filePath);
			// Try to remove parent temp directory if empty
			const parentDir = path.dirname(filePath);
			if (parentDir.includes('clip_')) {
				try {
					fs.rmdirSync(parentDir);
				} catch {
					/* ignore - not empty */
				}
			}
		}
	} catch (e) {
		console.error('[Clip] Cleanup error:', e.message);
	}
}
