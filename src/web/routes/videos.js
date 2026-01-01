/**
 * Video Routes - CRUD operations for videos
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from './auth.js';
import {
	prisma,
	deleteScheduledPost,
	deleteScheduledPostBatch,
	getVideoFullPath,
} from '../../utils/storage.js';
import { hasPermission } from '../../services/roleService.js';
import { isS3Enabled, downloadVideo, streamVideo } from '../../utils/s3.js';
import { logAction } from '../../services/auditService.js';

const router = express.Router();

/**
 * Stream video content (proxy from S3/local)
 * This endpoint is BEFORE authMiddleware - no auth required
 * Videos are already protected by requiring dashboard login to get video IDs
 * Query params:
 *   - download=1: Force download instead of streaming
 */
router.get('/:id/stream', async (req, res) => {
	const { id } = req.params;
	const isDownload = req.query.download === '1';

	try {
		// Get post to find video path
		const post = await prisma.scheduledPost.findUnique({ where: { id } });

		if (!post) {
			return res.status(404).json({ error: 'Video not found' });
		}

		const videoKey = path.basename(post.videoPath);
		const localPath = getVideoFullPath(post.videoPath);

		// Generate filename for download
		const safeTitle = (post.title || id)
			.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF_-]/g, '_')
			.substring(0, 50);
		const filename = `${safeTitle}.mp4`;

		// Try local file first
		if (fs.existsSync(localPath)) {
			const stat = fs.statSync(localPath);
			const headers = {
				'Content-Type': 'video/mp4',
				'Content-Length': stat.size,
				'Accept-Ranges': 'bytes',
				'Cache-Control': 'public, max-age=3600',
			};

			// Add download header if requested
			if (isDownload) {
				headers[
					'Content-Disposition'
				] = `attachment; filename="${encodeURIComponent(filename)}"`;
			}

			res.set(headers);
			return fs.createReadStream(localPath).pipe(res);
		}

		// Stream from S3 if not local
		if (isS3Enabled()) {
			// For downloads, buffer first (need Content-Length)
			if (isDownload) {
				const buffer = await downloadVideo(videoKey);
				if (buffer) {
					const headers = {
						'Content-Type': 'video/mp4',
						'Content-Length': buffer.length,
						'Content-Disposition': `attachment; filename="${encodeURIComponent(
							filename
						)}"`,
					};
					res.set(headers);
					return res.send(buffer);
				}
			} else {
				// For streaming, pipe directly from S3 (no buffering)
				const s3Stream = await streamVideo(videoKey);
				if (s3Stream) {
					const headers = {
						'Content-Type': s3Stream.contentType,
						'Content-Length': s3Stream.contentLength,
						'Accept-Ranges': 'bytes',
						'Cache-Control': 'public, max-age=3600',
					};
					res.set(headers);
					// Pipe S3 stream directly to response - video starts playing immediately
					return s3Stream.stream.pipe(res);
				}
			}
		}

		res.status(404).json({ error: 'Video file not found' });
	} catch (error) {
		console.error('[Videos API] Stream error:', error);
		res.status(500).json({ error: error.message });
	}
});

// All other routes require authentication
router.use(authMiddleware);

/**
 * Get all videos (pending + posted) with search and filter
 */
