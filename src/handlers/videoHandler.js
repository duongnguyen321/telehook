import fs from 'fs';
import path from 'path';
import os from 'os';
import { InlineKeyboard, InputFile } from 'grammy';
import {
	addScheduledPost,
	getPendingPostsByChat,
	getAllPostsByChat,
	isVideoDuplicate,
	trackDownloadedVideo,
	updateVideoStatus,
	updatePostStatus,
	rescheduleTimesOnly,
	deleteScheduledPost,
	updatePostContent,
	updatePostFileId,
	updatePostVideo,
	cleanOrphanedPosts,
	getNextScheduledPost,
	DATA_DIR,
	prisma,
} from '../utils/storage.js';
import { formatVietnameseTime } from '../utils/timeParser.js';
import { scheduleUpload, setDefaultChatId } from '../services/scheduler.js';
import {
	generateContentOptions,
	getCategories,
	getCategoryOptions,
	generateContentFromCategories,
	getCategoryName,
	getOptionLabel,
	getCategoryKeyByIndex,
	getOptionKeyByIndex,
} from '../services/ai.js';
import { downloadVideo, queueDownload } from '../utils/downloader.js';
import { createOrUpdateUser } from '../services/userService.js';
import {
	getUserRole,
	hasPermission,
	getRoleDisplayName,
	isAdmin,
} from '../services/roleService.js';
import {
	logAction,
	getUserActivitySummary,
	getUsersWithViewCounts,
	getUserViewHistory,
	getAnalyticsSummary,
} from '../services/auditService.js';
import {
	isS3Enabled,
	uploadVideo as s3UploadVideo,
	downloadVideo as s3DownloadVideo,
	videoExists as s3VideoExists,
	deleteVideo as s3DeleteVideo,
} from '../utils/s3.js';
import {
	parseClipArgs,
	clipVideo,
	cleanupTempFile,
} from '../services/clipService.js';
import {
	upscaleVideo,
	cleanupUpscaledFile,
	getVideoDuration,
} from '../services/videoProcessor.js';

// Temporary storage for category selections during content generation
// Key: `${chatId}_${postId}`, Value: { POSE: 'FRONT', ACTION: 'SHOWING', ... }
const categorySelections = new Map();

// Temporary storage for generated options to allow user selection
// Key: `${chatId}_${postId}`, Value: Array of content options
const generatedOptions = new Map();

// Temporary storage for pending clip operations
// Key: `clip_${chatId}_${postId}`, Value: { postId, originalVideoPath, tempOutputPath, previewMessageId, newVideoPath }
const pendingClips = new Map();

/**
 * Build miniapp keyboard button based on user role
 * @param {number} userId
 * @returns {import('grammy').InlineKeyboard}
 */
function buildMiniappKeyboard(userId) {
	const BASE_URL = process.env.BASE_URL || 'http://localhost:8888';
	const userRole = getUserRole(userId);
	const isPrivileged = ['admin', 'mod', 'reviewer'].includes(userRole);
	const linkLabel = isPrivileged ? '🎬 Quản lý Video' : '📺 Xem Video';
	const linkPath = isPrivileged ? '/admin' : '/';
	const fullLink = `${BASE_URL}${linkPath}`;

	const keyboard = new InlineKeyboard();
	if (fullLink.startsWith('https')) {
		keyboard.webApp(linkLabel, fullLink);
	}

	return keyboard;
}

/**
 * Build category selection keyboard
 * @param {string} postId
 * @param {number} page
 * @param {Object} selections - Current selections
 * @returns {InlineKeyboard}
 */
function buildCategoryKeyboard(postId, page, selections = {}) {
	const keyboard = new InlineKeyboard();
	const categories = getCategories();

	// Add category buttons (2 per row)
	for (let i = 0; i < categories.length; i++) {
		const cat = categories[i];
		const isSelected = selections[cat.key];
		const label = isSelected
			? `✅ ${cat.emoji} ${cat.name}`
			: `${cat.emoji} ${cat.name}`;
		// Use index instead of key to save space
		keyboard.text(label, `cat_${postId}_${page}_${i}`);
		if (i % 2 === 1) keyboard.row();
	}

	// Add action buttons
	keyboard.row();
	keyboard.text('✅ Xong', `done_${postId}_${page}`);
	keyboard.text('🔀 Random', `rand_${postId}_${page}`);
	keyboard.row();
	keyboard.text('❌ Hủy', `cancel_${postId}_${page}`);

	return keyboard;
}

/**
 * Build options keyboard for a category
 * @param {string} postId
 * @param {number} page
 * @param {string} categoryKey
 * @param {Array} selectedOptions - Array of selected option keys for this category
 * @returns {InlineKeyboard}
 */
function buildOptionsKeyboard(postId, page, categoryKey, selectedOptions = []) {
	const keyboard = new InlineKeyboard();
	const options = getCategoryOptions(categoryKey);

	if (!options) return keyboard;

	// We need category index for the callback
	const categories = getCategories();
	const catIndex = categories.findIndex((c) => c.key === categoryKey);

	for (let i = 0; i < options.length; i++) {
		const opt = options[i];
		const isSelected = selectedOptions.includes(opt.key);
		const label = isSelected ? `✅ ${opt.label}` : opt.label;
		// Use indices: opt_ID_Page_CatIndex_OptIndex
		keyboard.text(label, `opt_${postId}_${page}_${catIndex}_${i}`);
		if (i % 2 === 1) keyboard.row();
	}

	// Back button
	keyboard.row();
	keyboard.text('⬅️ Quay lại', `back_${postId}_${page}`);

	return keyboard;
}

/**
 * Format all selections for display
 * @param {Object} selections - { CATEGORY_KEY: [optKey1, optKey2], ... }
 * @returns {string}
 */
function formatSelectionsDisplay(selections) {
	const lines = [];
	for (const [catKey, optKeys] of Object.entries(selections)) {
		if (!optKeys || optKeys.length === 0) continue;
		const catName = getCategoryName(catKey);
		const optLabels = optKeys
			.map((k) => getOptionLabel(catKey, k))
			.filter(Boolean);
		if (optLabels.length > 0) {
			lines.push(`✅ **${catName}**: ${optLabels.join(', ')}`);
		}
	}
	return lines.length > 0 ? lines.join('\n') : 'Chưa chọn gì';
}

/**
 * Safely edit message caption (for video) or text
 * @param {import('grammy').Context} ctx
 * @param {string} text
 * @param {import('grammy').InlineKeyboard} keyboard
 */
async function safeEditMessage(ctx, text, keyboard) {
	try {
		const isVideo = !!ctx.callbackQuery?.message?.video;
		// Caption limit is 1024 chars
		if (isVideo && text.length <= 1024) {
			await ctx.editMessageCaption({
				caption: text,
				reply_markup: keyboard,
				parse_mode: 'Markdown',
			});
		} else {
			// If not video, or text too long, fall back to text edit
			if (isVideo && text.length > 1024) {
				// Must convert to text message
				try {
					await ctx.api.deleteMessage(
						ctx.chat.id,
						ctx.callbackQuery.message.message_id
					);
				} catch (e) {
					/* ignore */
				}
				await ctx.reply(text, {
					reply_markup: keyboard,
					parse_mode: 'Markdown',
				});
			} else {
				// Normal text message edit
				await ctx.editMessageText(text, {
					reply_markup: keyboard,
					parse_mode: 'Markdown',
				});
			}
		}
	} catch (e) {
		console.error('[UI] Error editing message:', e.message);
	}
}

/**
 * Send paginated queue page with video details + video file
 * @param {import('grammy').Context} ctx
 * @param {number} chatId
 * @param {number} page - Page number, or -1 to use default (last posted video)
 * @param {number|null} messageId
 * @param {Object} permissions - User permission flags
 */
