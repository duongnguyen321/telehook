import crypto from 'crypto';

/**
 * Sign a payload to create a token
 * @param {object} payload - Data to encode
 * @param {string} expiresIn - '1d', '2h', etc. (Currently simple ms implementation)
 * @returns {string} Signed token
 */
export function signToken(payload, expiresInMs = 24 * 60 * 60 * 1000) {
	// Get secret (lazy load)
	const secret =
		process.env.S3_SECRET_ACCESS_KEY || 'default-dev-secret-key-change-me';

	const data = {
		...payload,
		exp: Date.now() + expiresInMs,
	};

	const dataStr = Buffer.from(JSON.stringify(data)).toString('base64');
	const signature = crypto
		.createHmac('sha256', secret)
		.update(dataStr)
		.digest('base64');

	return `${dataStr}.${signature}`;
}

/**
 * Verify a token and return payload
 * @param {string} token
 * @returns {object|null} Payload if valid, null otherwise
 */
export function verifyToken(token) {
	if (!token || !token.includes('.')) return null;

	const [dataStr, signature] = token.split('.');

	// Get secret (lazy load to ensure env is ready)
	const secret =
		process.env.S3_SECRET_ACCESS_KEY || 'default-dev-secret-key-change-me';

	// Verify signature
	const expectedSignature = crypto
		.createHmac('sha256', secret)
		.update(dataStr)
		.digest('base64');

	if (signature !== expectedSignature) {
		console.log('[Auth] Signature mismatch');
		return null;
	}

	try {
		const payload = JSON.parse(Buffer.from(dataStr, 'base64').toString());

		// Check expiration
		if (payload.exp && Date.now() > payload.exp) {
			console.log('[Auth] Token expired');
			return null;
		}

		return payload;
	} catch (e) {
		console.log('[Auth] Token parse error:', e.message);
		return null;
	}
}

// Log secret status on init
// if (SECRET_KEY === 'default-dev-secret-key-change-me') {
// 	console.warn('[Auth] Using DEFAULT secret key. Env var not loaded?');
// } else {
// 	console.log('[Auth] Secret key loaded from env.');
// }
