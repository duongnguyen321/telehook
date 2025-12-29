/**
 * Audit Service - Ghi log và thống kê hoạt động user
 */

import { prisma } from '../utils/storage.js';
import { getRoleDisplayName } from './roleService.js';

/**
 * Log an action to the audit log
 * @param {number} telegramId - Telegram user ID
 * @param {string} action - Action name (e.g., 'upload', 'edit', 'delete', 'view_queue')
 * @param {string|null} targetId - Optional target ID (e.g., post ID)
 * @param {string|null} details - Optional details
 */
export async function logAction(
	telegramId,
	action,
	targetId = null,
	details = null
) {
	try {
		await prisma.auditLog.create({
			data: {
				telegramId: BigInt(telegramId),
				action,
				targetId,
				details,
				createdAt: new Date(),
			},
		});
	} catch (error) {
		console.error('[Audit] Failed to log action:', error.message);
	}
}

/**
 * Get recent actions for a user with pagination
 * @param {number} telegramId - Telegram user ID
 * @param {number} limit - Max number of actions to return
 * @param {number} offset - Number of actions to skip
 * @returns {Promise<{actions: Array, total: number}>} Recent actions with total count
 */
export async function getRecentActions(telegramId, limit = 10, offset = 0) {
	try {
		const [actions, total] = await Promise.all([
			prisma.auditLog.findMany({
				where: { telegramId: BigInt(telegramId) },
				orderBy: { createdAt: 'desc' },
				take: limit,
				skip: offset,
			}),
			prisma.auditLog.count({
				where: { telegramId: BigInt(telegramId) },
			}),
		]);
		return { actions, total };
	} catch (error) {
		console.error('[Audit] Failed to get recent actions:', error.message);
		return { actions: [], total: 0 };
	}
}

/**
 * Get action counts by type for a user
 * @param {number} telegramId - Telegram user ID
 * @returns {Promise<Object>} Action counts
 */
export async function getActionCounts(telegramId) {
	try {
		const counts = await prisma.auditLog.groupBy({
			by: ['action'],
			where: { telegramId: BigInt(telegramId) },
			_count: { action: true },
		});

		// Convert to object
		const result = {};
		for (const item of counts) {
			result[item.action] = item._count.action;
		}
		return result;
	} catch (error) {
		console.error('[Audit] Failed to get action counts:', error.message);
		return {};
	}
}

const PAGE_SIZE = 5;

/**
 * Get user activity summary for /info command with pagination
 * @param {number} telegramId - Telegram user ID
 * @param {string} userRole - User role
 * @param {number} page - Page number (0-indexed)
 * @returns {Promise<{summary: string, hasMore: boolean, page: number, totalPages: number}>} Formatted summary with pagination info
 */
export async function getUserActivitySummary(telegramId, userRole, page = 0) {
	const counts = await getActionCounts(telegramId);
	const offset = page * PAGE_SIZE;
	const { actions: recentActions, total } = await getRecentActions(
		telegramId,
		PAGE_SIZE,
		offset
	);
	const totalPages = Math.ceil(total / PAGE_SIZE);
	const hasMore = page < totalPages - 1;

	let summary = `📊 <b>HOẠT ĐỘNG CỦA BẠN</b>\n\n`;

	// Only show stats on first page
	if (page === 0) {
		// Stats section
		summary += `📈 <b>Thống kê:</b>\n`;
		summary += `• Xem lịch: ${counts.view_queue || 0} lần\n`;
		summary += `• Xem video: ${counts.view_videos || 0} lần\n`;

		// Role-specific stats
		if (userRole === 'mod' || userRole === 'admin') {
			summary += `• Upload video: ${counts.upload_video || 0} video\n`;
		}

		if (userRole === 'reviewer' || userRole === 'admin') {
			summary += `• Sửa nội dung: ${counts.edit_content || 0} lần\n`;
			summary += `• Reschedule: ${counts.reschedule || 0} lần\n`;
		}

		if (userRole === 'admin') {
			summary += `• Xoá video: ${counts.delete_video || 0} video\n`;
			summary += `• Fix database: ${counts.fix_database || 0} lần\n`;
		}
	}

	// Recent actions
	if (recentActions.length > 0) {
		summary += `\n🕐 <b>Lịch sử${
			page > 0 ? ` (Trang ${page + 1}/${totalPages})` : ''
		}:</b>\n`;
		for (const action of recentActions) {
			const time = formatTimeAgo(action.createdAt);
			const actionName = getActionDisplayName(action.action);
			const details = action.details ? ` - ${action.details}` : '';
			summary += `• ${actionName}${details} - ${time}\n`;
		}
	} else if (page > 0) {
		summary += `\n<i>Không có hoạt động nào ở trang này.</i>\n`;
	}

	return { summary, hasMore, page, totalPages };
}

/**
 * Get display name for action
 * @param {string} action - Action code
 * @returns {string} Display name
 */