async function sendQueuePage(
	ctx,
	chatId,
	page,
	messageId = null,
	permissions = { canEdit: false, canDelete: false }
) {
	const { posts, lastPostedIndex } = await getAllPostsByChat(chatId);
	const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME || '';
	const BASE_URL = process.env.BASE_URL || 'http://localhost:8888';
	// Determine role-based link
	const userRole = getUserRole(chatId); // Assuming chatId is userId for private chats
	const isPrivileged = ['admin', 'mod', 'reviewer'].includes(userRole);
	const linkLabel = isPrivileged ? '🎬 Quản lý Video' : '📺 Xem Video';
	const linkPath = isPrivileged ? '/admin' : '/';
	const fullLink = `${BASE_URL}${linkPath}`;

	// Ensure BASE_URL is https for WebApp (required by Telegram), but local might be http.
	// We'll trust the user has set it correctly or it's a redirect.
	// If BASE_URL is http, Web App button might not work if not localhost/configured strictly.
	// But we use 'url' button for safe compatibility if not strictly WebApp.
	// User said "BASE_URL is url displayed on mini app", so we can use it as Web App URL if https.

	const tiktokLink = TIKTOK_USERNAME
		? `\n\n🔥 Follow: https://tiktok.com/@${TIKTOK_USERNAME}`
		: '';

	// Build keyboard with Open App button if needed
	const webAppBtn = new InlineKeyboard().webApp(linkLabel, fullLink);

	if (posts.length === 0) {
		const text = 'Không có video nào' + tiktokLink;
		const emptyKeyboard = new InlineKeyboard();
		if (fullLink.startsWith('https')) {
			emptyKeyboard.webApp(linkLabel, fullLink);
		}
		if (messageId) {
			try {
				await ctx.api.editMessageText(chatId, messageId, text, {
					reply_markup: emptyKeyboard,
				});
			} catch (e) {
				await ctx.reply(text, { reply_markup: emptyKeyboard });
			}
		} else {
			await ctx.reply(text, { reply_markup: emptyKeyboard });
		}
		return;
	}

	// Use default page (last posted video) if page is -1
	const actualPage = page === -1 ? lastPostedIndex : page;
	const post = posts[actualPage];
	if (!post) {
		await sendQueuePage(ctx, chatId, 0, messageId, permissions);
		return;
	}

	const time = formatVietnameseTime(new Date(post.scheduledAt));
	const statusEmoji = post.status === 'posted' ? '✅' : '⏳';
	const statusText = post.status === 'posted' ? 'Đã đăng' : 'Chờ đăng';
	const caption =
		`[${actualPage + 1}/${
			posts.length
		}] ${statusEmoji} ${statusText} - ${time}\n\n` +
		`${post.title}\n\n` +
		`${post.hashtags}` +
		tiktokLink;

	// Build keyboard
	const keyboard = new InlineKeyboard();

	// Add Open App Button at the top
	if (fullLink.startsWith('https')) {
		keyboard.webApp(linkLabel, fullLink).row();
	}

	// Navigation row
	const navRow = [];
	if (actualPage > 0) {
		navRow.push({ text: '⏮️ Start', callback_data: `queue_0` });
		navRow.push({ text: '◀️ Prev', callback_data: `queue_${actualPage - 1}` });
	}
	if (actualPage < posts.length - 1) {
		navRow.push({ text: 'Next ▶️', callback_data: `queue_${actualPage + 1}` });
		navRow.push({ text: 'End ⏭️', callback_data: `queue_${posts.length - 1}` });
	}
	keyboard.row(...navRow);

	// Fast navigation row
	const fastNavRow = [];
	if (actualPage >= 10) {
		fastNavRow.push({
			text: '<< 10',
			callback_data: `queue_${actualPage - 10}`,
		});
	}
	if (actualPage >= 5) {
		fastNavRow.push({ text: '<< 5', callback_data: `queue_${actualPage - 5}` });
	}

	if (actualPage <= posts.length - 6) {
		fastNavRow.push({ text: '5 >>', callback_data: `queue_${actualPage + 5}` });
	}
	if (actualPage <= posts.length - 11) {
		fastNavRow.push({
			text: '10 >>',
			callback_data: `queue_${actualPage + 10}`,
		});
	}
	if (fastNavRow.length > 0) {
		keyboard.row(...fastNavRow);
	}

	// Action buttons (Edit/Delete for pending) + Reset
	const actionRow = [];

	if (post.status === 'pending') {
		if (permissions.canEdit) {
			actionRow.push({
				text: '✏️ Đổi nội dung',
				callback_data: `regen_${post.id}_${actualPage}`,
			});
		}

		actionRow.push({ text: '🔄 Reset', callback_data: `queue_-1` });

		if (permissions.canDelete) {
			actionRow.push({
				text: '🗑️ Xóa',
				callback_data: `delask_${post.id}_${actualPage}`,
			});
		}
	}

	if (actionRow.length > 0) {
		keyboard.row(...actionRow);
	}

	// Prepare video source with priority: file_id > local > S3
	const videoKey = path.basename(post.videoPath);
	const localPath = path.join(DATA_DIR, 'videos', videoKey);
	let videoBuffer = null;
	let needsFileIdSave = false;

	// Priority 1: Use cached Telegram file_id (skip all downloads)
	if (post.telegramFileId) {
		console.log(`[Queue] Using cached file_id: ${videoKey}`);
		// videoBuffer stays null, we'll use telegramFileId directly
	} else {
		// Priority 2: Check local file
		if (fs.existsSync(localPath)) {
			console.log(`[Queue] Using local file: ${videoKey}`);
			needsFileIdSave = true;
		} else if (isS3Enabled()) {
			// Priority 3: Download from S3 AND cache locally
			console.log(`[Queue] Downloading from S3: ${videoKey}`);
			const cacheDir = path.join(DATA_DIR, 'videos');
			videoBuffer = await s3DownloadVideo(videoKey, cacheDir);
			needsFileIdSave = true;
		}
	}

	// Check if video source is available
	if (
		!post.telegramFileId &&
		!fs.existsSync(path.join(DATA_DIR, 'videos', videoKey)) &&
		!videoBuffer
	) {
		const text =
			`[${page + 1}/${posts.length}] Video file missing!\n${time}` + tiktokLink;
		if (messageId) {
			try {
				await ctx.api.editMessageText(chatId, messageId, text, {
					reply_markup: keyboard,
				});
			} catch (e) {
				await ctx.reply(text, { reply_markup: keyboard });
			}
		} else {
			await ctx.reply(text, { reply_markup: keyboard });
		}
		return;
	}

	// Try editing content if messageId provided
	if (messageId) {
		try {
			let videoSource;
			if (post.telegramFileId) {
				videoSource = post.telegramFileId;
			} else if (videoBuffer) {
				videoSource = new InputFile(videoBuffer, videoKey);
			} else {
				videoSource = new InputFile(localPath);
			}

			// DEBUG: Log the source to debug MEDIA_EMPTY
			if (typeof videoSource === 'string') {
				console.log(`[Queue] Attempting edit with file_id: "${videoSource}"`);
			}

			await ctx.api.editMessageMedia(
				chatId,
				messageId,
				{
					type: 'video',
					media: videoSource,
					caption: caption,
					parse_mode: 'Markdown',
					supports_streaming: true,
				},
				{
					reply_markup: keyboard,
				}
			);
			return; // Edit success
		} catch (e) {
			const errDesc = e.description || '';

			// Case 1: Message to edit is gone (Race condition / Duplicate request)
			if (
				errDesc.includes('message to edit not found') ||
				errDesc.includes('message not found')
			) {
				console.warn(
					`[Queue] Target message ${messageId} missing (race condition), switching to send mode.`
				);
				// Message is already gone, no need to delete. Fall through to sendVideo.
			}
			// Case 2: Media is invalid (Cache mismatch / Expired)
			else if (
				errDesc.includes('MEDIA_EMPTY') ||
				errDesc.includes('wrong file identifier')
			) {
				console.warn(
					`[Queue] Media invalid for ${videoKey}, clearing cache and refreshing.`
				);

				// Clear invalid cache
				if (post.telegramFileId) {
					await updatePostFileId(post.id, null);
					post.telegramFileId = null;
				}

				// Old message exists but is broken, delete it so we can send a fresh one
				try {
					await ctx.api.deleteMessage(chatId, messageId);
				} catch (d) {
					/* ignore delete error */
				}
			}
			// Case 3: Message not modified (Content is identical)
			else if (errDesc.includes('message is not modified')) {
				// This is expected if user clicks same button or rapid navigation leads to same state.
				// Do nothing.
				return;
			}
			// Case 4: Unknown error - try to edit text only as fallback before delete/send
			else {
				console.error(
					`[Queue] Edit failed (${e.message}), trying text-only edit before delete/send.`
				);
				// Try editing just the caption/text without changing media
				try {
					await ctx.api.editMessageCaption(chatId, messageId, {
						caption: caption,
						reply_markup: keyboard,
						parse_mode: 'Markdown',
					});
					return; // Caption edit success, no need to send new message
				} catch (captionErr) {
					// Caption edit also failed, fall back to delete/send
					console.warn(
						`[Queue] Caption edit also failed, falling back to delete/send`
					);
					try {
						await ctx.api.deleteMessage(chatId, messageId);
					} catch (d) {
						/* ignore delete error */
					}
				}
			}
		}
	}

	// Send new message (or fallback from failed edit)
	// Use cached file_id if available, otherwise upload from disk or S3 buffer
	let videoSource;
	if (post.telegramFileId) {
		videoSource = post.telegramFileId;
	} else if (videoBuffer) {
		videoSource = new InputFile(videoBuffer, videoKey);
	} else {
		videoSource = new InputFile(localPath);
	}

	// Retry/Failvover Logic for Send Video
	try {
		const sendWithSource = async (source) => {
			return await ctx.api.sendVideo(chatId, source, {
				caption: caption,
				reply_markup: keyboard,
				supports_streaming: true,
			});
		};

		let sentMessage;
		try {
			sentMessage = await sendWithSource(videoSource);
		} catch (err) {
			// If failed and we were using a cached file_id, try fallback to file/buffer
			if (
				post.telegramFileId &&
				err.description &&
				err.description.includes('wrong file identifier')
			) {
				console.warn(
					`[Queue] Invalid file_id for ${videoKey}, retrying with local file...`
				);

				// Clear invalid file_id
				await updatePostFileId(post.id, null);

				// Determine fallback source
				// Determine fallback source
				let fallbackSource;
				if (videoBuffer) {
					fallbackSource = new InputFile(videoBuffer, videoKey);
				} else if (fs.existsSync(localPath)) {
					fallbackSource = new InputFile(localPath);
				} else if (isS3Enabled()) {
					console.log(
						`[Queue] Local file missing during fallback, downloading from S3: ${videoKey}`
					);
					const cacheDir = path.join(DATA_DIR, 'videos');
					const buffer = await s3DownloadVideo(videoKey, cacheDir);
					if (buffer) {
						fallbackSource = new InputFile(buffer, videoKey);
					} else {
						throw new Error('Fallback failed: File not found locally or in S3');
					}
				} else {
					throw new Error('Fallback failed: File not found locally');
				}

				sentMessage = await sendWithSource(fallbackSource);
				needsFileIdSave = true; // Flag to save new file_id
			} else {
				throw err; // Re-throw other errors
			}
		}

		// Save file_id for future use if we uploaded from disk/S3
		if (needsFileIdSave && sentMessage.video?.file_id) {
			await updatePostFileId(post.id, sentMessage.video.file_id);
			console.log(`[Queue] Cached file_id for: ${videoKey}`);
		}
	} catch (e) {
		console.error('[Queue] Error sending video:', e.message);
		await ctx.reply(`Error loading video: ${e.message.slice(0, 50)}...`);
	}
}

/**
 * Process video after successful download
 */
