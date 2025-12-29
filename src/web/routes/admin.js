/**
 * Admin Routes - User management and audit logs (Admin only)
 */

import express from 'express';
import { authMiddleware } from './auth.js';
import { prisma } from '../../utils/storage.js';
import { isAdmin } from '../../services/roleService.js';
import {
	getUsersWithViewCounts,
	getUserViewHistory,
	getRecentActions,
	getAnalyticsSummary,
} from '../../services/auditService.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Admin-only check middleware
function adminOnly(req, res, next) {
	const telegramIdNum = parseInt(req.user.telegramId, 10);
	if (!isAdmin(telegramIdNum)) {
		return res.status(403).json({ error: 'Admin access required' });
	}
	next();
}

/**
 * Get dashboard summary (admin only)
 */
router.get('/summary', adminOnly, async (req, res) => {
	try {
		const summary = await getAnalyticsSummary();

		// Add video counts
		const [pendingCount, postedCount] = await Promise.all([
			prisma.scheduledPost.count({ where: { status: 'pending' } }),
			prisma.scheduledPost.count({ where: { status: 'posted' } }),
		]);

		res.json({
			...summary,
			pendingVideos: pendingCount,
			postedVideos: postedCount,
		});
	} catch (error) {
		console.error('[Admin API] Summary error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Get all users with view counts (admin only)
 */
router.get('/users', adminOnly, async (req, res) => {
	const page = parseInt(req.query.page || '1', 10);
	const limit = parseInt(req.query.limit || '20', 10);
	const skip = (page - 1) * limit;
	const search = req.query.search?.trim() || '';
	const role = req.query.role || 'all'; // all, admin, mod, reviewer, user
	const sortBy = req.query.sortBy || 'viewCount'; // viewCount, lastActiveAt, createdAt
	const sortOrder = req.query.sortOrder || 'desc'; // asc, desc

	try {
		// Build where clause
		const where = {};

		// Role filter
		if (role && role !== 'all') {
			where.role = role;
		}

		// Search filter (username, firstName, lastName, telegramId)
		if (search) {
			where.OR = [
				{ username: { contains: search, mode: 'insensitive' } },
				{ firstName: { contains: search, mode: 'insensitive' } },
				{ lastName: { contains: search, mode: 'insensitive' } },
			];
			// Also try to match telegramId if search is numeric
			if (/^\d+$/.test(search)) {
				where.OR.push({ telegramId: BigInt(search) });
			}
		}

		// Build orderBy
		const orderBy = {};
		if (sortBy === 'lastActiveAt') {
			orderBy.lastActiveAt = sortOrder;
		} else if (sortBy === 'createdAt') {
			orderBy.createdAt = sortOrder;
		}
		// Note: viewCount sort is handled after aggregation

		// Get users with view counts
		const [users, total] = await Promise.all([
			prisma.user.findMany({
				where,
				orderBy: sortBy !== 'viewCount' ? orderBy : { lastActiveAt: 'desc' },
				skip,
				take: limit,
			}),
			prisma.user.count({ where }),
		]);

		// Get view counts for each user
		const viewCounts = await prisma.auditLog.groupBy({
			by: ['telegramId'],
			where: {
				telegramId: { in: users.map((u) => u.telegramId) },
				action: { in: ['view_video', 'navigate_video'] },
			},
			_count: true,
		});

		const viewCountMap = {};
		viewCounts.forEach((vc) => {
			viewCountMap[vc.telegramId.toString()] = vc._count;
		});

		// Get last view time for each user
		const lastViews = await prisma.auditLog.groupBy({
			by: ['telegramId'],
			where: {
				telegramId: { in: users.map((u) => u.telegramId) },
				action: { in: ['view_video', 'navigate_video'] },
			},
			_max: { createdAt: true },
		});

		const lastViewMap = {};
		lastViews.forEach((lv) => {
			lastViewMap[lv.telegramId.toString()] = lv._max.createdAt;
		});

		let result = users.map((u) => ({
			telegramId: u.telegramId.toString(),
			username: u.username,
			firstName: u.firstName,
			lastName: u.lastName,
			role: u.role,
			viewCount: viewCountMap[u.telegramId.toString()] || 0,
			lastViewAt: lastViewMap[u.telegramId.toString()] || null,
			createdAt: u.createdAt,
			lastActiveAt: u.lastActiveAt,
		}));

		// Sort by viewCount if requested
		if (sortBy === 'viewCount') {
			result.sort((a, b) => {
				return sortOrder === 'desc'
					? b.viewCount - a.viewCount
					: a.viewCount - b.viewCount;
			});
		}

		res.json({
			users: result,
			meta: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
				search,
				role,
				sortBy,
				sortOrder,
			},
		});
	} catch (error) {
		console.error('[Admin API] Users error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Get specific user details with action history (admin only)
 */
router.get('/users/:telegramId', adminOnly, async (req, res) => {
	const { telegramId } = req.params;
	const page = parseInt(req.query.page || '0', 10);

	try {
		// Get user info
		const user = await prisma.user.findUnique({
			where: { telegramId: BigInt(telegramId) },
		});

		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		// Get action history
		const { actions, total } = await getRecentActions(
			telegramId,
			20,
			page * 20
		);

		res.json({
			user: {
				telegramId: user.telegramId.toString(),
				username: user.username,
				firstName: user.firstName,
				lastName: user.lastName,
				role: user.role,
				createdAt: user.createdAt,
				lastActiveAt: user.lastActiveAt,
			},
			actions: actions.map((a) => ({
				action: a.action,
				targetId: a.targetId,
				details: a.details,
				createdAt: a.createdAt,
			})),
			total,
			page,
			totalPages: Math.ceil(total / 20),
		});
	} catch (error) {
		console.error('[Admin API] User detail error:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Get all audit logs (admin only)
 */
router.get('/audit', adminOnly, async (req, res) => {
	const page = parseInt(req.query.page || '1', 10);
	const limit = parseInt(req.query.limit || '50', 10);
	const skip = (page - 1) * limit;
	const search = req.query.search?.trim() || '';
	const action = req.query.action || 'all'; // all, upload_video, delete_video, navigate_video, etc.
	const userId = req.query.userId || ''; // Filter by specific user
	const sortOrder = req.query.sortOrder || 'desc'; // asc, desc

	try {
		// Build where clause
		const where = {};

		// Action filter
		if (action && action !== 'all') {
			where.action = action;
		}

		// User filter
		if (userId) {
			where.telegramId = BigInt(userId);
		}

		// Search filter (action or details)
		if (search) {
			where.OR = [
				{ action: { contains: search, mode: 'insensitive' } },
				{ details: { contains: search, mode: 'insensitive' } },
			];
		}

		const [logs, total] = await Promise.all([
			prisma.auditLog.findMany({
				where,
				orderBy: { createdAt: sortOrder },
				skip,
				take: limit,
			}),
			prisma.auditLog.count({ where }),
		]);

		// Get user info for each log
		const userIds = [...new Set(logs.map((l) => l.telegramId.toString()))];
		const users = await prisma.user.findMany({
			where: { telegramId: { in: userIds.map((id) => BigInt(id)) } },
		});

		const userMap = {};
		users.forEach((u) => {
			userMap[u.telegramId.toString()] = {
				username: u.username,
				firstName: u.firstName,
			};
		});

		// Get unique actions for filter dropdown
		const uniqueActions = await prisma.auditLog.findMany({
			select: { action: true },
			distinct: ['action'],
		});

		res.json({
			logs: logs.map((l) => ({
				id: l.id,
				telegramId: l.telegramId.toString(),
				user: userMap[l.telegramId.toString()] || null,
				action: l.action,
				targetId: l.targetId,
				details: l.details,
				createdAt: l.createdAt,
			})),
			meta: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
				search,
				action,
				userId,
				sortOrder,
				availableActions: uniqueActions.map((a) => a.action),
			},
		});
	} catch (error) {
		console.error('[Admin API] Audit error:', error);
		res.status(500).json({ error: error.message });
	}
});

export default router;
