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
import { isS3Enabled, downloadVideo } from '../../utils/s3.js';
import { logAction } from '../../services/auditService.js';

const router = express.Router();

/**
 * Stream video content (proxy from S3/local)
 * This endpoint is BEFORE authMiddleware - no auth required
 * Videos are already protected by requiring dashboard login to get video IDs
 */
router.get('/:id/stream', async (req, res) => {
	const { id } = req.params;

	try {
		// Get post to find video path
		const post = await prisma.scheduledPost.findUnique({ where: { id } });

		if (!post) {
			return res.status(404).json({ error: 'Video not found' });
		}

		const videoKey = path.basename(post.videoPath);
		const localPath = getVideoFullPath(post.videoPath);

		// Try local file first
		if (fs.existsSync(localPath)) {
			const stat = fs.statSync(localPath);
			res.set({
				'Content-Type': 'video/mp4',
				'Content-Length': stat.size,
				'Accept-Ranges': 'bytes',
				'Cache-Control': 'public, max-age=3600',
			});
			return fs.createReadStream(localPath).pipe(res);
		}

		// Download from S3 if not local
		if (isS3Enabled()) {
			const buffer = await downloadVideo(videoKey);
			if (buffer) {
				res.set({
					'Content-Type': 'video/mp4',
					'Content-Length': buffer.length,
					'Cache-Control': 'public, max-age=3600',
				});
				return res.send(buffer);
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
 * Get all videos (pending + posted)
 */
router.get('/', async (req, res) => {
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 100;
	const skip = (page - 1) * limit;

	try {
		// Get total count for pagination info
		// Get paginated videos
		const [total, posts] = await Promise.all([
			prisma.scheduledPost.count({
				where: {
					status: { in: ['pending', 'posted'] },
				},
			}),
			prisma.scheduledPost.findMany({
				where: {
					status: { in: ['pending', 'posted'] },
				},
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
			// For duplicate detection
			duration: post.duration,
			fileSize: post.fileSize,
			telegramFileId: post.telegramFileId,
			// Use proxy URL (served through backend with auth)
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
		await Promise.all(
			order.map(({ id, scheduledAt }) =>
				prisma.scheduledPost.update({
					where: { id },
					data: { scheduledAt: new Date(scheduledAt) },
				})
			)
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
				data: { scheduledAt: post2.scheduledAt },
			}),
			prisma.scheduledPost.update({
				where: { id: id2 },
				data: { scheduledAt: post1.scheduledAt },
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