async function processVideoAfterDownload(ctx, video, videoPath, chatId) {
	try {
		const fileName = path.basename(videoPath);

		// Upload to S3 if enabled
		// Check for low quality and upscale if needed
		let finalVideoPath = videoPath;
		let wasUpscaled = false;

		if (video.width && video.height) {
			const minDim = Math.min(video.width, video.height);
			if (minDim < 720) {
				console.log(
					`[Video] Low quality (${video.width}x${video.height}), upscaling...`
				);
				await ctx.reply(
					'⏳ Video chưa đạt HD (720p), đang làm nét... (vui lòng đợi)'
				);

				const result = await upscaleVideo(videoPath);
				if (result.success && result.outputPath) {
					// Delete original low-res file
					try {
						fs.unlinkSync(videoPath);
					} catch (e) {}

					finalVideoPath = result.outputPath;
					wasUpscaled = true;
					console.log(`[Video] Upscale success: ${finalVideoPath}`);
				} else {
					console.error(`[Video] Upscale failed: ${result.error}`);
					await ctx.reply('⚠️ Không thể làm nét video, sẽ dùng bản gốc.');
				}
			}
		}

		// Get precise duration BEFORE uploading to S3 (while file exists locally)
		// This enables accurate duplicate detection (videos match to 0.01s precision)
		let preciseDuration = null;
		try {
			if (fs.existsSync(finalVideoPath)) {
				preciseDuration = await getVideoDuration(finalVideoPath);
				console.log(`[Video] Precise duration: ${preciseDuration}s (ffprobe)`);
			}
		} catch (e) {
			console.error('[Video] Failed to get precise duration:', e.message);
			preciseDuration = video.duration || null; // Fallback to Telegram duration
		}

		if (isS3Enabled()) {
			const fileName = path.basename(finalVideoPath);
			const uploaded = await s3UploadVideo(finalVideoPath, fileName);
			if (uploaded) {
				// Keep local file as cache for faster access
				// Priority: telegramFileId → local file → R2
				if (wasUpscaled) {
					// Only move upscaled file from temp dir to videos dir
					const videosDir = path.join(DATA_DIR, 'videos');
					const destPath = path.join(videosDir, fileName);
					if (finalVideoPath !== destPath) {
						try {
							fs.renameSync(finalVideoPath, destPath);
							finalVideoPath = destPath;
							console.log(
								`[Video] Moved upscaled file to videos dir: ${fileName}`
							);
						} catch (e) {
							console.log(
								`[Video] Upscaled file already in place: ${fileName}`
							);
						}
					}
				}
				console.log(`[Video] Uploaded to S3, keeping local cache: ${fileName}`);
			} else {
				console.log('[Video] S3 upload failed, keeping local file');
			}
		}

		// Track video
		await trackDownloadedVideo(
			video.file_id,
			chatId,
			finalVideoPath,
			video.file_size || 0
		);

		// Generate random content
		const [content] = generateContentOptions();

		// Auto schedule with file_id for instant sends later
		const post = await addScheduledPost({
			chatId,
			videoPath: finalVideoPath,
			title: content.title,
			hashtags: content.hashtags,
			isRepost: false,
			telegramFileId: video.file_id, // Save for instant sends
			duration: preciseDuration, // Precise duration from ffprobe
			fileSize: video.file_size || null, // For reference
		});

		await scheduleUpload(post, new Date(post.scheduledAt));
		await updateVideoStatus(video.file_id, 'scheduled');

		const time = formatVietnameseTime(new Date(post.scheduledAt));
		const storageNote = isS3Enabled() ? ' (S3)' : ' (local)';
		console.log(`[Video] Scheduled: ${time}${storageNote}`);

		await ctx.reply(`Scheduled: ${time}`);

		// Log upload action
		const userId = ctx.from?.id;
		if (userId) {
			await logAction(userId, 'upload_video', post.id, `Scheduled at ${time}`);
		}
	} catch (error) {
		console.error('[Video] Process error:', error.message);
	}
}

/**
 * Handle background video upscaling
 * @param {string} postId
 * @param {string} originalVideoPath - Path of the original video
 * @param {number} duration
 * @param {number} chatId
 * @param {import('grammy').Api} api
 */
async function handleBackgroundUpscale(
	postId,
	originalVideoPath,
	duration,
	chatId,
	api
) {
	console.log(`[BackgroundUpscale] Starting for post: ${postId}`);
	try {
		const videoKey = path.basename(originalVideoPath);
		let tempInputPath = originalVideoPath;
		let needsDownload = !fs.existsSync(originalVideoPath);

		if (isS3Enabled() && needsDownload) {
			const tempDir = path.join(os.tmpdir(), `down_${Date.now()}`);
			if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
			tempInputPath = path.join(tempDir, videoKey);
			console.log(`[BackgroundUpscale] Downloading from S3: ${videoKey}`);
			const downloaded = await s3DownloadVideo(videoKey, tempDir);
			if (!downloaded) {
				console.error('[BackgroundUpscale] Failed to download from S3');
				return;
			}
		} else if (needsDownload) {
			console.error('[BackgroundUpscale] Local file missing');
			return;
		}

		const result = await upscaleVideo(tempInputPath, duration);

		if (isS3Enabled() && needsDownload) {
			try {
				fs.rmSync(path.dirname(tempInputPath), {
					recursive: true,
					force: true,
				});
			} catch (e) {}
		}

		if (!result.success || !result.outputPath) {
			console.error(`[BackgroundUpscale] Failed: ${result.error}`);
			await api.sendMessage(
				chatId,
				`⚠️ Làm nét thất bại cho video (Post ID: ${postId}). Giữ nguyên bản gốc.`
			);
			return;
		}

		const newVideoPath = result.outputPath;
		console.log(`[BackgroundUpscale] Success: ${newVideoPath}`);

		if (isS3Enabled()) {
			const newFileName = path.basename(newVideoPath);
			const uploaded = await s3UploadVideo(newVideoPath, newFileName);
			if (!uploaded) {
				console.error('[BackgroundUpscale] Failed to upload new video to S3');
				return;
			}

			await prisma.scheduledPost.update({
				where: { id: postId },
				data: {
					videoPath: path.join(DATA_DIR, 'videos', newFileName),
					telegramFileId: null, // Force re-upload
				},
			});

			await s3DeleteVideo(videoKey);
			console.log(
				`[BackgroundUpscale] Updated DB and deleted old S3 video: ${videoKey}`
			);

			cleanupUpscaledFile(newVideoPath);
		} else {
			const newFileName = path.basename(newVideoPath);
			const destPath = path.join(DATA_DIR, 'videos', newFileName);

			fs.copyFileSync(newVideoPath, destPath);
			cleanupUpscaledFile(newVideoPath);

			await prisma.scheduledPost.update({
				where: { id: postId },
				data: {
					videoPath: destPath,
					telegramFileId: null,
				},
			});

			if (fs.existsSync(originalVideoPath)) {
				fs.unlinkSync(originalVideoPath);
			}
			console.log(`[BackgroundUpscale] Updated DB and replaced local file`);
		}

		await api.sendMessage(
			chatId,
			`✨ Video đã được làm nét và cập nhật! (Post ID: ${postId})`
		);
	} catch (error) {
		console.error('[BackgroundUpscale] Critical error:', error);
	}
}

/**
 * Setup video handler for the bot - fully automatic scheduling
 * @param {import('grammy').Bot} bot
 */
