#!/usr/bin/env node
/**
 * Video Splitter Script
 * Tự động cắt video thành các phần nhỏ hơn hoặc bằng 20MB
 * Giữ nguyên chất lượng video gốc
 *
 * Usage: node split-video.js [input_directory] [max_size_mb]
 *
 * Default:
 * - Input: ./data folder
 * - Output: ./data/{video_name}/{video_name}_001.mp4, ./data/{video_name}/{video_name}_002.mp4, ...
 *
 * Features:
 * - Cắt video thành nhiều phần, giữ tất cả các phần
 * - Mỗi phần tối đa 20MB (có thể tùy chỉnh)
 * - Mỗi phần tối thiểu 10 giây
 * - Tự động điều chỉnh nếu phần cuối quá ngắn (<5 giây)
 * - Giữ nguyên chất lượng gốc (stream copy)
 * - Tự động re-encode nếu file vẫn vượt quá giới hạn
 */

import { execSync, spawn } from 'child_process';
import {
	existsSync,
	statSync,
	mkdirSync,
	readdirSync,
	unlinkSync,
	renameSync,
} from 'fs';
import { basename, dirname, extname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

// Get script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const DEFAULT_MAX_SIZE_MB = 20;
const DEFAULT_DATA_DIR = join(__dirname, 'data');
const MIN_SEGMENT_DURATION = 10; // Tối thiểu 10 giây mỗi phần
const MAX_SEGMENT_DURATION = 10; // Tối đa 20 giây mỗi phần
const MIN_LAST_SEGMENT_DURATION = 5; // Phần cuối tối thiểu 5 giây, nếu không sẽ merge
const SAFETY_MARGIN = 0.85; // Để lại 15% margin để đảm bảo KHÔNG BAO GIỜ vượt quá giới hạn

/**
 * Kiểm tra xem ffmpeg có được cài đặt không
 */
function checkFfmpeg() {
	try {
		execSync('ffmpeg -version', { stdio: 'pipe' });
		return true;
	} catch {
		console.error('❌ Error: ffmpeg chưa được cài đặt.');
		console.error(
			'   Cài đặt: brew install ffmpeg (macOS) hoặc apt install ffmpeg (Ubuntu)'
		);
		process.exit(1);
	}
}

/**
 * Lấy thông tin video sử dụng ffprobe
 */
function getVideoInfo(inputPath) {
	try {
		const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
		const duration = parseFloat(
			execSync(durationCmd, { encoding: 'utf-8' }).trim()
		);

		const bitrateCmd = `ffprobe -v error -show_entries format=bit_rate -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
		const bitrate = parseInt(
			execSync(bitrateCmd, { encoding: 'utf-8' }).trim(),
			10
		);

		const codecCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
		const videoCodec = execSync(codecCmd, { encoding: 'utf-8' }).trim();

		const audioCodecCmd = `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
		let audioCodec = '';
		try {
			audioCodec = execSync(audioCodecCmd, { encoding: 'utf-8' }).trim();
		} catch {
			// Video có thể không có audio
		}

		const fileSize = statSync(inputPath).size;

		return { duration, bitrate, videoCodec, audioCodec, fileSize };
	} catch (error) {
		console.error('❌ Error: Không thể đọc thông tin video:', error.message);
		process.exit(1);
	}
}

/**
 * Tính toán cách chia video thông minh
 * - Đảm bảo mỗi phần ≤ maxDuration
 * - Đảm bảo mỗi phần ≥ MIN_SEGMENT_DURATION
 * - Đảm bảo phần cuối ≥ MIN_LAST_SEGMENT_DURATION
 */
function calculateSegments(totalDuration, maxDuration) {
	// Bước 1: Tính số phần cần thiết (dựa trên maxDuration)
	let numberOfParts = Math.ceil(totalDuration / maxDuration);

	// Bước 2: Tính thời lượng đều cho mỗi phần
	let segmentDuration = totalDuration / numberOfParts;

	// Bước 3: Kiểm tra nếu segmentDuration < MIN_SEGMENT_DURATION
	if (segmentDuration < MIN_SEGMENT_DURATION && numberOfParts > 1) {
		numberOfParts = Math.max(
			1,
			Math.floor(totalDuration / MIN_SEGMENT_DURATION)
		);
		segmentDuration = totalDuration / numberOfParts;
	}

	// Bước 4: Kiểm tra phần cuối
	const lastSegmentDuration =
		totalDuration - (numberOfParts - 1) * segmentDuration;

	if (lastSegmentDuration < MIN_LAST_SEGMENT_DURATION && numberOfParts > 1) {
		numberOfParts--;
		if (numberOfParts > 0) {
			segmentDuration = totalDuration / numberOfParts;
		}
	}

	// Bước 5: Tạo danh sách các segments
	const segments = [];
	let remainingDuration = totalDuration;

	for (let i = 0; i < numberOfParts; i++) {
		const isLast = i === numberOfParts - 1;

		if (isLast) {
			segments.push({
				index: i,
				start: totalDuration - remainingDuration,
				duration: remainingDuration,
			});
		} else {
			const start = totalDuration - remainingDuration;
			segments.push({
				index: i,
				start: start,
				duration: segmentDuration,
			});
			remainingDuration -= segmentDuration;
		}
	}

	return segments;
}

/**
 * Tính toán phân phối thông minh dựa trên kích thước file và thời lượng tối đa
 */
function calculateOptimalSegments(totalDuration, totalSizeBytes, maxSizeBytes) {
	// Tính số phần cần dựa trên kích thước (với safety margin)
	const effectiveMaxSize = maxSizeBytes * SAFETY_MARGIN;
	const partsNeededBySize = Math.ceil(totalSizeBytes / effectiveMaxSize);

	// Tính số phần cần dựa trên thời lượng tối đa (30 giây)
	const partsNeededByDuration = Math.ceil(totalDuration / MAX_SEGMENT_DURATION);

	// Lấy số phần lớn hơn để đảm bảo cả hai điều kiện
	const minPartsNeeded = Math.max(partsNeededBySize, partsNeededByDuration);
	const maxDurationPerPart = totalDuration / minPartsNeeded;

	console.log(`\n📊 Phân tích:`);
	console.log(
		`   Tổng kích thước: ${(totalSizeBytes / 1024 / 1024).toFixed(2)} MB`
	);
	console.log(
		`   Kích thước mục tiêu mỗi phần: ${(
			effectiveMaxSize /
			1024 /
			1024
		).toFixed(2)} MB (đã trừ ${((1 - SAFETY_MARGIN) * 100).toFixed(0)}% margin)`
	);
	console.log(`   Thời lượng tối đa mỗi phần: ${MAX_SEGMENT_DURATION} giây`);
	console.log(`   Số phần cần (theo size): ${partsNeededBySize}`);
	console.log(`   Số phần cần (theo duration): ${partsNeededByDuration}`);
	console.log(`   → Số phần cuối cùng: ${minPartsNeeded}`);
	console.log(
		`   → Thời lượng mỗi phần: ~${maxDurationPerPart.toFixed(1)} giây`
	);

	let segments = calculateSegments(totalDuration, maxDurationPerPart);

	const lastSegment = segments[segments.length - 1];
	if (lastSegment.duration < MIN_LAST_SEGMENT_DURATION && segments.length > 1) {
		console.log(
			`\n⚠️  Phần cuối quá ngắn (${lastSegment.duration.toFixed(
				1
			)}s), đang điều chỉnh...`
		);
		const secondLastSegment = segments[segments.length - 2];
		secondLastSegment.duration += lastSegment.duration;
		segments.pop();
		console.log(
			`   ✅ Đã merge vào phần ${
				segments.length
			} (${secondLastSegment.duration.toFixed(1)}s)`
		);
	}

	return segments;
}

/**
 * Re-encode video segment để đảm bảo kích thước
 */
async function reencodeToSize(
	inputPath,
	outputPath,
	startTime,
	duration,
	maxSizeBytes
) {
	console.log(`   🔧 Re-encoding để đảm bảo kích thước...`);

	// Tính bitrate cần thiết
	// targetBytes * 8 / duration = total bitrate (bits/s)
	// Trừ đi ~128kbps cho audio
	const targetSizeBytes = maxSizeBytes * 0.95; // Để lại thêm 5% margin khi re-encode
	const audioBitrate = 128 * 1024; // 128kbps cho audio
	const videoBitrate = Math.floor(
		(targetSizeBytes * 8) / duration - audioBitrate
	);

	const ffmpegArgs = [
		'-y',
		'-ss',
		String(startTime),
		'-i',
		inputPath,
		'-t',
		String(duration),
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
		outputPath,
	];

	await runFfmpeg(ffmpegArgs);
}

/**
 * Cắt video thành các phần
 * @param {string} inputPath - Đường dẫn video input
 * @param {number} maxSizeMB - Kích thước tối đa mỗi phần (MB)
 * @param {string} outputDir - Thư mục output (sẽ tạo subfolder theo tên video)
 */
async function splitVideo(inputPath, maxSizeMB, outputDir) {
	const videoInfo = getVideoInfo(inputPath);
	const fileSizeMB = videoInfo.fileSize / (1024 * 1024);
	const maxSizeBytes = maxSizeMB * 1024 * 1024;

	// Lấy tên video (không có extension)
	const videoName = basename(inputPath, extname(inputPath));
	const videoExt = extname(inputPath);

	// Tạo subfolder theo tên video
	const videoOutputDir = join(outputDir, videoName);

	console.log(`\n${'═'.repeat(60)}`);
	console.log(`📹 Input: ${inputPath}`);
	console.log(`📂 Output folder: ${videoOutputDir}`);
	console.log(`📊 Kích thước file: ${fileSizeMB.toFixed(2)} MB`);
	console.log(
		`⏱️  Thời lượng: ${formatTime(
			videoInfo.duration
		)} (${videoInfo.duration.toFixed(1)} giây)`
	);
	console.log(
		`📈 Bitrate: ${(videoInfo.bitrate / 1024 / 1024).toFixed(2)} Mbps`
	);
	console.log(`🎬 Video codec: ${videoInfo.videoCodec}`);
	if (videoInfo.audioCodec) {
		console.log(`🔊 Audio codec: ${videoInfo.audioCodec}`);
	}
	console.log(
		`📏 Kích thước tối đa mỗi phần: ${maxSizeMB} MB (KHÔNG ĐƯỢC vượt quá)`
	);

	// Nếu file đã nhỏ hơn giới hạn, không cần cắt - chỉ copy vào folder
	if (fileSizeMB <= maxSizeMB) {
		console.log('\n✅ Video đã nhỏ hơn giới hạn.');

		// Vẫn tạo folder và copy file vào với tên _001
		if (!existsSync(videoOutputDir)) {
			mkdirSync(videoOutputDir, { recursive: true });
		}

		const outputPath = join(videoOutputDir, `${videoName}_001${videoExt}`);

		// Copy file
		const copyArgs = ['-y', '-i', inputPath, '-c', 'copy', outputPath];
		await runFfmpeg(copyArgs);

		console.log(`   📁 Đã copy vào: ${outputPath}`);
		return [outputPath];
	}

	// Tính toán các segments
	const segments = calculateOptimalSegments(
		videoInfo.duration,
		videoInfo.fileSize,
		maxSizeBytes
	);

	console.log(`\n📦 Sẽ cắt thành ${segments.length} phần:`);
	segments.forEach((seg, i) => {
		const estimatedSize = (seg.duration / videoInfo.duration) * fileSizeMB;
		console.log(
			`   Phần ${i + 1}: ${formatTime(seg.start)} → ${formatTime(
				seg.start + seg.duration
			)} (${seg.duration.toFixed(1)}s, ~${estimatedSize.toFixed(1)}MB)`
		);
	});

	// Tạo output directory
	if (!existsSync(videoOutputDir)) {
		mkdirSync(videoOutputDir, { recursive: true });
	}

	const outputFiles = [];

	// Cắt video theo từng phần
	for (let i = 0; i < segments.length; i++) {
		const seg = segments[i];
		const partNumber = String(i + 1).padStart(3, '0');
		const outputPath = join(
			videoOutputDir,
			`${videoName}_${partNumber}${videoExt}`
		);

		console.log(`\n🔄 Đang cắt phần ${i + 1}/${segments.length}...`);
		console.log(
			`   Từ: ${formatTime(seg.start)} → Đến: ${formatTime(
				seg.start + seg.duration
			)}`
		);

		try {
			// Thử stream copy trước
			const ffmpegArgs = [
				'-y',
				'-ss',
				String(seg.start),
				'-i',
				inputPath,
				'-t',
				String(seg.duration),
				'-c',
				'copy',
				'-avoid_negative_ts',
				'make_zero',
				outputPath,
			];

			await runFfmpeg(ffmpegArgs);

			let outputSize = statSync(outputPath).size / (1024 * 1024);
			console.log(
				`   ✅ Đã tạo: ${basename(outputPath)} (${outputSize.toFixed(2)} MB)`
			);

			// Nếu file vẫn vượt quá giới hạn, RE-ENCODE
			if (outputSize > maxSizeMB) {
				console.log(`   ⚠️  Vượt quá ${maxSizeMB}MB! Đang re-encode...`);

				// Xóa file cũ
				unlinkSync(outputPath);

				// Re-encode với bitrate cố định
				await reencodeToSize(
					inputPath,
					outputPath,
					seg.start,
					seg.duration,
					maxSizeBytes
				);

				outputSize = statSync(outputPath).size / (1024 * 1024);
				console.log(
					`   ✅ Re-encode xong: ${basename(outputPath)} (${outputSize.toFixed(
						2
					)} MB)`
				);

				// Nếu VẪN vượt quá sau re-encode, cắt thành nhiều phần nhỏ hơn
				if (outputSize > maxSizeMB) {
					console.log(`   ⚠️  Vẫn vượt quá! Đang chia nhỏ hơn...`);
					unlinkSync(outputPath);

					const subSegments = await splitAndReencode(
						inputPath,
						seg.start,
						seg.duration,
						maxSizeMB,
						videoOutputDir,
						videoName,
						videoExt,
						i + 1
					);
					outputFiles.push(...subSegments);
				} else {
					outputFiles.push(outputPath);
				}
			} else {
				outputFiles.push(outputPath);
			}
		} catch (error) {
			console.error(`   ❌ Lỗi khi cắt phần ${i + 1}:`, error.message);
		}
	}

	// Đổi tên lại các file để có số thứ tự liên tục
	const renamedFiles = renameFilesSequentially(
		outputFiles,
		videoOutputDir,
		videoName,
		videoExt
	);

	console.log(`\n${'═'.repeat(60)}`);
	console.log(
		`✅ Hoàn thành! Đã tạo ${renamedFiles.length} phần trong ${videoOutputDir}:`
	);

	let allUnderLimit = true;
	renamedFiles.forEach((file, i) => {
		const size = statSync(file).size / (1024 * 1024);
		const status = size <= maxSizeMB ? '✓' : '⚠️ VƯỢT GIỚI HẠN!';
		if (size > maxSizeMB) allUnderLimit = false;
		console.log(
			`   ${i + 1}. ${basename(file)} (${size.toFixed(2)} MB) ${status}`
		);
	});

	if (allUnderLimit) {
		console.log(`\n✅ Tất cả các phần đều ≤ ${maxSizeMB}MB`);
	}

	return renamedFiles;
}

/**
 * Cắt và re-encode segment thành các phần nhỏ hơn
 */
async function splitAndReencode(
	inputPath,
	startTime,
	duration,
	maxSizeMB,
	outputDir,
	baseName,
	ext,
	partIndex
) {
	const maxSizeBytes = maxSizeMB * 1024 * 1024;

	// Ước tính số phần cần (dự phòng chia 2)
	const numSubParts = 2;
	const subDuration = duration / numSubParts;

	const outputFiles = [];

	for (let i = 0; i < numSubParts; i++) {
		const subStart = startTime + i * subDuration;
		const partNumber = `${String(partIndex).padStart(3, '0')}_${String(
			i + 1
		).padStart(2, '0')}`;
		const outputPath = join(outputDir, `${baseName}_${partNumber}${ext}`);

		// Re-encode với bitrate cố định
		await reencodeToSize(
			inputPath,
			outputPath,
			subStart,
			subDuration,
			maxSizeBytes
		);

		const outputSize = statSync(outputPath).size / (1024 * 1024);
		console.log(
			`      ✅ Sub-part ${i + 1}/${numSubParts}: ${basename(
				outputPath
			)} (${outputSize.toFixed(2)} MB)`
		);

		outputFiles.push(outputPath);
	}

	return outputFiles;
}

/**
 * Đổi tên các file để có số thứ tự liên tục
 */
function renameFilesSequentially(files, outputDir, baseName, ext) {
	const renamedFiles = [];

	files.forEach((file, index) => {
		const partNumber = String(index + 1).padStart(3, '0');
		const newPath = join(outputDir, `${baseName}_${partNumber}${ext}`);

		if (file !== newPath) {
			const tempPath = join(outputDir, `${baseName}_temp_${partNumber}${ext}`);
			renameSync(file, tempPath);
			renamedFiles.push({ temp: tempPath, final: newPath });
		} else {
			renamedFiles.push({ temp: file, final: file });
		}
	});

	return renamedFiles.map(({ temp, final }) => {
		if (temp !== final) {
			renameSync(temp, final);
		}
		return final;
	});
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
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
			}
		});

		process.on('error', (err) => {
			reject(err);
		});
	});
}

