import { prisma } from '../utils/storage.js';
import { getUserRole } from './roleService.js';
import { logAction } from './auditService.js';

/**
 * Create or update user in database
 * Logs an audit entry if user info changes
 * @param {Object} userInfo - Telegram user information
 * @param {number} userInfo.telegramId - Telegram user ID
 * @param {string} userInfo.username - Telegram username (optional)
 * @param {string} userInfo.firstName - User's first name
 * @param {string} userInfo.lastName - User's last name (optional)
 * @param {string} userInfo.role - User role (user or admin)
 * @returns {Promise<Object>} Created/updated user
 */
export async function createOrUpdateUser(userInfo) {
	const { telegramId, username, firstName, lastName, role } = userInfo;

	try {
		// Get existing user to detect changes
		const existingUser = await prisma.user.findUnique({
			where: { telegramId: BigInt(telegramId) },
		});

		// Detect what changed
		const changes = [];
		if (existingUser) {
			if (existingUser.username !== (username || null)) {
				changes.push(
					`username: ${existingUser.username || 'null'} → ${username || 'null'}`
				);
			}
			if (existingUser.firstName !== firstName) {
				changes.push(`firstName: ${existingUser.firstName} → ${firstName}`);
			}
			if (existingUser.lastName !== (lastName || null)) {
				changes.push(
					`lastName: ${existingUser.lastName || 'null'} → ${lastName || 'null'}`
				);
			}
		}

		const user = await prisma.user.upsert({
			where: { telegramId: BigInt(telegramId) },
			update: {
				username: username || null,
				firstName,
				lastName: lastName || null,
				role,
				lastActiveAt: new Date().toISOString(),
			},
			create: {
				telegramId: BigInt(telegramId),
				username: username || null,
				firstName,
				lastName: lastName || null,
				role,
				createdAt: new Date().toISOString(),
				lastActiveAt: new Date().toISOString(),
			},
		});

		// Log info change if there were changes
		if (changes.length > 0) {
			await logAction(telegramId, 'info_changed', null, changes.join(', '));
			console.log(
				`[User] Info changed for ${telegramId}: ${changes.join(', ')}`
			);
		}

		return user;
	} catch (error) {
		console.error('[UserService] Error creating/updating user:', error);
		throw error;
	}
}

/**
 * Get user by Telegram ID
 * @param {number} telegramId - Telegram user ID
 * @returns {Promise<Object|null>} User or null if not found
 */
export async function getUserByTelegramId(telegramId) {
	try {
		const user = await prisma.user.findUnique({
			where: { telegramId: BigInt(telegramId) },
		});
		return user;
	} catch (error) {
		console.error('[UserService] Error fetching user:', error);
		return null;
	}
}

/**
 * Check if user has admin role
 * @param {number} telegramId - Telegram user ID
 * @returns {Promise<boolean>} True if user is admin
 */
export async function isUserAdmin(telegramId) {
	try {
		const user = await getUserByTelegramId(telegramId);
		return user?.role === 'admin';
	} catch (error) {
		console.error('[UserService] Error checking admin status:', error);
		return false;
	}
}