export function setupVideoHandler(bot) {
	// Handle video messages - auto schedule without user input
	bot.on('message:video', async (ctx) => {
		const userId = ctx.from?.id;
		const video = ctx.message.video;
		const chatId = ctx.chat.id;
		const isForwarded =
			!!ctx.message.forward_origin || !!ctx.message.forward_date;

		// Check authorization - need upload permission (mod or admin)
		if (!hasPermission(userId, 'upload')) {
			await ctx.reply('Bạn không có quyền upload video.');
			return;
		}

		setDefaultChatId(chatId);

		// Handle forwarded videos - only skip if file_id already exists
		if (isForwarded) {
			console.log(
				`[Video] Forwarded video received: ${video.file_id.slice(-8)}`
			);

			// Check if this file_id already exists in database
			const existingPost = await prisma.scheduledPost.findFirst({
				where: { telegramFileId: video.file_id },
			});

			if (existingPost) {
				console.log(
					`[Video] Duplicate file_id, skipping: ${video.file_id.slice(-8)}`
				);
				await ctx.reply('ℹ️ Video này đã tồn tại trong hệ thống.');
				return;
			}

			// Check file size (>20MB)
			const sizeMB = ((video.file_size || 0) / 1024 / 1024).toFixed(1);
			if (video.file_size && video.file_size > 20 * 1024 * 1024) {
				console.log(`[Video] Forwarded video too big: ${sizeMB}MB`);
				await ctx.reply('Video too big (>20MB), skipped.');
				return;
			}

			// Process as new video (download, upload to R2, save file_id, create schedule)
			try {
				const file = await ctx.api.getFile(video.file_id);
				const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

				const videoDir = path.join(DATA_DIR, 'videos');
				if (!fs.existsSync(videoDir)) {
					fs.mkdirSync(videoDir, { recursive: true });
				}

				const fileName = `${Date.now()}_${video.file_id.slice(-8)}.mp4`;
				const videoPath = path.join(videoDir, fileName);

				console.log('[Video] Downloading forwarded video...');
				const success = await downloadVideo(fileUrl, videoPath, 30000);

				if (success) {
					await processVideoAfterDownload(ctx, video, videoPath, chatId);
				} else {
					await ctx.reply('❌ Không thể tải video forwarded.');
				}
			} catch (error) {
				console.error(
					'[Video] Error processing forwarded video:',
					error.message
				);
				await ctx.reply(`Error: ${error.message.slice(0, 50)}`);
			}
			return;
		}

		// Regular video upload flow (not forwarded)
		// Check for duplicate
		if (await isVideoDuplicate(video.file_id)) {
			console.log(`[Video] Duplicate, skipping`);
			await ctx.reply('ℹ️ Video này đã tồn tại trong hệ thống.');
			return;
		}

		const sizeMB = ((video.file_size || 0) / 1024 / 1024).toFixed(1);
		console.log(`[Video] Received: ${video.file_id.slice(-8)} (${sizeMB}MB)`);

		// Check file size (>20MB)
		if (video.file_size && video.file_size > 20 * 1024 * 1024) {
			console.log(`[Video] Too big: ${sizeMB}MB`);
			await ctx.reply('Video too big (>20MB), skipped.');
			return;
		}

		try {
			// Get file URL
			const file = await ctx.api.getFile(video.file_id);
			const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

			const videoDir = path.join(DATA_DIR, 'videos');
			if (!fs.existsSync(videoDir)) {
				fs.mkdirSync(videoDir, { recursive: true });
			}

			const fileName = `${Date.now()}_${video.file_id.slice(-8)}.mp4`;
			const videoPath = path.join(videoDir, fileName);

			// Try download with 30s timeout
			console.log('[Video] Downloading (30s timeout)...');
			const success = await downloadVideo(fileUrl, videoPath, 30000);

			if (!success) {
				// Queue for background retry
				console.log('[Video] Timeout, queuing for retry...');
				await ctx.reply('Download slow, retrying in background...');

				queueDownload({
					fileId: video.file_id,
					fileUrl,
					videoPath,
					chatId,
					onSuccess: async () => {
						await processVideoAfterDownload(ctx, video, videoPath, chatId);
					},
					onFail: async () => {
						console.log(
							`[Video] Failed after 3 retries: ${video.file_id.slice(-8)}`
						);
					},
				});
				return;
			}

			// Process immediately if download succeeded
			await processVideoAfterDownload(ctx, video, videoPath, chatId);
		} catch (error) {
			console.error('[Video] Error:', error.message);
			await ctx.reply(`Error: ${error.message.replace(/[^\x00-\x7F]/g, '')}`);
		}
	});

	bot.on('message:video_note', async (ctx) => {
		await ctx.reply('Round video not supported');
	});

	// Handle pagination and delete callbacks
	bot.on('callback_query:data', async (ctx) => {
		const data = ctx.callbackQuery.data;
		const chatId = ctx.chat.id;
		const userId = ctx.from?.id;
		const messageId = ctx.callbackQuery.message.message_id;

		// Get user permissions
		const canEdit = hasPermission(userId, 'edit');
		const canDelete = hasPermission(userId, 'delete');
		const permissions = { canEdit, canDelete };

		const safeAnswer = async (text) => {
			try {
				await ctx.answerCallbackQuery(text);
			} catch (e) {
				// Ignore timeout errors
			}
		};

		// Handle pagination
		if (data.startsWith('queue_')) {
			const page = parseInt(data.replace('queue_', ''));
			const { posts } = await getAllPostsByChat(chatId);
			const post = posts[page];
			const totalPosts = posts.length;
			const videoTitle = post?.title?.slice(0, 30) || 'N/A';
			const videoStatus = post?.status === 'posted' ? 'Đã đăng' : 'Chờ đăng';
			await sendQueuePage(ctx, chatId, page, messageId, permissions);
			await logAction(
				userId,
				'navigate_video',
				post?.id || null,
				`Trang ${page + 1}/${totalPosts} | ${videoStatus} | "${videoTitle}..."`
			);
			console.log(
				`[Queue] User ${userId} nav to p${page} | Post: ${post?.id} | FileID: ${
					post?.telegramFileId || 'null'
				} | Path: ${post?.videoPath} | ${videoStatus}`
			);
			await safeAnswer();
			return;
		}

		// Handle audit pagination (for /info command)
		if (data.startsWith('audit_')) {
			const parts = data.split('_');
			const page = parseInt(parts[1]) || 0;
			const role = parts[2] || 'user';
			const { summary, hasMore, totalPages } = await getUserActivitySummary(
				userId,
				role,
				page
			);

			// Build navigation keyboard
			const keyboard = new InlineKeyboard();
			if (page > 0) {
				keyboard.text('◀️ Trước', `audit_${page - 1}_${role}`);
			}
			if (hasMore) {
				keyboard.text('Sau ▶️', `audit_${page + 1}_${role}`);
			}

			await ctx.editMessageText(summary, {
				parse_mode: 'HTML',
				reply_markup: keyboard,
			});
			await logAction(
				userId,
				'view_audit',
				null,
				`Trang ${page + 1}/${totalPages}`
			);
			await safeAnswer();
			return;
		}

		// Handle analytics user list pagination (Admin only)
		if (data.startsWith('analytics_list_') && isAdmin(userId)) {
			const page = parseInt(data.replace('analytics_list_', '')) || 0;
			const summary = await getAnalyticsSummary();
			const { users, total, totalPages } = await getUsersWithViewCounts(page);

			let message = `📊 <b>ANALYTICS - TỔNG QUAN</b>\n\n`;
			message += `👥 Tổng người dùng: ${summary.totalUsers}\n`;
			message += `👁️ Tổng lượt xem: ${summary.totalViews}\n`;
			message += `🟢 Hoạt động hôm nay: ${summary.activeToday}\n\n`;

			message += `<b>DANH SÁCH USER (Trang ${page + 1}/${totalPages}):</b>\n`;
			message += `────────────────────\n`;

			users.forEach((u, i) => {
				const name = u.firstName + (u.lastName ? ` ${u.lastName}` : '');
				const username = u.username ? `@${u.username}` : '';
				const lastView = u.lastViewAt
					? formatTimeAgoShort(u.lastViewAt)
					: 'Chưa xem';
				message += `${page * 10 + i + 1}. <b>${name}</b> ${username}\n`;
				message += `   🆔 <code>${u.telegramId}</code> | ${u.role}\n`;
				message += `   👁️ ${u.viewCount} lượt | ⏰ ${lastView}\n\n`;
			});

			message += `\n💡 <i>Dùng /analytics [ID] để xem chi tiết</i>`;

			const keyboard = new InlineKeyboard();
			if (page > 0) {
				keyboard.text('◀️ Trước', `analytics_list_${page - 1}`);
			}
			if (page < totalPages - 1) {
				keyboard.text('Trang sau ▶️', `analytics_list_${page + 1}`);
			}

			await ctx.editMessageText(message, {
				parse_mode: 'HTML',
				reply_markup: keyboard,
			});
			await safeAnswer();
			return;
		}

		// Handle analytics user detail pagination (Admin only)
		if (data.startsWith('analytics_user_') && isAdmin(userId)) {
			const parts = data.split('_');
			const targetUserId = parts[2];
			const page = parseInt(parts[3]) || 0;

			const { views, total, totalPages, user } = await getUserViewHistory(
				targetUserId,
				page
			);

			if (!user) {
				await safeAnswer('User không tồn tại');
				return;
			}

			let message = `📊 <b>LỊCH SỬ XEM VIDEO</b>\n\n`;
			message += `👤 <b>${user.firstName}</b> (@${user.username || 'N/A'})\n`;
			message += `🆔 ID: <code>${user.telegramId}</code>\n`;
			message += `🏷️ Role: ${user.role}\n`;
			message += `📺 Tổng lượt xem: ${total}\n\n`;

			if (views.length > 0) {
				message += `<b>Chi tiết (Trang ${page + 1}/${totalPages}):</b>\n`;
				views.forEach((v, i) => {
					const time = formatTimeAgoShort(v.createdAt);
					message += `${page * 10 + i + 1}. ${
						v.details || '(không có chi tiết)'
					} - ${time}\n`;
				});
			}

			const keyboard = new InlineKeyboard();
			if (page > 0) {
				keyboard.text('◀️ Trước', `analytics_user_${targetUserId}_${page - 1}`);
			}
			if (page < totalPages - 1) {
				keyboard.text(
					'Trang sau ▶️',
					`analytics_user_${targetUserId}_${page + 1}`
				);
			}

			await ctx.editMessageText(message, {
				parse_mode: 'HTML',
				reply_markup: keyboard,
			});
			await safeAnswer();
			return;
		}

		// Handle delete confirmation request (need delete permission)
		if (data.startsWith('delask_') && canDelete) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;

			// Show confirmation buttons
			const confirmKeyboard = new InlineKeyboard()
				.text('⚠️ Xác nhận XÓA', `delyes_${postId}_${currentPage}`)
				.text('❌ Hủy', `delno_${postId}_${currentPage}`);

			await safeAnswer('Bạn có chắc muốn xóa video này?');
			await logAction(userId, 'delete_ask', postId, `Page ${currentPage + 1}`);

			// Use safeEditMessage instead of delete+reply
			await safeEditMessage(
				ctx,
				'⚠️ **XÁC NHẬN XÓA VIDEO?**\n\nVideo sẽ bị xóa vĩnh viễn khỏi hệ thống và ổ cứng!',
				confirmKeyboard
			);
			return;
		}

		// Handle delete confirmed (need delete permission)
		// Now marks as cancelled instead of truly deleting
		if (data.startsWith('delyes_') && canDelete) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;

			// Get the post first
			const post = await prisma.scheduledPost.findUnique({
				where: { id: postId },
			});
			if (!post) {
				await safeAnswer('Lỗi: Không tìm thấy video');
				return;
			}

			// If already cancelled, truly delete; otherwise just cancel
			if (post.status === 'cancelled') {
				const result = await deleteScheduledPost(postId, chatId);
				await safeAnswer(
					`Đã xóa vĩnh viễn! Reschedule ${result.rescheduled} video`
				);
				await logAction(userId, 'delete_video_permanent', postId);
			} else {
				// Mark as cancelled (soft delete) and reschedule
				await updatePostStatus(postId, 'cancelled');
				await safeAnswer('Đã huỷ đăng video! Reschedule xong.');
				await logAction(userId, 'cancel_video', postId);

				// Reschedule if was pending
				if (post.status === 'pending') {
					await rescheduleTimesOnly(post.chatId);
				}
			}

			const newPage = Math.max(0, currentPage - 1);
			await sendQueuePage(ctx, chatId, newPage, messageId, permissions);
			return;
		}

		// Handle delete cancelled (need delete permission)
		if (data.startsWith('delno_') && canDelete) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;

			await safeAnswer('Đã hủy xóa');
			await logAction(userId, 'delete_cancel', postId);

			// Return to queue view (restore video/caption)
			// Pass messageId to reuse the bubble
			await sendQueuePage(ctx, chatId, currentPage, messageId, permissions);
			return;
		}

		// Handle regenerate content - show category selection (need edit permission)
		if (data.startsWith('regen_') && canEdit) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;
			const selectionKey = `${chatId}_${postId}`;

			// Initialize or get existing selections
			if (!categorySelections.has(selectionKey)) {
				categorySelections.set(selectionKey, {});
			}

			const selections = categorySelections.get(selectionKey);
			const keyboard = buildCategoryKeyboard(postId, currentPage, selections);

			await logAction(userId, 'edit_start', postId, `Page ${currentPage + 1}`);

			// Use safeEditMessage
			await safeEditMessage(
				ctx,
				'📝 **CHỌN CATEGORY ĐỂ TẠO NỘI DUNG**\n\n' +
					'Chọn các category phù hợp với video:\n' +
					'✅ = đã chọn\n\n' +
					'Bấm **Xong** khi đã chọn đủ, hoặc **Random** để tạo ngẫu nhiên.',
				keyboard
			);
			await safeAnswer();
			return;
		}

		// Handle category selection - show options (need edit permission)
		if (data.startsWith('cat_') && canEdit) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;
			const categoryIndex = parseInt(parts[3]);

			const categoryKey = getCategoryKeyByIndex(categoryIndex);
			if (!categoryKey) {
				await safeAnswer('Lỗi: Category không tồn tại');
				return;
			}

			const catName = getCategoryName(categoryKey);
			const selections = categorySelections.get(`${chatId}_${postId}`) || {};
			const selectedOpts = selections[categoryKey] || [];
			const keyboard = buildOptionsKeyboard(
				postId,
				currentPage,
				categoryKey,
				selectedOpts
			);

			await logAction(userId, 'select_category', postId, catName);

			await safeEditMessage(
				ctx,
				`📝 Chọn **${catName}** (bấm lại để bỏ chọn):`,
				keyboard
			);
			await safeAnswer();
			return;
		}

		// Handle option selection - save and return to categories (need edit permission)
		if (data.startsWith('opt_') && canEdit) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;
			const categoryIndex = parseInt(parts[3]);
			const optionIndex = parseInt(parts[4]);

			const categoryKey = getCategoryKeyByIndex(categoryIndex);
			const optionKey = getOptionKeyByIndex(categoryKey, optionIndex);

			if (!categoryKey || !optionKey) {
				await safeAnswer('Lỗi: Option không tồn tại');
				return;
			}

			const selectionKey = `${chatId}_${postId}`;

			// Initialize or get existing selections
			if (!categorySelections.has(selectionKey)) {
				categorySelections.set(selectionKey, {});
			}
			const selections = categorySelections.get(selectionKey);

			// Initialize category array if needed
			if (!selections[categoryKey]) {
				selections[categoryKey] = [];
			}

			// Toggle selection
			const idx = selections[categoryKey].indexOf(optionKey);
			if (idx >= 0) {
				// Remove if exists
				selections[categoryKey].splice(idx, 1);
			} else {
				// Add if not exists
				selections[categoryKey].push(optionKey);
			}

			const optLabel = getOptionLabel(categoryKey, optionKey);
			const catName = getCategoryName(categoryKey);

			await logAction(
				userId,
				'toggle_option',
				postId,
				`${catName}: ${optLabel} (${idx >= 0 ? 'off' : 'on'})`
			);

			// Stay on options screen with updated checkmarks
			const keyboard = buildOptionsKeyboard(
				postId,
				currentPage,
				categoryKey,
				selections[categoryKey]
			);
			await safeEditMessage(
				ctx,
				`📝 Chọn **${catName}** (bấm lại để bỏ chọn):`,
				keyboard
			);
			await safeAnswer(
				idx >= 0 ? `Bỏ chọn: ${optLabel}` : `Đã chọn: ${optLabel}`
			);
			return;
		}

		// Handle back to categories (need edit permission)
		if (data.startsWith('back_') && canEdit) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;
			const selectionKey = `${chatId}_${postId}`;

			const selections = categorySelections.get(selectionKey) || {};
			const keyboard = buildCategoryKeyboard(postId, currentPage, selections);
			const selectionsText = formatSelectionsDisplay(selections);

			await safeEditMessage(
				ctx,
				'📝 **CHỌN CATEGORY ĐỂ TẠO NỘI DUNG**\n\n' +
					selectionsText +
					'\n\n' +
					'Tiếp tục chọn hoặc bấm **Xong** để tạo nội dung.',
				keyboard
			);
			await safeAnswer();
			return;
		}

		// Handle done - generate content options for selection (need edit permission)
		if (data.startsWith('done_') && canEdit) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;
			const optionPage = parseInt(parts[3]) || 0; // Track which set of 5 we're showing
			const selectionKey = `${chatId}_${postId}`;

			const selections = categorySelections.get(selectionKey) || {};

			// Generate 5 options per page
			const optionCount = 5;
			let options;
			if (Object.keys(selections).length > 0) {
				options = generateContentFromCategories(selections, optionCount);
			} else {
				options = generateContentOptions(optionCount);
			}

			// Save generated options for selection
			generatedOptions.set(selectionKey, options);

			// Build message text with title AND hashtags
			let messageText = `📝 **CHỌN NỘI DUNG ƯNG Ý NHẤT** (Trang ${
				optionPage + 1
			})\n\n`;
			options.forEach((opt, index) => {
				messageText += `${index + 1}. **${opt.title}**\n`;
				messageText += `   _${opt.hashtags}_\n\n`;
			});
			messageText +=
				'👇 Bấm số để chọn, hoặc **Xem thêm** để tạo 5 options mới:';

			// Build selection keyboard (based on actual options count)
			const keyboard = new InlineKeyboard();
			const actualCount = options.length;
			for (let i = 0; i < actualCount; i++) {
				keyboard.text(`${i + 1}`, `choose_${postId}_${currentPage}_${i}`);
				// 3 buttons per row
				if ((i + 1) % 3 === 0) keyboard.row();
			}

			// Navigation buttons
			keyboard.row();
			keyboard.text('⬅️', `back_${postId}_${currentPage}`);
			keyboard.text(
				'Xem thêm',
				`done_${postId}_${currentPage}_${optionPage + 1}`
			);
			keyboard.text('❌ Hủy', `cancel_${postId}_${currentPage}`);

			// Edit message (caption safely)
			await safeEditMessage(ctx, messageText, keyboard);

			await logAction(
				userId,
				'generate_options',
				postId,
				`Page ${optionPage + 1}`
			);
			await safeAnswer();
			return;
		}

		// Handle option choice (need edit permission)
		if (
			data.startsWith('choose_') &&
			!data.startsWith('choose_random_') &&
			canEdit
		) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;
			const choiceIndex = parseInt(parts[3]);
			const selectionKey = `${chatId}_${postId}`;

			const options = generatedOptions.get(selectionKey);
			if (!options || !options[choiceIndex]) {
				await safeAnswer('Lỗi: Option không tồn tại hoặc hết hạn');
				return;
			}

			const content = options[choiceIndex];

			// Update post in database using Prisma
			await prisma.scheduledPost.update({
				where: { id: postId },
				data: {
					title: content.title,
					hashtags: content.hashtags,
				},
			});

			// Cleanup
			categorySelections.delete(selectionKey);
			generatedOptions.delete(selectionKey);

			await safeAnswer(`Đã chọn: "${content.title.slice(0, 20)}..."`);
			await logAction(
				userId,
				'edit_content',
				postId,
				content.title.slice(0, 50)
			);
			await sendQueuePage(ctx, chatId, currentPage, messageId, permissions);
			return;
		}

		// Handle choose random (failed to load options or want fresh random)
		if (data.startsWith('choose_random_') && canEdit) {
			const parts = data.split('_');
			const postId = parts[2];
			const currentPage = parseInt(parts[3]) || 0;
			const selectionKey = `${chatId}_${postId}`;

			// Generate random content
			const result = await updatePostContent(postId);

			// Cleanup
			categorySelections.delete(selectionKey);
			generatedOptions.delete(selectionKey);

			if (result.success) {
				await safeAnswer(`Random: "${result.title.slice(0, 20)}..."`);
				await logAction(
					userId,
					'choose_random',
					postId,
					result.title.slice(0, 50)
				);
			} else {
				await safeAnswer('Lỗi: Không tìm thấy video');
			}
			// Reuse message bubble with messageId
			await sendQueuePage(ctx, chatId, currentPage, messageId, permissions);
			return;
		}

		// Handle random - generate random content (need edit permission)
		if (data.startsWith('rand_') && canEdit) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;
			const selectionKey = `${chatId}_${postId}`;

			// Generate random content
			const result = await updatePostContent(postId);

			// Cleanup
			categorySelections.delete(selectionKey);

			if (result.success) {
				await safeAnswer(`Random: "${result.title.slice(0, 20)}..."`);
				await logAction(
					userId,
					'random_content',
					postId,
					result.title.slice(0, 50)
				);
			} else {
				await safeAnswer('Lỗi: Không tìm thấy video');
			}
			// Reuse message bubble with messageId
			await sendQueuePage(ctx, chatId, currentPage, messageId, permissions);
			return;
		}

		// Handle cancel - abort category selection (need edit permission)
		if (data.startsWith('cancel_') && canEdit) {
			const parts = data.split('_');
			const postId = parts[1];
			const currentPage = parseInt(parts[2]) || 0;
			const selectionKey = `${chatId}_${postId}`;

			// Cleanup
			categorySelections.delete(selectionKey);

			// Handle cancel - restore viewing state
			// Just call sendQueuePage will restore full view.
			// Since we act on the same message, we can just "go back".

			await safeAnswer('Đã hủy');
			await logAction(userId, 'edit_cancel', postId);
			await sendQueuePage(ctx, chatId, currentPage, messageId, permissions);
			return;
		}

		// Handle posted confirmation (from scheduler notification) - ADMIN ONLY
		if (data.startsWith('posted_')) {
			// Only admin can confirm posted
			if (!isAdmin(userId)) {
				await safeAnswer('❌ Chỉ Admin mới được xác nhận đã đăng!');
				await logAction(
					userId,
					'confirm_posted_denied',
					data.replace('posted_', '')
				);
				return;
			}

			const postId = data.replace('posted_', '');

			await updatePostStatus(postId, 'posted');
			await logAction(userId, 'confirm_posted', postId);

			// Delete the message after confirmation
			try {
				await ctx.api.deleteMessage(chatId, messageId);
			} catch (e) {
				// Ignore if can't delete
			}

			await safeAnswer('✅ Đã đánh dấu đã đăng!');
			return;
		}

		// Handle cancel post (from scheduler notification or /check) - ADMIN ONLY
		if (data.startsWith('cancelpost_')) {
			// Only admin can cancel post
			if (!isAdmin(userId)) {
				await safeAnswer('❌ Chỉ Admin mới được huỷ đăng!');
				await logAction(
					userId,
					'cancel_post_denied',
					data.replace('cancelpost_', '')
				);
				return;
			}

			const postId = data.replace('cancelpost_', '');

			await updatePostStatus(postId, 'cancelled');
			await logAction(userId, 'cancel_post', postId);

			// Delete the message after cancellation
			try {
				await ctx.api.deleteMessage(chatId, messageId);
			} catch (e) {
				// Ignore if can't delete
			}

			await safeAnswer('❌ Đã huỷ đăng video này!');
			return;
		}

		// Handle clip confirm - save clipped video
		if (data.startsWith('clipconfirm_')) {
			const postId = data.replace('clipconfirm_', '');
			const clipKey = `clip_${chatId}_${postId}`;
			const clipInfo = pendingClips.get(clipKey);

			if (!clipInfo) {
				await safeAnswer('❌ Không tìm thấy thông tin clip!');
				return;
			}

			try {
				// Get file_id from the preview message
				const videoMessage = ctx.callbackQuery.message;
				const newFileId = videoMessage.video?.file_id;

				if (!newFileId) {
					await safeAnswer('❌ Không lấy được file_id từ video!');
					return;
				}

				// Upload clipped video to R2
				if (isS3Enabled()) {
					const uploaded = await s3UploadVideo(
						clipInfo.tempOutputPath,
						clipInfo.newVideoPath
					);
					if (!uploaded) {
						await safeAnswer('❌ Upload R2 thất bại!');
						return;
					}

					// Delete old video from R2
					await s3DeleteVideo(clipInfo.originalVideoPath);
					console.log(
						`[Clip] Deleted old R2 video: ${clipInfo.originalVideoPath}`
					);
				}

				// Update database record
				await updatePostVideo(postId, clipInfo.newVideoPath, newFileId);

				// Cleanup temp file
				cleanupTempFile(clipInfo.tempOutputPath);

				// Remove from pending
				pendingClips.delete(clipKey);

				await logAction(
					userId,
					'clip_confirm',
					postId,
					`New video: ${clipInfo.newVideoPath}`
				);

				// Edit message to show success
				try {
					await ctx.editMessageCaption({
						caption: '✅ Đã lưu video đã cắt thành công!',
					});
				} catch {
					/* ignore */
				}

				await safeAnswer('✅ Đã lưu video!');
			} catch (error) {
				console.error('[Clip] Confirm error:', error);
				await safeAnswer(`❌ Lỗi: ${error.message.slice(0, 50)}`);
			}
			return;
		}

		// Handle clip cancel - cleanup temp files
		if (data.startsWith('clipcancel_')) {
			const postId = data.replace('clipcancel_', '');
			const clipKey = `clip_${chatId}_${postId}`;
			const clipInfo = pendingClips.get(clipKey);

			if (clipInfo) {
				// Cleanup temp file
				cleanupTempFile(clipInfo.tempOutputPath);
				pendingClips.delete(clipKey);
			}

			await logAction(userId, 'clip_cancel', postId);

			// Delete the preview message
			try {
				await ctx.api.deleteMessage(chatId, messageId);
			} catch {
				/* ignore */
			}

			await safeAnswer('❌ Đã huỷ clip video!');
			return;
		}

		await safeAnswer();
	});

	// Handle commands
	bot.on('message:text', async (ctx) => {
		const text = ctx.message.text.trim();
		if (text.startsWith('/')) {
			await handleCommand(ctx, text);
		}
	});
}