function getActionDisplayName(action) {
	const names = {
		// General commands
		start: '🚀 Khởi động bot',
		view_queue: '📅 Xem lịch',
		view_videos: '🎬 Xem video',
		view_info: 'ℹ️ Xem thông tin',
		clear: '🧹 Làm mới',
		upload_video: '📤 Upload video',
		reschedule: '🔄 Reschedule',
		swap_videos: '🔄 Swap videos',
		fix_database: '🔧 Fix database',
		user_info_changed: '👤 Cập nhật thông tin',
		view_audit: '📜 Xem lịch sử audit',
		// Navigate video
		navigate_video: '🔍 Xem video',
		// Delete actions
		delete_ask: '❓ Hỏi xóa video',
		delete_video: '🗑️ Xoá video',
		delete_cancel: '↩️ Hủy xóa video',
		// Edit actions
		edit_start: '✏️ Bắt đầu sửa',
		select_category: '📁 Chọn category',
		toggle_option: '🔘 Chọn/bỏ chọn option',
		generate_options: '📝 Tạo options',
		edit_content: '✏️ Sửa nội dung',
		edit_cancel: '↩️ Hủy sửa',
		// Random content
		choose_random: '🎲 Chọn ngẫu nhiên',
		random_content: '🎲 Tạo random',
		// Posted confirmation
		confirm_posted: '✅ Xác nhận đã đăng',
		// Dashboard actions
		dashboard_edit: '🖥️ Sửa từ Dashboard',
		dashboard_delete: '🖥️ Xóa từ Dashboard',
		dashboard_reorder: '🖥️ Sắp xếp từ Dashboard',
	};
	return names[action] || action;
}

/**
 * Format time ago
 * @param {string} isoString - ISO date string
 * @returns {string} Time ago string
 */
function formatTimeAgo(isoString) {
	const date = new Date(isoString);
	const now = new Date();
	const diffMs = now - date;
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return 'vừa xong';
	if (diffMins < 60) return `${diffMins} phút trước`;
	if (diffHours < 24) return `${diffHours} giờ trước`;
	if (diffDays < 7) return `${diffDays} ngày trước`;

	// Format date
	const day = date.getDate().toString().padStart(2, '0');
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	return `${day}/${month}`;
}

// ==================== ANALYTICS FUNCTIONS ====================

const ANALYTICS_PAGE_SIZE = 10;

/**
 * Get all users with their video view counts for analytics
 * @param {number} page - Page number (0-indexed)
 * @returns {Promise<{users: Array, total: number, totalPages: number}>}
 */
export async function getUsersWithViewCounts(page = 0) {
	try {
		// Get all users
		const [allUsers, totalUsers] = await Promise.all([
			prisma.user.findMany({
				orderBy: { lastActiveAt: 'desc' },
				skip: page * ANALYTICS_PAGE_SIZE,
				take: ANALYTICS_PAGE_SIZE,
			}),
			prisma.user.count(),
		]);

		// For each user, get their view count
		const usersWithCounts = await Promise.all(
			allUsers.map(async (user) => {
				const viewCount = await prisma.auditLog.count({
					where: {
						telegramId: user.telegramId,
						action: 'navigate_video',
					},
				});

				const lastView = await prisma.auditLog.findFirst({
					where: {
						telegramId: user.telegramId,
						action: 'navigate_video',
					},
					orderBy: { createdAt: 'desc' },
				});

				return {
					telegramId: user.telegramId.toString(),
					username: user.username,
					firstName: user.firstName,
					lastName: user.lastName,
					role: user.role,
					viewCount,
					lastViewAt: lastView?.createdAt || null,
				};
			})
		);

		return {
			users: usersWithCounts,
			total: totalUsers,
			totalPages: Math.ceil(totalUsers / ANALYTICS_PAGE_SIZE),
		};
	} catch (error) {
		console.error('[Analytics] Failed to get users:', error.message);
		return { users: [], total: 0, totalPages: 0 };
	}
}

/**
 * Get detailed view history for a specific user
 * @param {number} telegramId - Telegram user ID
 * @param {number} page - Page number (0-indexed)
 * @returns {Promise<{views: Array, total: number, totalPages: number, user: Object|null}>}
 */
export async function getUserViewHistory(telegramId, page = 0) {
	try {
		// Get user info
		const user = await prisma.user.findUnique({
			where: { telegramId: BigInt(telegramId) },
		});

		// Get view logs with pagination
		const [views, total] = await Promise.all([
			prisma.auditLog.findMany({
				where: {
					telegramId: BigInt(telegramId),
					action: 'navigate_video',
				},
				orderBy: { createdAt: 'desc' },
				skip: page * ANALYTICS_PAGE_SIZE,
				take: ANALYTICS_PAGE_SIZE,
			}),
			prisma.auditLog.count({
				where: {
					telegramId: BigInt(telegramId),
					action: 'navigate_video',
				},
			}),
		]);

		return {
			views: views.map((v) => ({
				details: v.details,
				createdAt: v.createdAt,
			})),
			total,
			totalPages: Math.ceil(total / ANALYTICS_PAGE_SIZE),
			user: user
				? {
						telegramId: user.telegramId.toString(),
						username: user.username,
						firstName: user.firstName,
						role: user.role,
				  }
				: null,
		};
	} catch (error) {
		console.error('[Analytics] Failed to get user history:', error.message);
		return { views: [], total: 0, totalPages: 0, user: null };
	}
}

/**
 * Get total analytics summary
 * @returns {Promise<{totalUsers: number, totalViews: number, activeToday: number}>}
 */
export async function getAnalyticsSummary() {
	try {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const [totalUsers, totalViews, activeToday] = await Promise.all([
			prisma.user.count(),
			prisma.auditLog.count({ where: { action: 'navigate_video' } }),
			prisma.auditLog.count({
				where: {
					createdAt: { gte: today },
				},
			}),
		]);

		return { totalUsers, totalViews, activeToday };
	} catch (error) {
		console.error('[Analytics] Failed to get summary:', error.message);
		return { totalUsers: 0, totalViews: 0, activeToday: 0 };
	}
}
