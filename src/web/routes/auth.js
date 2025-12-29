import express from 'express';
import crypto from 'crypto';
import { getBot } from '../server.js';
import { prisma } from '../../utils/storage.js';
import { getUserRole, hasPermission } from '../../services/roleService.js';
import { signToken, verifyToken } from '../../utils/auth.js';

const router = express.Router();

// Store pending OTPs: { telegramId: { code, expiresAt } }
// This still needs to be in-memory or Redis, but it's short-lived (5m)
const pendingOTPs = new Map();

/**
 * Generate 6-digit OTP
 */
function generateOTP() {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Request OTP - sends code to Telegram
 */
router.post('/request-otp', async (req, res) => {
	const { telegramId } = req.body;

	if (!telegramId) {
		return res.status(400).json({ error: 'Telegram ID is required' });
	}

	const bot = getBot();
	if (!bot) {
		return res.status(500).json({ error: 'Bot not initialized' });
	}

	// Check if user exists and has permission
	const telegramIdNum = parseInt(telegramId, 10);
	const role = getUserRole(telegramIdNum);
	if (role === 'user') {
		return res
			.status(403)
			.json({ error: 'Không có quyền truy cập. Liên hệ Admin.' });
	}

	// Generate OTP
	const code = generateOTP();
	const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

	pendingOTPs.set(telegramId.toString(), { code, expiresAt });

	try {
		// Send OTP to Telegram
		await bot.api.sendMessage(
			telegramId,
			`🔐 Mã xác thực đăng nhập Dashboard:\n\n` +
				`<code>${code}</code>\n\n` +
				`⏰ Mã hết hạn sau 5 phút.\n` +
				`⚠️ Không chia sẻ mã này với ai!`,
			{ parse_mode: 'HTML' }
		);

		res.json({ success: true, message: 'OTP sent to Telegram' });
	} catch (error) {
		console.error('[Auth] Failed to send OTP:', error.message);
		res
			.status(500)
			.json({ error: 'Failed to send OTP. Check your Telegram ID.' });
	}
});

/**
 * Verify OTP - returns stateless token
 */
router.post('/verify-otp', async (req, res) => {
	const { telegramId, code } = req.body;

	if (!telegramId || !code) {
		return res.status(400).json({ error: 'Telegram ID and code are required' });
	}

	const pending = pendingOTPs.get(telegramId.toString());

	if (!pending) {
		return res
			.status(400)
			.json({ error: 'No pending OTP. Request a new one.' });
	}

	if (Date.now() > pending.expiresAt) {
		pendingOTPs.delete(telegramId.toString());
		return res.status(400).json({ error: 'OTP expired. Request a new one.' });
	}

	if (pending.code !== code) {
		return res.status(400).json({ error: 'Invalid OTP code.' });
	}

	// OTP valid - create token
	pendingOTPs.delete(telegramId.toString());

	const telegramIdNum = parseInt(telegramId, 10);
	const role = getUserRole(telegramIdNum);

	// Get user info from database
	let user = await prisma.user.findUnique({
		where: { telegramId: BigInt(telegramId) },
	});

	// Create payload for token
	const payload = {
		telegramId: telegramId.toString(),
		role,
		firstName: user?.firstName || 'User',
		username: user?.username || null,
	};

	const token = signToken(payload);

	res.json({
		success: true,
		token,
		user: {
			telegramId: telegramId.toString(),
			role,
			firstName: user?.firstName || 'User',
			username: user?.username || null,
			canEdit: hasPermission(telegramIdNum, 'edit'),
			canDelete: hasPermission(telegramIdNum, 'delete'),
		},
	});
});

/**
 * Get current user from token
 */
router.get('/me', (req, res) => {
	// authMiddleware already verified token and set req.user
	if (!req.user) {
		return res.status(401).json({ error: 'Not authenticated' });
	}

	const telegramIdNum = parseInt(req.user.telegramId, 10);

	// Re-calculate role to ensure freshness
	const currentRole = getUserRole(telegramIdNum);

	res.json({
		telegramId: req.user.telegramId,
		role: currentRole, // Use fresh role
		firstName: req.user.firstName,
		username: req.user.username,
		canEdit: hasPermission(telegramIdNum, 'edit'),
		canDelete: hasPermission(telegramIdNum, 'delete'),
	});
});

/**
 * Logout
 */
router.post('/logout', (req, res) => {
	// Stateless, so nothing to delete on server
	res.json({ success: true });
});

/**
 * Middleware to verify auth token
 */
export function authMiddleware(req, res, next) {
	const token = req.headers.authorization?.replace('Bearer ', '');

	if (!token) {
		return res.status(401).json({ error: 'No token provided' });
	}

	const payload = verifyToken(token);

	if (!payload) {
		return res.status(401).json({ error: 'Invalid or expired token' });
	}

	req.user = payload;
	next();
}

export default router;
