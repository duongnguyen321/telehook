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
	const page = parseInt(req.query.page || '0', 10);

	try {
		const result = await getUsersWithViewCounts(page);
		res.json(result);
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
	const page = parseInt(req.query.page || '0', 10);
	const limit = 50;

	try {
		const [logs, total] = await Promise.all([
			prisma.auditLog.findMany({
				orderBy: { createdAt: 'desc' },
				skip: page * limit,
				take: limit,
			}),
			prisma.auditLog.count(),
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
			total,
			page,
			totalPages: Math.ceil(total / limit),
		});
	} catch (error) {
		console.error('[Admin API] Audit error:', error);
		res.status(500).json({ error: error.message });
	}
});

export default router;
