/**
 * Vietnamese natural language time parser
 * Parses expressions like:
 * - "15:30", "3:30 chiều", "3h30"
 * - "2 tiếng nữa", "sau 30 phút"
 * - "chiều mai", "sáng mai"
 * - "ngày mai 15:00"
 */

/**
 * Parse Vietnamese time string to Date
 * @param {string} input - Natural language time input
 * @param {Date} [baseTime] - Base time for relative calculations (default: now)
 * @returns {Date | null}
 */
export function parseVietnameseTime(input, baseTime = new Date()) {
	const normalized = input.toLowerCase().trim();

	// Direct time format: "15:30", "15h30", "15 giờ 30"
	const directTimeMatch = normalized.match(
		/(\d{1,2})[:\sh](\d{2})?\s*(sáng|chiều|tối)?/
	);
	if (directTimeMatch) {
		let hours = parseInt(directTimeMatch[1]);
		const minutes = parseInt(directTimeMatch[2] || '0');
		const period = directTimeMatch[3];

		// Convert to 24h format
		if (period === 'chiều' || period === 'tối') {
			if (hours < 12) hours += 12;
		} else if (period === 'sáng' && hours === 12) {
			hours = 0;
		}

		const result = new Date(baseTime);
		result.setHours(hours, minutes, 0, 0);

		// If time is in the past today, schedule for tomorrow
		if (result <= baseTime) {
			result.setDate(result.getDate() + 1);
		}

		return result;
	}

	// Just hour: "15 giờ", "3 giờ chiều"
	const hourOnlyMatch = normalized.match(
		/(\d{1,2})\s*(giờ|h)\s*(sáng|chiều|tối)?/
	);
	if (hourOnlyMatch) {
		let hours = parseInt(hourOnlyMatch[1]);
		const period = hourOnlyMatch[3];

		if (period === 'chiều' || period === 'tối') {
			if (hours < 12) hours += 12;
		}

		const result = new Date(baseTime);
		result.setHours(hours, 0, 0, 0);

		if (result <= baseTime) {
			result.setDate(result.getDate() + 1);
		}

		return result;
	}

	// Relative time: "2 tiếng nữa", "sau 30 phút", "1 giờ nữa"
	const relativeMatch = normalized.match(
		/(sau\s+)?(\d+)\s*(tiếng|giờ|phút|phut|minute|hour)/
	);
	if (relativeMatch) {
		const amount = parseInt(relativeMatch[2]);
		const unit = relativeMatch[3];

		const result = new Date(baseTime);

		if (unit === 'tiếng' || unit === 'giờ' || unit === 'hour') {
			result.setHours(result.getHours() + amount);
		} else if (unit === 'phút' || unit === 'phut' || unit === 'minute') {
			result.setMinutes(result.getMinutes() + amount);
		}

		return result;
	}

	// Tomorrow: "ngày mai", "mai"
	if (normalized.includes('mai') || normalized.includes('ngày mai')) {
		const result = new Date(baseTime);
		result.setDate(result.getDate() + 1);

		// Check for time in "ngày mai 15:00" or "mai lúc 3 giờ"
		const tomorrowTimeMatch = normalized.match(
			/(\d{1,2})[:\sh]?(\d{2})?\s*(sáng|chiều|tối)?/
		);
		if (tomorrowTimeMatch) {
			let hours = parseInt(tomorrowTimeMatch[1]);
			const minutes = parseInt(tomorrowTimeMatch[2] || '0');
			const period = tomorrowTimeMatch[3];

			if (period === 'chiều' || period === 'tối') {
				if (hours < 12) hours += 12;
			}

			result.setHours(hours, minutes, 0, 0);
		} else {
			// Default to 9 AM tomorrow
			result.setHours(9, 0, 0, 0);
		}

		return result;
	}

	// Period of day: "sáng", "chiều", "tối"
	if (normalized === 'sáng' || normalized === 'buổi sáng') {
		const result = new Date(baseTime);
		result.setHours(9, 0, 0, 0);
		if (result <= baseTime) result.setDate(result.getDate() + 1);
		return result;
	}

	if (normalized === 'chiều' || normalized === 'buổi chiều') {
		const result = new Date(baseTime);
		result.setHours(14, 0, 0, 0);
		if (result <= baseTime) result.setDate(result.getDate() + 1);
		return result;
	}

	if (normalized === 'tối' || normalized === 'buổi tối') {
		const result = new Date(baseTime);
		result.setHours(19, 0, 0, 0);
		if (result <= baseTime) result.setDate(result.getDate() + 1);
		return result;
	}

	// "bây giờ", "ngay", "luôn"
	if (
		normalized === 'bây giờ' ||
		normalized === 'ngay' ||
		normalized === 'luôn' ||
		normalized === 'now'
	) {
		return new Date(baseTime.getTime() + 60000); // 1 minute from now
	}

	return null;
}

import { toGMT7 } from './timezone.js';

/**
 * Format date to Vietnamese readable string (in GMT+7)
 * @param {Date} date
 * @returns {string}
 */
export function formatVietnameseTime(date) {
	// Convert to GMT+7 for display
	const gmt7 = toGMT7(date);
	const now = toGMT7(new Date());

	const isToday = gmt7.toDateString() === now.toDateString();
	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);
	const isTomorrow = gmt7.toDateString() === tomorrow.toDateString();

	const hours = gmt7.getHours().toString().padStart(2, '0');
	const minutes = gmt7.getMinutes().toString().padStart(2, '0');
	const timeStr = `${hours}:${minutes}`;

	if (isToday) {
		return `hôm nay lúc ${timeStr}`;
	} else if (isTomorrow) {
		return `ngày mai lúc ${timeStr}`;
	} else {
		const day = gmt7.getDate().toString().padStart(2, '0');
		const month = (gmt7.getMonth() + 1).toString().padStart(2, '0');
		return `${day}/${month} lúc ${timeStr}`;
	}
}