/**
 * Build greeting message based on user role
 * @param {Object} ctx - Telegram context
 * @param {string} userRole - User role
 * @param {string} tiktokLink - TikTok follow link
 * @returns {string} Greeting message
 */
async function buildGreetingMessage(
	ctx,
	userRole,
	tiktokLink,
	linkLabel,
	fullLink
) {
	const firstName = ctx.from?.first_name || 'bạn';
	const userId = ctx.from?.id;
	const roleDisplayName = getRoleDisplayName(userRole);

	let greeting = `👋 Xin chào **${firstName}**!\n\n`;
	greeting += `🆔 ID của bạn: \`${userId}\`\n`;
	greeting += `🏷️ Vai trò: ${roleDisplayName}\n\n`;

	// Commands section based on role
	greeting += `📋 **LỆNH KHẢ DỤNG:**\n`;

	// Public commands (all roles)
	greeting += `• /start - Hiển thị thông tin này\n`;
	greeting += `• /queue - Xem lịch đăng video\n`;
	greeting += `• /videos - Xem chi tiết video\n`;
	greeting += `• /info - Xem hoạt động của bạn\n`;

	// Mod commands
	if (userRole === 'mod' || userRole === 'admin') {
		greeting += `\n📤 **Mod:**\n`;
		greeting += `• Forward video → Tự động lên lịch đăng\n`;
		greeting += `• /check - Kiểm tra video sắp đăng\n`;
		greeting += `• /clip [trang] [giây-giây] - Cắt bỏ đoạn video\n`;
	}

	// Reviewer commands
	if (userRole === 'reviewer' || userRole === 'admin') {
		greeting += `\n📝 **Kiểm duyệt viên:**\n`;
		greeting += `• /reschedule - Sắp xếp lại lịch đăng\n`;
		greeting += `• /swap [trang1] [trang2] - Đổi lịch 2 video\n`;
		greeting += `• Trong /videos: Sửa nội dung video\n`;
	}

	// Admin commands
	if (userRole === 'admin') {
		greeting += `\n👑 **Admin:**\n`;
		greeting += `• /analytics - Xem thống kê người dùng\n`;
		greeting += `• /fix - Dọn dẹp database\n`;
		greeting += `• /check - Kiểm tra video sắp đăng\n`;
		greeting += `• Trong /videos: Xoá video\n`;
	}

	// Usage guide
	greeting += `\n📖 **HƯỚNG DẪN:**\n`;

	if (userRole === 'mod' || userRole === 'admin') {
		greeting += `1️⃣ Forward video vào bot → Video tự động lên lịch\n`;
		greeting += `2️⃣ Bot đăng theo lịch "Private Wave" (Lunch & Late Night)\n`;
		greeting += `3️⃣ Khi đến giờ → Bot gửi thông báo + video + caption\n`;
		greeting += `4️⃣ Copy caption → Đăng lên TikTok\n`;
	} else if (userRole === 'reviewer') {
		greeting += `1️⃣ Dùng /videos để xem danh sách video\n`;
		greeting += `2️⃣ Bấm "Đổi nội dung" để sửa title\n`;
		greeting += `3️⃣ Dùng /reschedule để đặt lại lịch\n`;
	} else {
		greeting += `1️⃣ Dùng /queue để xem lịch đăng\n`;
		greeting += `2️⃣ Dùng /videos [trang] để xem chi tiết video (VD: /videos 5)\n`;
	}

	// Create keyboard for greeting
	const keyboard = new InlineKeyboard();
	if (fullLink.startsWith('https')) {
		keyboard.webApp(linkLabel, fullLink);
	}

	await ctx.reply(greeting + tiktokLink, {
		parse_mode: 'Markdown',
		reply_markup: keyboard,
	});
	return; // Stop here as we sent the message manually
}

