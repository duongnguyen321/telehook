/**
 * Role Service - Quản lý phân quyền cho Telegram Bot
 *
 * Role hierarchy:
 * - admin (level 4): Toàn quyền
 * - reviewer (level 3): Xem + sửa title + reschedule
 * - mod (level 2): Xem + upload video
 * - user (level 1): Chỉ xem
 */

// Role definitions với quyền hạn tương ứng
const ROLES = {
	admin: {
		level: 4,
		permissions: ['view', 'upload', 'edit', 'delete', 'reschedule', 'fix'],
	},
	reviewer: {
		level: 3,
		permissions: ['view', 'edit', 'reschedule'],
	},
	mod: {
		level: 2,
		permissions: ['view', 'upload'],
	},
	user: {
		level: 1,
		permissions: ['view'],
	},
};

/**
 * Parse comma-separated user IDs from environment variable
 * @param {string} envString - Comma-separated IDs (e.g., "123,456,789")
 * @returns {number[]} Array of user IDs
 */
function parseUserIds(envString) {
	if (!envString || envString.trim() === '') {
		return [];
	}
	return envString
		.split(',')
		.map((id) => parseInt(id.trim(), 10))
		.filter((id) => !isNaN(id) && id > 0);
}

/**
 * Get user role based on environment configuration
 * @param {number} userId - Telegram user ID
 * @returns {string} Role name: 'admin' | 'reviewer' | 'mod' | 'user'
 */
export function getUserRole(userId) {
	const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID || '0', 10);
	const REVIEWER_USER_IDS = parseUserIds(process.env.REVIEWER_USER_IDS || '');
	const MOD_USER_IDS = parseUserIds(process.env.MOD_USER_IDS || '');

	if (userId === ADMIN_USER_ID) {
		return 'admin';
	}

	if (REVIEWER_USER_IDS.includes(userId)) {
		return 'reviewer';
	}

	if (MOD_USER_IDS.includes(userId)) {
		return 'mod';
	}

	return 'user';
}

/**
 * Check if user has a specific permission
 * @param {number} userId - Telegram user ID
 * @param {string} permission - Permission to check: 'view' | 'upload' | 'edit' | 'delete' | 'reschedule' | 'fix'
 * @returns {boolean} True if user has the permission
 */
export function hasPermission(userId, permission) {
	const role = getUserRole(userId);
	const roleConfig = ROLES[role];

	if (!roleConfig) {
		return false;
	}

	return roleConfig.permissions.includes(permission);
}

/**
 * Check if user's role is at least the specified role level
 * @param {number} userId - Telegram user ID
 * @param {string} requiredRole - Minimum required role: 'user' | 'mod' | 'reviewer' | 'admin'
 * @returns {boolean} True if user's role >= required role
 */
export function isAtLeastRole(userId, requiredRole) {
	const userRole = getUserRole(userId);
	const userRoleConfig = ROLES[userRole];
	const requiredRoleConfig = ROLES[requiredRole];

	if (!userRoleConfig || !requiredRoleConfig) {
		return false;
	}

	return userRoleConfig.level >= requiredRoleConfig.level;
}

/**
 * Get role display name in Vietnamese
 * @param {string} role - Role name
 * @returns {string} Vietnamese display name
 */
export function getRoleDisplayName(role) {
	const displayNames = {
		admin: '👑 Admin',
		reviewer: '📝 Kiểm duyệt viên',
		mod: '📤 Mod',
		user: '👤 User',
	};
	return displayNames[role] || '👤 User';
}

/**
 * Get all permissions for a role
 * @param {string} role - Role name
 * @returns {string[]} Array of permission names
 */
export function getRolePermissions(role) {
	return ROLES[role]?.permissions || [];
}

/**
 * Get all user IDs that should receive cronjob notifications
 * Returns admin + all reviewers + all mods
 * @returns {number[]} Array of Telegram user IDs
 */
export function getNotificationRecipients() {
	const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID || '0', 10);
	const REVIEWER_USER_IDS = parseUserIds(process.env.REVIEWER_USER_IDS || '');
	const MOD_USER_IDS = parseUserIds(process.env.MOD_USER_IDS || '');

	const recipients = new Set();

	// Add admin
	if (ADMIN_USER_ID > 0) {
		recipients.add(ADMIN_USER_ID);
	}

	// Add reviewers
	REVIEWER_USER_IDS.forEach((id) => recipients.add(id));

	// Add mods
	MOD_USER_IDS.forEach((id) => recipients.add(id));

	return Array.from(recipients);
}

/**
 * Check if user is admin
 * @param {number} userId - Telegram user ID
 * @returns {boolean} True if user is admin
 */
export function isAdmin(userId) {
	const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID || '0', 10);
	return userId === ADMIN_USER_ID;
}
