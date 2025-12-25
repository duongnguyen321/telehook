#!/usr/bin/env node
/**
 * Video Merger Script
 * Ghép các video trong folder thành các batch ≤ 20MB
 *
 * Usage: node merge-video.js [data_directory] [max_size_mb]
 *
 * Cách hoạt động:
 * - Quét tất cả subfolder trong ./data
 * - Ghép các video trong mỗi subfolder thành batch ≤ 20MB
 * - Output: {folder_name}_batch001.mp4, {folder_name}_batch002.mp4, ...
 */

import { execSync, spawn } from 'child_process';
import {
	existsSync,
	statSync,
	mkdirSync,
	readdirSync,
	unlinkSync,
	writeFileSync,
	copyFileSync,
} from 'fs';
import { basename, dirname, extname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

// Get script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const DEFAULT_MAX_SIZE_MB = 20;
const DEFAULT_DATA_DIR = join(__dirname, 'data');
const OUTPUT_DIR = join(__dirname, 'output');
const SAFETY_MARGIN = 0.9; // 10% margin

/**
 * Kiểm tra ffmpeg
 */
function checkFfmpeg() {
	try {
		execSync('ffmpeg -version', { stdio: 'pipe' });
		return true;
	} catch {
		console.error('❌ Error: ffmpeg chưa được cài đặt.');
		process.exit(1);
	}
}

/**
 * Lấy kích thước file (bytes)
 */
function getFileSize(filePath) {
	return statSync(filePath).size;
}

/**
 * Lấy thời lượng video
 */
function getVideoDuration(filePath) {
	try {
		const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
		return parseFloat(execSync(cmd, { encoding: 'utf-8' }).trim());
	} catch {
		return 0;
	}
}

/**
 * Chạy ffmpeg command
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
			else reject(new Error(`ffmpeg error: ${stderr}`));
		});
		process.on('error', reject);
	});
}

/**
 * Ghép nhiều video thành một
 */
async function concatenateVideos(inputFiles, outputPath) {
	// Tạo file list tạm
	const listPath = outputPath + '.txt';
	const listContent = inputFiles.map((f) => `file '${f}'`).join('\n');
	writeFileSync(listPath, listContent);

	try {
		const args = [
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
		await runFfmpeg(args);
	} finally {
		// Xóa file list tạm
		if (existsSync(listPath)) {
			unlinkSync(listPath);
		}
	}
}

/**
 * Chia videos thành các batch sao cho mỗi batch ≤ maxSizeBytes
 */
function groupVideosIntoBatches(videos, maxSizeBytes) {
	const batches = [];
	let currentBatch = [];
	let currentSize = 0;

	for (const video of videos) {
		const videoSize = getFileSize(video.path);

		// Nếu thêm video này vào sẽ vượt quá giới hạn
		if (currentSize + videoSize > maxSizeBytes && currentBatch.length > 0) {
			batches.push([...currentBatch]);
			currentBatch = [];
			currentSize = 0;
		}

		currentBatch.push(video);
		currentSize += videoSize;
	}

	// Thêm batch cuối cùng
	if (currentBatch.length > 0) {
		batches.push(currentBatch);
	}

	return batches;
}

/**
 * Xử lý một folder
 */
async function processFolder(folderPath, folderName, maxSizeMB, outputBaseDir) {
	const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv'];
	const maxSizeBytes = maxSizeMB * 1024 * 1024 * SAFETY_MARGIN;

	// Tạo subfolder output theo tên folder gốc
	const outputDir = join(outputBaseDir, folderName);
	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true });
	}

	// Lấy tất cả video trong folder
	const files = readdirSync(folderPath);
	const videoFiles = files
		.filter((f) => {
			const ext = extname(f).toLowerCase();
			const filePath = join(folderPath, f);
			return videoExtensions.includes(ext) && statSync(filePath).isFile();
		})
		.sort() // Sắp xếp theo tên
		.map((f) => ({
			name: f,
			path: join(folderPath, f),
			size: getFileSize(join(folderPath, f)),
		}));

	if (videoFiles.length === 0) {
		console.log(`   ⚠️ Không có video trong folder`);
		return [];
	}

	// Tính tổng kích thước
	const totalSize = videoFiles.reduce((sum, v) => sum + v.size, 0);
	const totalSizeMB = totalSize / (1024 * 1024);

	console.log(
		`   📊 ${videoFiles.length} video, tổng ${totalSizeMB.toFixed(2)} MB`
	);

	// Nếu chỉ có 1 video
	if (videoFiles.length === 1) {
		const video = videoFiles[0];
		const sizeMB = video.size / (1024 * 1024);

		if (sizeMB <= maxSizeMB) {
			// Copy file với tên mới
			const outputPath = join(
				outputDir,
				`${folderName}_001${extname(video.name)}`
			);
			copyFileSync(video.path, outputPath);
			console.log(
				`   ✅ Copy: ${basename(outputPath)} (${sizeMB.toFixed(2)} MB)`
			);
			return [outputPath];
		} else {
			// Cần chia nhỏ - gọi split logic
			console.log(`   ⚠️ Video lớn hơn ${maxSizeMB}MB, cần chia nhỏ...`);
			return await splitSingleVideo(
				video.path,
				folderName,
				maxSizeMB,
				outputDir
			);
		}
	}

	// Chia videos thành các batch
	const batches = groupVideosIntoBatches(videoFiles, maxSizeBytes);
	console.log(`   📦 Sẽ tạo ${batches.length} batch`);

	const outputFiles = [];

	for (let i = 0; i < batches.length; i++) {
		const batch = batches[i];
		const batchNumber = String(i + 1).padStart(3, '0');
		const ext = extname(batch[0].name);
		const outputPath = join(outputDir, `${folderName}_${batchNumber}${ext}`);

		console.log(
			`\n   🔄 Batch ${i + 1}/${batches.length}: ${batch.length} video`
		);
		batch.forEach((v) => {
			console.log(
				`      - ${v.name} (${(v.size / 1024 / 1024).toFixed(2)} MB)`
			);
		});

		if (batch.length === 1) {
			// Chỉ có 1 video, copy trực tiếp
			copyFileSync(batch[0].path, outputPath);
		} else {
			// Ghép nhiều video
			await concatenateVideos(
				batch.map((v) => v.path),
				outputPath
			);
		}

		const outputSize = getFileSize(outputPath) / (1024 * 1024);
		console.log(
			`   ✅ Đã tạo: ${basename(outputPath)} (${outputSize.toFixed(2)} MB)`
		);

		// Kiểm tra nếu vượt quá giới hạn
		if (outputSize > maxSizeMB) {
			console.log(`   ⚠️ Vượt quá ${maxSizeMB}MB! Đang re-encode...`);
			await reencodeToSize(outputPath, outputPath, maxSizeMB);
			const newSize = getFileSize(outputPath) / (1024 * 1024);
			console.log(`   ✅ Re-encode xong: ${newSize.toFixed(2)} MB`);
		}

		outputFiles.push(outputPath);
	}

	return outputFiles;
}