/**
 * Handle commands - permissions based on role
 */
async function handleCommand(ctx, command) {
	const chatId = ctx.chat.id;
	const userId = ctx.from?.id;
	const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME || '';
	const BASE_URL = process.env.BASE_URL || 'http://localhost:8888';
	// Get user permissions
	const userRole = getUserRole(userId);
	const canEdit = hasPermission(userId, 'edit');
	const canDelete = hasPermission(userId, 'delete');
	const canReschedule = hasPermission(userId, 'reschedule');
	const canFix = hasPermission(userId, 'fix');
	const canUpload = hasPermission(userId, 'upload');
	const permissions = { canEdit, canDelete };

	// Determine role-based link
	const isPrivileged = ['admin', 'mod', 'reviewer'].includes(userRole);
	const linkLabel = isPrivileged ? '🎬 Quản lý Video' : '📺 Xem Video';
	const linkPath = isPrivileged ? '/admin' : '/';
	const fullLink = `${BASE_URL}${linkPath}`;

	const tiktokLink = TIKTOK_USERNAME
		? `\n\n🔥 Follow TikTok: https://tiktok.com/@${TIKTOK_USERNAME}`
		: '';

	setDefaultChatId(chatId);

	// ========== /start - Show greeting ==========
	if (command === '/start') {
		// Track user information
		try {
			const userInfo = {
				telegramId: userId,
				username: ctx.from?.username,
				firstName: ctx.from?.first_name || 'Unknown',
				lastName: ctx.from?.last_name,
				role: userRole,
			};

			await createOrUpdateUser(userInfo);
			const roleDisplayName = getRoleDisplayName(userRole);
			console.log(
				`[User] ${roleDisplayName} tracked: ${userInfo.firstName} (@${
					userInfo.username || 'no_username'
				}) - ID: ${userId}`
			);
		} catch (error) {
			console.error('[User] Failed to track user:', error.message);
		}

		await buildGreetingMessage(ctx, userRole, tiktokLink, linkLabel, fullLink);
		await logAction(userId, 'start');
		return;
	}

	// ========== /info - View activity summary ==========
	if (command === '/info') {
		const { summary, hasMore, totalPages } = await getUserActivitySummary(
			userId,
			userRole,
			0
		);

		// Build keyboard with pagination if there are more pages
		// Always include miniapp button
		let keyboard = buildMiniappKeyboard(userId);
		if (hasMore) {
			keyboard = new InlineKeyboard()
				.text('Xem thêm ▶️', `audit_1_${userRole}`)
				.row()
				.webApp(
					['admin', 'mod', 'reviewer'].includes(userRole)
						? '🎬 Quản lý Video'
						: '📺 Xem Video',
					`${process.env.BASE_URL || 'http://localhost:8888'}${
						['admin', 'mod', 'reviewer'].includes(userRole) ? '/admin' : '/'
					}`
				);
		}

		await ctx.reply(summary + tiktokLink, {
			parse_mode: 'HTML',
			reply_markup: keyboard,
		});
		await logAction(userId, 'view_info');
		return;
	}

	// ========== /queue - View schedule list ==========
	if (command === '/queue') {
		const posts = await getPendingPostsByChat(chatId);
		if (!posts?.length) {
			await ctx.reply('Không có video nào trong lịch' + tiktokLink, {
				reply_markup: buildMiniappKeyboard(userId),
			});
			return;
		}

		// Format schedule list: title - date - time
		const scheduleList = posts
			.slice(0, 10)
			.map((post, i) => {
				const date = new Date(post.scheduledAt);
				const gmt7 = new Date(date.getTime() + 7 * 60 * 60 * 1000);
				const day = gmt7.getUTCDate().toString().padStart(2, '0');
				const month = (gmt7.getUTCMonth() + 1).toString().padStart(2, '0');
				const hours = gmt7.getUTCHours().toString().padStart(2, '0');
				const mins = gmt7.getUTCMinutes().toString().padStart(2, '0');
				const titleShort =
					post.title.slice(0, 25) + (post.title.length > 25 ? '...' : '');
				return `${i + 1}. ${titleShort} - ${day}/${month} ${hours}:${mins}`;
			})
			.join('\n');

		const moreText =
			posts.length > 30 ? `\n\n... và ${posts.length - 30} video khác` : '';
		await ctx.reply(
			`📅 LỊCH ĐĂNG (${posts.length} video):\n\n${scheduleList}${moreText}` +
				tiktokLink,
			{ reply_markup: buildMiniappKeyboard(userId) }
		);
		await logAction(userId, 'view_queue');
		return;
	}

	// ========== /videos - View video details ==========
	if (command.startsWith('/videos')) {
		const parts = command.split(' ');
		let page = -1;

		if (parts.length > 1) {
			const pageNum = parseInt(parts[1], 10);
			if (!isNaN(pageNum) && pageNum > 0) {
				page = pageNum - 1; // Convert 1-based to 0-based
			}
		}

		await sendQueuePage(ctx, chatId, page, null, permissions);
		await logAction(userId, 'view_videos', null, `Page ${page + 1}`);
		return;
	}

	// ========== /reschedule - Fix schedule times only (reviewer + admin) ==========
	if (command === '/reschedule') {
		if (!canReschedule) {
			await ctx.reply('Bạn không có quyền reschedule video.' + tiktokLink, {
				reply_markup: buildMiniappKeyboard(userId),
			});
			return;
		}
		await ctx.reply(
			'⏳ Đang sắp xếp lại lịch đăng... (chạy nền)' + tiktokLink,
			{
				reply_markup: buildMiniappKeyboard(userId),
			}
		);

		// Run in background to not block other users
		setImmediate(async () => {
			try {
				const count = await rescheduleTimesOnly(chatId);
				await ctx.reply(
					`✅ Đã sắp xếp lại lịch cho ${count} video!\n(Giữ nguyên nội dung, chỉ đổi giờ)` +
						tiktokLink,
					{ reply_markup: buildMiniappKeyboard(userId) }
				);
				await logAction(
					userId,
					'reschedule',
					null,
					`Rescheduled times for ${count} videos`
				);
			} catch (error) {
				console.error('[Reschedule] Error:', error);
				await ctx.reply('❌ Lỗi khi reschedule: ' + error.message);
			}
		});
		return;
	}

	// ========== /fix - Clean database (admin only) ==========
	if (command === '/fix') {
		if (!canFix) {
			await ctx.reply('Bạn không có quyền sử dụng lệnh này.' + tiktokLink, {
				reply_markup: buildMiniappKeyboard(userId),
			});
			return;
		}
		await ctx.reply(
			'🔧 Đang kiểm tra, dọn dẹp và cache dữ liệu... (chạy nền)' + tiktokLink,
			{ reply_markup: buildMiniappKeyboard(userId) }
		);

		// Run in background to not block other users
		setImmediate(async () => {
			try {
				const result = await cleanOrphanedPosts(chatId);
				if (result.deleted > 0 || result.created > 0 || result.cached > 0) {
					let message = '✅ Kết quả dọn dẹp:\n';
					if (result.deleted > 0) {
						message += `🗑️ Đã xóa ${result.deleted} record không có video.\n`;
					}
					if (result.created > 0) {
						message += `➕ Đã tạo ${result.created} record cho video thiếu.\n`;
					}
					if (result.cached > 0) {
						message += `💾 Đã cache ${result.cached} video từ S3.\n`;
					}
					message += `📅 Đã reschedule ${result.rescheduled} video.`;
					await ctx.reply(message + tiktokLink, {
						reply_markup: buildMiniappKeyboard(userId),
					});
				} else {
					await ctx.reply(
						'✅ Không có thay đổi. Database và cache đã đồng bộ!' + tiktokLink,
						{ reply_markup: buildMiniappKeyboard(userId) }
					);
				}
				await logAction(
					userId,
					'fix_database',
					null,
					`Deleted: ${result.deleted}, Rescheduled: ${result.rescheduled}`
				);
			} catch (error) {
				console.error('[Fix] Error:', error);
				await ctx.reply('❌ Lỗi khi fix database: ' + error.message);
			}
		});
		return;
	}

	// ========== /check - Check next scheduled post (Admin only) ==========
	if (command === '/check') {
		if (!isAdmin(userId)) {
			await ctx.reply('❌ Chỉ Admin mới được dùng lệnh này.');
			return;
		}

		const post = await getNextScheduledPost();
		if (!post) {
			await ctx.reply('✅ Không có video nào đang chờ đăng.');
			return;
		}

		try {
			// Prepare video source
			const videoKey = path.basename(post.videoPath);
			const localPath = path.join(DATA_DIR, 'videos', videoKey);
			let videoInput = null;
			let needsFileIdSave = false;

			if (post.telegramFileId) {
				videoInput = post.telegramFileId;
			} else if (fs.existsSync(localPath)) {
				videoInput = new InputFile(localPath);
				needsFileIdSave = true;
			} else if (isS3Enabled()) {
				const cacheDir = path.join(DATA_DIR, 'videos');
				const videoBuffer = await s3DownloadVideo(videoKey, cacheDir);
				if (videoBuffer) {
					videoInput = new InputFile(videoBuffer, videoKey);
					needsFileIdSave = true;
				}
			}

			if (!videoInput) {
				await ctx.reply('❌ Lỗi: Không tìm thấy file video (Local/S3).');
				return;
			}

			// Format exact caption logic from scheduler.js
			// const repostLabel = post.isRepost ? ' [REPOST]' : ''; // Logic from scheduler
			// const tiktokCaption = `${post.title}\n\n${post.hashtags}`;
			// caption: `${repostLabel}\n\n${tiktokCaption}`

			// Calculate index and formatted time
			const { posts } = await getAllPostsByChat(chatId);
			const currentIndex = posts.findIndex((p) => p.id === post.id);
			const totalPosts = posts.length;
			const timeStr = formatVietnameseTime(new Date(post.scheduledAt));

			const repostLabel = post.isRepost ? ' [REPOST]' : '';
			const tiktokCaption = `${post.title}\n\n${post.hashtags}`;

			// New caption format with detailed info
			const finalCaption = `[${
				currentIndex + 1
			}/${totalPosts}] ⏳ Sắp đăng - ${timeStr}\n\n${repostLabel}${tiktokCaption}`;

			// Send with confirm button
			const keyboard = new InlineKeyboard()
				.text('✅ Duyệt đăng ngay', `posted_${post.id}`)
				.text('❌ Huỷ đăng', `cancelpost_${post.id}`);

			const sentMessage = await ctx.replyWithVideo(videoInput, {
				caption: finalCaption,
				reply_markup: keyboard,
				supports_streaming: true,
			});

			// Cache file_id if we uploaded fresh
			if (needsFileIdSave && sentMessage.video?.file_id) {
				await updatePostFileId(post.id, sentMessage.video.file_id);
			}

			await logAction(userId, 'check_next', post.id);
		} catch (error) {
			console.error('[Check] Error:', error);
			await ctx.reply(`❌ Lỗi khi tải video: ${error.message}`);
		}
		return;
	}

	// ========== /clip - Clip video by removing time ranges (Admin/Mod only) ==========
	if (command.startsWith('/clip')) {
		const isMod = getUserRole(userId) === 'mod';
		if (!isAdmin(userId) && !isMod) {
			await ctx.reply(
				'❌ Chỉ Admin hoặc Mod mới được dùng lệnh này.' + tiktokLink,
				{ reply_markup: buildMiniappKeyboard(userId) }
			);
			return;
		}

		// Parse: /clip 5 3-7 15-20
		const argsString = command.replace('/clip', '').trim();
		const parsed = parseClipArgs(argsString);

		if (!parsed) {
			await ctx.reply(
				'❌ Sai cú pháp. Dùng: /clip [trang] giây1-giây2 giây3-giây4 ...\n' +
					'Ví dụ: /clip 5 3-7 15-20 (cắt bỏ 3s-7s và 15s-20s từ video trang 5)' +
					tiktokLink,
				{ reply_markup: buildMiniappKeyboard(userId) }
			);
			return;
		}

		const { page, ranges } = parsed;

		// Get all posts
		const { posts } = await getAllPostsByChat(chatId);
		if (page >= posts.length) {
			await ctx.reply(
				`❌ Không tìm thấy video trang ${page + 1}. Tổng: ${
					posts.length
				} video.` + tiktokLink,
				{ reply_markup: buildMiniappKeyboard(userId) }
			);
			return;
		}

		const post = posts[page];
		if (!post) {
			await ctx.reply('❌ Không tìm thấy video.' + tiktokLink, {
				reply_markup: buildMiniappKeyboard(userId),
			});
			return;
		}

		await ctx.reply(
			`⏳ Đang xử lý clip video trang ${page + 1}...\nCắt bỏ: ${ranges
				.map((r) => `${r.start}s-${r.end}s`)
				.join(', ')}`
		);

		try {
			// Download video to temp
			const videoKey = path.basename(post.videoPath);
			const tempDir = path.join(os.tmpdir(), `clip_input_${Date.now()}`);
			fs.mkdirSync(tempDir, { recursive: true });
			const tempInputPath = path.join(tempDir, videoKey);

			// Get video from file_id, local, or S3
			let videoBuffer = null;

			if (post.telegramFileId) {
				// Download from Telegram using file_id
				try {
					const file = await ctx.api.getFile(post.telegramFileId);
					const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
					const response = await fetch(fileUrl);
					videoBuffer = Buffer.from(await response.arrayBuffer());
				} catch (e) {
					console.error('[Clip] Failed to download from Telegram:', e.message);
				}
			}

			if (!videoBuffer) {
				const localPath = path.join(DATA_DIR, 'videos', videoKey);
				if (fs.existsSync(localPath)) {
					videoBuffer = fs.readFileSync(localPath);
				} else if (isS3Enabled()) {
					videoBuffer = await s3DownloadVideo(videoKey);
				}
			}

			if (!videoBuffer) {
				await ctx.reply('❌ Không tìm thấy file video.' + tiktokLink, {
					reply_markup: buildMiniappKeyboard(userId),
				});
				return;
			}

			// Save to temp
			fs.writeFileSync(tempInputPath, videoBuffer);

			// Clip video
			const clipResult = await clipVideo(tempInputPath, ranges);

			// Cleanup input temp
			try {
				fs.unlinkSync(tempInputPath);
				fs.rmdirSync(tempDir);
			} catch {
				/* ignore */
			}

			if (!clipResult.success) {
				await ctx.reply(`❌ Lỗi clip: ${clipResult.error}` + tiktokLink, {
					reply_markup: buildMiniappKeyboard(userId),
				});
				return;
			}

			// Generate new video filename
			const newVideoPath = `${Date.now()}_clipped_${videoKey}`;

			// Send preview with confirm/cancel buttons
			const keyboard = new InlineKeyboard()
				.text('✅ Xác nhận', `clipconfirm_${post.id}`)
				.text('❌ Huỷ', `clipcancel_${post.id}`);

			const previewCaption =
				`✂️ XEM TRƯỚC VIDEO ĐÃ CẮT\n\n` +
				`📄 Trang: ${page + 1}\n` +
				`🗑️ Đã cắt bỏ: ${ranges
					.map((r) => `${r.start}s-${r.end}s`)
					.join(', ')}\n\n` +
				`Bấm ✅ để lưu video mới, hoặc ❌ để huỷ.`;

			const sentMessage = await ctx.replyWithVideo(
				new InputFile(clipResult.outputPath),
				{
					caption: previewCaption,
					reply_markup: keyboard,
					supports_streaming: true,
				}
			);

			// Store pending clip info
			const clipKey = `clip_${chatId}_${post.id}`;
			pendingClips.set(clipKey, {
				postId: post.id,
				originalVideoPath: videoKey,
				tempOutputPath: clipResult.outputPath,
				previewMessageId: sentMessage.message_id,
				newVideoPath: newVideoPath,
			});

			await logAction(
				userId,
				'clip_start',
				post.id,
				`Ranges: ${ranges.map((r) => `${r.start}-${r.end}`).join(', ')}`
			);
		} catch (error) {
			console.error('[Clip] Error:', error);
			await ctx.reply(`❌ Lỗi: ${error.message}` + tiktokLink, {
				reply_markup: buildMiniappKeyboard(userId),
			});
		}
		return;
	}

	// ========== /swap - Swap scheduled times of two videos (Admin/Reviewer) ==========
	if (command.startsWith('/swap')) {
		if (!canReschedule) {
			await ctx.reply('❌ Bạn không có quyền đổi lịch video.' + tiktokLink, {
				reply_markup: buildMiniappKeyboard(userId),
			});
			return;
		}

		const args = command.replace('/swap', '').trim();
		const parts = args.split(/\s+/);

		if (parts.length !== 2) {
			await ctx.reply(
				'❌ Sai cú pháp. Dùng: /swap [trang1] [trang2]\nVí dụ: /swap 5 10' +
					tiktokLink,
				{ reply_markup: buildMiniappKeyboard(userId) }
			);
			return;
		}

		const page1 = parseInt(parts[0], 10);
		const page2 = parseInt(parts[1], 10);

		if (isNaN(page1) || isNaN(page2) || page1 < 1 || page2 < 1) {
			await ctx.reply('❌ Số trang không hợp lệ.' + tiktokLink, {
				reply_markup: buildMiniappKeyboard(userId),
			});
			return;
		}

		if (page1 === page2) {
			await ctx.reply('❌ Hai trang phải khác nhau.' + tiktokLink, {
				reply_markup: buildMiniappKeyboard(userId),
			});
			return;
		}

		// Get all posts sorted by schedule time
		const { posts } = await getAllPostsByChat(chatId);

		if (page1 > posts.length || page2 > posts.length) {
			await ctx.reply(
				`❌ Không tìm thấy video. Tổng: ${posts.length} video.` + tiktokLink,
				{ reply_markup: buildMiniappKeyboard(userId) }
			);
			return;
		}

		const post1 = posts[page1 - 1];
		const post2 = posts[page2 - 1];

		// Swap scheduled times
		const temp = post1.scheduledAt;

		await prisma.scheduledPost.update({
			where: { id: post1.id },
			data: {
				scheduledAt: new Date(post2.scheduledAt),
				...(post1.status === 'pending' && { notificationSent: false }),
			},
		});

		await prisma.scheduledPost.update({
			where: { id: post2.id },
			data: {
				scheduledAt: new Date(temp),
				...(post2.status === 'pending' && { notificationSent: false }),
			},
		});

		await ctx.reply(
			`✅ Đã đổi lịch:\n` +
				`📍 Trang ${page1}: "${post1.title.slice(0, 25)}..."\n` +
				`📍 Trang ${page2}: "${post2.title.slice(0, 25)}..."` +
				tiktokLink,
			{ reply_markup: buildMiniappKeyboard(userId) }
		);

		await logAction(
			userId,
			'swap_videos',
			null,
			`Swapped page ${page1} with page ${page2}`
		);
		return;
	}

	// ========== /analytics - View user analytics (Admin only) ==========
	if (command.startsWith('/analytics')) {
		if (!isAdmin(userId)) {
			await ctx.reply('❌ Chỉ Admin mới được dùng lệnh này.' + tiktokLink, {
				reply_markup: buildMiniappKeyboard(userId),
			});
			return;
		}

		const args = command.replace('/analytics', '').trim();

		// If telegram ID provided, show user's detailed view history
		if (args && /^\d+$/.test(args)) {
			const targetUserId = args;
			const { views, total, totalPages, user } = await getUserViewHistory(
				targetUserId,
				0
			);

			if (!user) {
				await ctx.reply(`❌ Không tìm thấy user với ID: ${targetUserId}`);
				return;
			}

			let message = `📊 <b>LỊCH SỬ XEM VIDEO</b>\n\n`;
			message += `👤 <b>${user.firstName}</b> (@${user.username || 'N/A'})\n`;
			message += `🆔 ID: <code>${user.telegramId}</code>\n`;
			message += `🏷️ Role: ${user.role}\n`;
			message += `📺 Tổng lượt xem: ${total}\n\n`;

			if (views.length > 0) {
				message += `<b>Chi tiết (Trang 1/${totalPages}):</b>\n`;
				views.forEach((v, i) => {
					const time = formatTimeAgoShort(v.createdAt);
					message += `${i + 1}. ${
						v.details || '(không có chi tiết)'
					} - ${time}\n`;
				});
			} else {
				message += `<i>Chưa xem video nào.</i>`;
			}

			let keyboard = null;
			if (totalPages > 1) {
				keyboard = new InlineKeyboard().text(
					'Trang sau ▶️',
					`analytics_user_${targetUserId}_1`
				);
			}

			await ctx.reply(message, {
				parse_mode: 'HTML',
				reply_markup: keyboard,
			});
			await logAction(userId, 'view_analytics', targetUserId);
			return;
		}

		// No ID - show user list with view counts
		const summary = await getAnalyticsSummary();
		const { users, total, totalPages } = await getUsersWithViewCounts(0);

		let message = `📊 <b>ANALYTICS - TỔNG QUAN</b>\n\n`;
		message += `👥 Tổng người dùng: ${summary.totalUsers}\n`;
		message += `👁️ Tổng lượt xem: ${summary.totalViews}\n`;
		message += `🟢 Hoạt động hôm nay: ${summary.activeToday}\n\n`;

		message += `<b>DANH SÁCH USER (Trang 1/${totalPages}):</b>\n`;
		message += `────────────────────\n`;

		users.forEach((u, i) => {
			const name = u.firstName + (u.lastName ? ` ${u.lastName}` : '');
			const username = u.username ? `@${u.username}` : '';
			const lastView = u.lastViewAt
				? formatTimeAgoShort(u.lastViewAt)
				: 'Chưa xem';
			message += `${i + 1}. <b>${name}</b> ${username}\n`;
			message += `   🆔 <code>${u.telegramId}</code> | ${u.role}\n`;
			message += `   👁️ ${u.viewCount} lượt | ⏰ ${lastView}\n\n`;
		});

		if (users.length === 0) {
			message += `<i>Chưa có user nào.</i>\n`;
		}

		message += `\n💡 <i>Dùng /analytics [ID] để xem chi tiết</i>`;

		let keyboard = null;
		if (totalPages > 1) {
			keyboard = new InlineKeyboard().text('Trang sau ▶️', `analytics_list_1`);
		}

		await ctx.reply(message, {
			parse_mode: 'HTML',
			reply_markup: keyboard,
		});
		await logAction(userId, 'view_analytics_list');
		return;
	}
}

/**
 * Format time ago (short version for analytics)
 */
function formatTimeAgoShort(date) {
	const d = new Date(date);
	const now = new Date();
	const diffMs = now - d;
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return 'vừa xong';
	if (diffMins < 60) return `${diffMins}p`;
	if (diffHours < 24) return `${diffHours}h`;
	if (diffDays < 7) return `${diffDays}d`;

	const day = d.getDate().toString().padStart(2, '0');
	const month = (d.getMonth() + 1).toString().padStart(2, '0');
	return `${day}/${month}`;
}