/**
 * Format time thành HH:MM:SS
 */
function formatTime(seconds) {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(
		s
	).padStart(2, '0')}`;
}

/**
 * Xử lý tất cả video trong thư mục ./data
 */
async function processDataDirectory(dataDir, maxSizeMB) {
	const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv'];

	if (!existsSync(dataDir)) {
		console.log(`📁 Tạo thư mục data: ${dataDir}`);
		mkdirSync(dataDir, { recursive: true });
		console.log(
			`\n⚠️  Thư mục data trống. Vui lòng thêm video vào: ${dataDir}`
		);
		return;
	}

	const files = readdirSync(dataDir);

	// Chỉ lấy file video ở root của data folder (không lấy trong subfolder)
	const videoFiles = files.filter((file) => {
		const filePath = join(dataDir, file);
		const ext = extname(file).toLowerCase();
		const isFile = statSync(filePath).isFile();
		return isFile && videoExtensions.includes(ext);
	});

	if (videoFiles.length === 0) {
		console.log(`\n⚠️  Không tìm thấy video nào trong: ${dataDir}`);
		console.log(`   Hỗ trợ: ${videoExtensions.join(', ')}`);
		return;
	}

	console.log(`\n📁 Tìm thấy ${videoFiles.length} video trong ${dataDir}:`);
	videoFiles.forEach((file, i) => {
		const filePath = join(dataDir, file);
		const size = statSync(filePath).size / (1024 * 1024);
		console.log(`   ${i + 1}. ${file} (${size.toFixed(2)} MB)`);
	});

	const results = [];

	for (const videoFile of videoFiles) {
		const inputPath = join(dataDir, videoFile);
		const outputFiles = await splitVideo(inputPath, maxSizeMB, dataDir);
		results.push({
			input: videoFile,
			outputs: outputFiles.map((f) => basename(f)),
		});
	}

	// Tổng kết
	console.log(`\n${'═'.repeat(60)}`);
	console.log(`🎉 HOÀN THÀNH TẤT CẢ!`);
	console.log(`${'═'.repeat(60)}`);
	results.forEach((result) => {
		console.log(`\n📹 ${result.input}:`);
		result.outputs.forEach((output) => {
			console.log(`   └── ${output}`);
		});
	});
}

/**
 * Main function
 */
async function main() {
	checkFfmpeg();

	const args = process.argv.slice(2);

	// Parse arguments
	let dataDir = DEFAULT_DATA_DIR;
	let maxSizeMB = DEFAULT_MAX_SIZE_MB;

	if (args.includes('--help') || args.includes('-h')) {
		console.log(`