/**
 * Chia một video lớn thành nhiều phần
 */
async function splitSingleVideo(inputPath, baseName, maxSizeMB, outputDir) {
	const fileSize = getFileSize(inputPath);
	const duration = getVideoDuration(inputPath);
	const maxSizeBytes = maxSizeMB * 1024 * 1024 * SAFETY_MARGIN;

	// Tính số phần cần
	const numParts = Math.ceil(fileSize / maxSizeBytes);
	const partDuration = duration / numParts;

	const outputFiles = [];

	for (let i = 0; i < numParts; i++) {
		const startTime = i * partDuration;
		const batchNumber = String(i + 1).padStart(3, '0');
		const outputPath = join(
			outputDir,
			`${baseName}_${batchNumber}${extname(inputPath)}`
		);

		const args = [
			'-y',
			'-ss',
			String(startTime),
			'-i',
			inputPath,
			'-t',
			String(partDuration),
			'-c',
			'copy',
			'-avoid_negative_ts',
			'make_zero',
			outputPath,
		];

		await runFfmpeg(args);

		const outputSize = getFileSize(outputPath) / (1024 * 1024);
		console.log(
			`   ✅ Phần ${i + 1}/${numParts}: ${basename(
				outputPath
			)} (${outputSize.toFixed(2)} MB)`
		);

		// Re-encode nếu vẫn lớn
		if (outputSize > maxSizeMB) {
			await reencodeToSize(outputPath, outputPath, maxSizeMB);
			const newSize = getFileSize(outputPath) / (1024 * 1024);
			console.log(`   ✅ Re-encode: ${newSize.toFixed(2)} MB`);
		}

		outputFiles.push(outputPath);
	}

	return outputFiles;
}