router.get('/', async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 40;
	const skip = (page - 1) * limit;
	const search = req.query.search?.trim() || '';
	const status = req.query.status || 'all'; // 'all', 'pending', 'posted', 'duplicates'

	try {
		// Get global stats first
		const [pendingCount, postedCount] = await Promise.all([
			prisma.scheduledPost.count({ where: { status: 'pending' } }),
			prisma.scheduledPost.count({ where: { status: 'posted' } }),
		]);

		// Calculate duplicate count using JavaScript grouping (MongoDB doesn't support raw SQL)
		// Get all videos with duration for duplicate detection
		// Duration is now precise (from ffprobe) so we can match on duration alone
		const allVideosForDupes = await prisma.scheduledPost.findMany({
			where: {
				status: { in: ['pending', 'posted'] },
				duration: { not: null },
			},
			select: {
				id: true,
				duration: true,
			},
		});

		// Group by duration (rounded to 2 decimal places for precision)
		// Videos with same precise duration (±0.01s) are duplicates
		const dupGroups = {};
		allVideosForDupes.forEach((v) => {
			// Round to 2 decimal places for matching
			const roundedDuration = Math.round(v.duration * 100) / 100;
			const key = `${roundedDuration}`;
			if (!dupGroups[key]) dupGroups[key] = [];
			dupGroups[key].push(v.id);
		});

		// Get IDs of duplicate videos (in groups with > 1 video of same duration)
		const duplicateIds = [];
		Object.values(dupGroups).forEach((ids) => {
			if (ids.length > 1) {
				duplicateIds.push(...ids);
			}
		});
		const duplicateCount = duplicateIds.length;

		// Handle duplicates filter specially
		if (status === 'duplicates') {
			if (duplicateIds.length === 0) {
				return res.json({
					videos: [],
					meta: {
						total: 0,
						page: 1,
						limit,
						totalPages: 0,
						search,
						status,
						duplicateCount: 0,
						globalTotal: pendingCount + postedCount,
						pendingCount,
						postedCount,
					},
				});
			}

			const where = {
				id: { in: duplicateIds },
			};

			// Apply search if provided
			if (search) {
				where.OR = [
					{ title: { contains: search, mode: 'insensitive' } },
					{ hashtags: { contains: search, mode: 'insensitive' } },
				];
			}

			// Fetch ALL duplicates for proper grouping
			const allDupes = await prisma.scheduledPost.findMany({
				where,
				orderBy: { scheduledAt: 'asc' },
			});

			// Build reverse lookup: videoId -> groupKey (duration rounded to 2 decimals)
			const videoToGroup = {};
			allVideosForDupes.forEach((v) => {
				const roundedDuration = Math.round(v.duration * 100) / 100;
				videoToGroup[v.id] = roundedDuration;
			});

			// Sort by group key (duration) so duplicates are together, then by scheduledAt within group
			allDupes.sort((a, b) => {
				const groupA = videoToGroup[a.id] || 0;
				const groupB = videoToGroup[b.id] || 0;
				if (groupA !== groupB) return groupA - groupB; // Numeric comparison
				return new Date(a.scheduledAt) - new Date(b.scheduledAt);
			});

			// Group videos by duration for group-aware pagination
			const groupedVideos = [];
			let currentGroupKey = null;
			let currentGroup = [];

			allDupes.forEach((video) => {
				const groupKey = videoToGroup[video.id] || 0;
				if (groupKey !== currentGroupKey) {
					if (currentGroup.length > 0) {
						groupedVideos.push({ key: currentGroupKey, videos: currentGroup });
					}
					currentGroupKey = groupKey;
					currentGroup = [video];
				} else {
					currentGroup.push(video);
				}
			});
			if (currentGroup.length > 0) {
				groupedVideos.push({ key: currentGroupKey, videos: currentGroup });
			}

			// Paginate by groups (not by individual videos)
			// Each page shows N groups, where N = limit/avgGroupSize, min 1 group per page
			const totalGroups = groupedVideos.length;
			const avgGroupSize = allDupes.length / totalGroups || 1;
			const groupsPerPage = Math.max(1, Math.floor(limit / avgGroupSize));
			const totalPages = Math.ceil(totalGroups / groupsPerPage);

			const startGroupIdx = (page - 1) * groupsPerPage;
			const endGroupIdx = Math.min(startGroupIdx + groupsPerPage, totalGroups);
			const pageGroups = groupedVideos.slice(startGroupIdx, endGroupIdx);

			// Flatten groups back to videos with group info
			const videos = [];
			pageGroups.forEach((group) => {
				group.videos.forEach((post) => {
					videos.push({
						id: post.id,
						title: post.title,
						hashtags: post.hashtags,
						videoPath: post.videoPath,
						scheduledAt: post.scheduledAt,
						status: post.status,
						isRepost: post.isRepost,
						duration: post.duration,
						fileSize: post.fileSize,
						telegramFileId: post.telegramFileId,
						videoUrl: `/api/videos/${post.id}/stream`,
						duplicateGroup: group.key,
					});
				});
			});

			return res.json({
				videos,
				meta: {
					total: allDupes.length,
					totalGroups,
					page,
					limit,
					totalPages,
					search,
					status,
					duplicateCount,
					globalTotal: pendingCount + postedCount,
					pendingCount,
					postedCount,
				},
			});
		}

		// Build where clause for non-duplicate queries
		const where = {};

		// Status filter
		if (status === 'pending' || status === 'posted') {
			where.status = status;
		} else {
			where.status = { in: ['pending', 'posted'] };
		}

		// Search filter (title OR hashtags)
		if (search) {
			where.OR = [
				{ title: { contains: search, mode: 'insensitive' } },
				{ hashtags: { contains: search, mode: 'insensitive' } },
			];
		}

		// Get total count and paginated videos
		const [total, posts] = await Promise.all([
			prisma.scheduledPost.count({ where }),
			prisma.scheduledPost.findMany({
				where,
				orderBy: { scheduledAt: 'asc' },
				skip,
				take: limit,
			}),
		]);

		const videos = posts.map((post) => ({
			id: post.id,
			title: post.title,
			hashtags: post.hashtags,
			videoPath: post.videoPath,
			scheduledAt: post.scheduledAt,
			status: post.status,
			isRepost: post.isRepost,
			duration: post.duration,
			fileSize: post.fileSize,
			telegramFileId: post.telegramFileId,
			videoUrl: `/api/videos/${post.id}/stream`,
		}));

		res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
		res.json({
			videos,
			meta: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
				search,
				status,
				duplicateCount,
				globalTotal: pendingCount + postedCount,
				pendingCount,
				postedCount,
			},
		});
	} catch (error) {
		console.error('[Videos API] Error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Update video title/hashtags
 */
router.put('/:id', async (req, res) => {
	const { id } = req.params;
	const { title, hashtags } = req.body;

	// Check permission
	const telegramId = parseInt(req.user.telegramId, 10);
	if (!hasPermission(telegramId, 'edit')) {
		return res.status(403).json({ error: 'No edit permission' });
	}

	try {
		const updated = await prisma.scheduledPost.update({
			where: { id },
			data: {
				...(title !== undefined && { title }),
				...(hashtags !== undefined && { hashtags }),
			},
		});

		// Log dashboard action
		const telegramId = parseInt(req.user.telegramId, 10);
		const changes = [];
		if (title !== undefined) changes.push('title');
		if (hashtags !== undefined) changes.push('hashtags');
		await logAction(
			telegramId,
			'dashboard_edit',
			id,
			`Changed: ${changes.join(', ')}`
		);

		res.json({
			success: true,
			video: {
				id: updated.id,
				title: updated.title,
				hashtags: updated.hashtags,
			},
		});
	} catch (error) {
		console.error('[Videos API] Update error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Reorder videos - update scheduledAt times
 */
router.put('/reorder/batch', async (req, res) => {
	const { order } = req.body; // Array of { id, scheduledAt }

	// Check permission
	const telegramIdAsNum = parseInt(req.user.telegramId, 10);
	if (!hasPermission(telegramIdAsNum, 'reschedule')) {
		return res.status(403).json({ error: 'No reschedule permission' });
	}

	if (!Array.isArray(order)) {
		return res.status(400).json({ error: 'order must be an array' });
	}

	try {
		// Batch update using Promise.all
		// Batch update with safety check for 'posted' status
		// First fetch status of all diverse posts
		const targetIds = order.map((o) => o.id);
		const existingPosts = await prisma.scheduledPost.findMany({
			where: { id: { in: targetIds } },
			select: { id: true, status: true },
		});

		const statusMap = new Map();
		existingPosts.forEach((p) => statusMap.set(p.id, p.status));

		await Promise.all(
			order.map(({ id, scheduledAt }) => {
				const currentStatus = statusMap.get(id);
				return prisma.scheduledPost.update({
					where: { id },
					data: {
						scheduledAt: new Date(scheduledAt),
						// Only reset notificationSent if status is pending
						...(currentStatus === 'pending' && { notificationSent: false }),
					},
				});
			})
		);

		// Log dashboard action
		const telegramId = parseInt(req.user.telegramId, 10);
		await logAction(
			telegramId,
			'dashboard_reorder',
			null,
			`Reordered ${order.length} videos`
		);

		res.json({ success: true, updated: order.length });
	} catch (error) {
		console.error('[Videos API] Reorder error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Swap two videos' scheduled times
 */
router.post('/swap', async (req, res) => {
	const { id1, id2 } = req.body;

	// Check permission
	const telegramIdAsNum = parseInt(req.user.telegramId, 10);
	if (!hasPermission(telegramIdAsNum, 'reschedule')) {
		return res.status(403).json({ error: 'No reschedule permission' });
	}

	try {
		const [post1, post2] = await Promise.all([
			prisma.scheduledPost.findUnique({ where: { id: id1 } }),
			prisma.scheduledPost.findUnique({ where: { id: id2 } }),
		]);

		if (!post1 || !post2) {
			return res.status(404).json({ error: 'Video not found' });
		}

		// Swap scheduledAt
		await Promise.all([
			prisma.scheduledPost.update({
				where: { id: id1 },
				data: {
					scheduledAt: post2.scheduledAt,
					...(post1.status === 'pending' && { notificationSent: false }),
				},
			}),
			prisma.scheduledPost.update({
				where: { id: id2 },
				data: {
					scheduledAt: post1.scheduledAt,
					...(post2.status === 'pending' && { notificationSent: false }),
				},
			}),
		]);

		res.json({ success: true });
	} catch (error) {
		console.error('[Videos API] Swap error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Delete video
 */
router.delete('/:id', async (req, res) => {
	const { id } = req.params;

	// Check permission
	const telegramIdAsNum = parseInt(req.user.telegramId, 10);
	if (!hasPermission(telegramIdAsNum, 'delete')) {
		return res.status(403).json({ error: 'No delete permission' });
	}

	try {
		// Use existing delete function which handles S3, local files, reschedule
		const result = await deleteScheduledPost(id, 0); // chatId not used

		if (result.success) {
			// Log dashboard action
			const telegramId = parseInt(req.user.telegramId, 10);
			await logAction(
				telegramId,
				'dashboard_delete',
				id,
				'Deleted from dashboard'
			);

			res.json({ success: true, rescheduled: result.rescheduled });
		} else {
			res.status(404).json({ error: 'Video not found' });
		}
	} catch (error) {
		console.error('[Videos API] Delete error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Batch delete videos
 */
router.post('/batch-delete', async (req, res) => {
	const { ids } = req.body;

	if (!Array.isArray(ids) || ids.length === 0) {
		return res.status(400).json({ error: 'ids must be a non-empty array' });
	}

	// Check permission
	const telegramIdAsNum = parseInt(req.user.telegramId, 10);
	if (!hasPermission(telegramIdAsNum, 'delete')) {
		return res.status(403).json({ error: 'No delete permission' });
	}

	try {
		const result = await deleteScheduledPostBatch(ids);

		// Log dashboard action
		await logAction(
			telegramIdAsNum,
			'dashboard_batch_delete',
			null,
			`Deleted ${result.deleted} videos`
		);

		res.json({
			success: true,
			deleted: result.deleted,
			rescheduled: result.rescheduled,
		});
	} catch (error) {
		console.error('[Videos API] Batch delete error:', error);
		res.status(500).json({ error: error.message });
	}
});

export default router;