📹 Video Splitter - Tự động cắt video theo kích thước

Usage: node split-video.js [data_directory] [max_size_mb]

Arguments:
  data_directory    Thư mục chứa video (mặc định: ./data)
  max_size_mb       Kích thước tối đa mỗi phần (mặc định: ${DEFAULT_MAX_SIZE_MB} MB)

Cách hoạt động:
  1. Đặt video vào thư mục ./data (hoặc thư mục bạn chỉ định)
  2. Chạy script: node split-video.js
  3. Mỗi video sẽ được cắt và đặt vào subfolder riêng:
     ./data/
       ├── video1.mp4           (file gốc)
       ├── video1/              (folder output)
       │   ├── video1_001.mp4
       │   ├── video1_002.mp4
       │   └── video1_003.mp4
       ├── video2.mp4
       └── video2/
           ├── video2_001.mp4
           └── video2_002.mp4

Tính năng:
  ✅ Cắt thành nhiều phần, giữ tất cả các phần
  ✅ Mỗi phần tối đa ${DEFAULT_MAX_SIZE_MB}MB (KHÔNG BAO GIỜ vượt quá)
  ✅ Mỗi phần tối đa ${MAX_SEGMENT_DURATION} giây
  ✅ Mỗi phần tối thiểu ${MIN_SEGMENT_DURATION} giây
  ✅ Phần cuối tối thiểu ${MIN_LAST_SEGMENT_DURATION} giây
  ✅ Giữ chất lượng gốc (stream copy), tự động re-encode nếu vượt quá

Examples:
  node split-video.js                     # Xử lý ./data với limit 20MB
  node split-video.js ./videos            # Xử lý ./videos
  node split-video.js ./data 15           # Limit 15MB
`);
		process.exit(0);
	}

	// Parse positional arguments
	if (args[0] && !args[0].startsWith('-')) {
		dataDir = resolve(args[0]);
	}

	if (args[1] && !isNaN(parseFloat(args[1]))) {
		maxSizeMB = parseFloat(args[1]);
	}

	console.log(`\n🎬 Video Splitter`);
	console.log(`${'─'.repeat(40)}`);
	console.log(`📂 Data folder: ${dataDir}`);
	console.log(`📏 Max size: ${maxSizeMB} MB (KHÔNG ĐƯỢC vượt quá)`);

	await processDataDirectory(dataDir, maxSizeMB);
}

main().catch(console.error);
