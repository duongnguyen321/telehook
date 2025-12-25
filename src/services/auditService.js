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
				createdAt: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error('[Audit] Failed to log action:', error.message);
	}
}

/**
 * Get recent actions for a user
 * @param {number} telegramId - Telegram user ID
 * @param {number} limit - Max number of actions to return
 * @returns {Promise<Array>} Recent actions
 */
export async function getRecentActions(telegramId, limit = 10) {
	try {
		const actions = await prisma.auditLog.findMany({
			where: { telegramId: BigInt(telegramId) },
			orderBy: { createdAt: 'desc' },
			take: limit,
		});
		return actions;
	} catch (error) {
		console.error('[Audit] Failed to get recent actions:', error.message);
		return [];
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

/**
 * Get user activity summary for /info command
 * @param {number} telegramId - Telegram user ID
 * @param {string} userRole - User role
 * @returns {Promise<string>} Formatted summary
 */
export async function getUserActivitySummary(telegramId, userRole) {
	const counts = await getActionCounts(telegramId);
	const recentActions = await getRecentActions(telegramId, 5);

	let summary = `📊 <b>HOẠT ĐỘNG CỦA BẠN</b>\n\n`;

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

	// Recent actions
	if (recentActions.length > 0) {
		summary += `\n🕐 <b>Hoạt động gần đây:</b>\n`;
		for (const action of recentActions) {
			const time = formatTimeAgo(action.createdAt);
			const actionName = getActionDisplayName(action.action);
			summary += `• ${actionName} - ${time}\n`;
		}
	}

	return summary;
}

/**
 * Get display name for action
 * @param {string} action - Action code
 * @returns {string} Display name
 */
function getActionDisplayName(action) {
	const names = {
		start: '🚀 Khởi động bot',
		view_queue: '📅 Xem lịch',
		view_videos: '🎬 Xem video',
		view_info: 'ℹ️ Xem thông tin',
		clear: '🧹 Làm mới',
		upload_video: '📤 Upload video',
		edit_content: '✏️ Sửa nội dung',
		delete_video: '🗑️ Xoá video',
		reschedule: '🔄 Reschedule',
		fix_database: '🔧 Fix database',
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