/**
 * Re-encode video để đạt kích thước mục tiêu
 */
async function reencodeToSize(inputPath, outputPath, maxSizeMB) {
	const duration = getVideoDuration(inputPath);
	const targetBytes = maxSizeMB * 1024 * 1024 * 0.95;
	const audioBitrate = 128 * 1024;
	const videoBitrate = Math.floor((targetBytes * 8) / duration - audioBitrate);

	const tempPath = outputPath + '.temp.mp4';

	const args = [
		'-y',
		'-i',
		inputPath,
		'-c:v',
		'libx264',
		'-b:v',
		String(videoBitrate),
		'-maxrate',
		String(videoBitrate),
		'-bufsize',
		String(videoBitrate * 2),
		'-preset',
		'medium',
		'-c:a',
		'aac',
		'-b:a',
		'128k',
		tempPath,
	];

	await runFfmpeg(args);

	// Replace file
	unlinkSync(inputPath);
	copyFileSync(tempPath, outputPath);
	unlinkSync(tempPath);
}

/**
 * Main function
 */
async function main() {
	checkFfmpeg();

	const args = process.argv.slice(2);

	let dataDir = DEFAULT_DATA_DIR;
	let maxSizeMB = DEFAULT_MAX_SIZE_MB;

	if (args.includes('--help') || args.includes('-h')) {
		console.log(`
📹 Video Merger - Ghép video thành batch ≤ 20MB

Usage: node merge-video.js [data_directory] [max_size_mb]

Arguments:
  data_directory    Thư mục chứa subfolder video (mặc định: ./data)
  max_size_mb       Kích thước tối đa mỗi batch (mặc định: ${DEFAULT_MAX_SIZE_MB} MB)

Cách hoạt động:
  1. Quét tất cả subfolder trong ./data
  2. Ghép các video trong mỗi subfolder thành batch ≤ 20MB
  3. Output vào ./output/{folder_name}/{folder_name}_001.mp4, {folder_name}_002.mp4, ...

Examples:
  node merge-video.js                     # Xử lý ./data
  node merge-video.js ./data 15           # Limit 15MB
`);
		process.exit(0);
	}

	if (args[0] && !args[0].startsWith('-')) {
		dataDir = resolve(args[0]);
	}

	if (args[1] && !isNaN(parseFloat(args[1]))) {
		maxSizeMB = parseFloat(args[1]);
	}

	// Tạo output directory
	if (!existsSync(OUTPUT_DIR)) {
		mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	console.log(`\n🎬 Video Merger`);
	console.log(`${'─'.repeat(40)}`);
	console.log(`📂 Data folder: ${dataDir}`);
	console.log(`📂 Output folder: ${OUTPUT_DIR}`);
	console.log(`📏 Max size: ${maxSizeMB} MB`);

	// Lấy tất cả subfolder
	const items = readdirSync(dataDir);
	const subfolders = items.filter((item) => {
		const itemPath = join(dataDir, item);
		return statSync(itemPath).isDirectory();
	});

	if (subfolders.length === 0) {
		console.log(`\n⚠️ Không tìm thấy subfolder nào trong: ${dataDir}`);
		return;
	}

	console.log(`\n📁 Tìm thấy ${subfolders.length} folder:\n`);

	const results = [];

	for (const folder of subfolders) {
		const folderPath = join(dataDir, folder);
		console.log(`\n${'═'.repeat(60)}`);
		console.log(`📂 ${folder}`);

		const outputFiles = await processFolder(
			folderPath,
			folder,
			maxSizeMB,
			OUTPUT_DIR
		);
		results.push({
			folder,
			outputs: outputFiles.map((f) => basename(f)),
		});
	}

	// Tổng kết
	console.log(`\n${'═'.repeat(60)}`);
	console.log(`🎉 HOÀN THÀNH!`);
	console.log(`${'═'.repeat(60)}`);
	console.log(`\n📂 Output: ${OUTPUT_DIR}\n`);

	results.forEach((result) => {
		console.log(`📁 ${result.folder}/`);
		result.outputs.forEach((output) => {
			const size =
				getFileSize(join(OUTPUT_DIR, result.folder, output)) / (1024 * 1024);
			console.log(`   └── ${output} (${size.toFixed(2)} MB)`);
		});
	});
}

main().catch(console.error);
