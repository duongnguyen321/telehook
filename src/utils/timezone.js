/**
 * Timezone utility - Force GMT+7 (Vietnam timezone)
 */

const GMT_OFFSET = 7; // GMT+7

/**
 * Get current time in GMT+7
 * @returns {Date}
 */
export function nowGMT7() {
	const now = new Date();
	const utc = now.getTime() + now.getTimezoneOffset() * 60000;
	return new Date(utc + GMT_OFFSET * 3600000);
}

/**
 * Convert any date to GMT+7
 * @param {Date} date
 * @returns {Date}
 */
export function toGMT7(date) {
	const utc = date.getTime() + date.getTimezoneOffset() * 60000;
	return new Date(utc + GMT_OFFSET * 3600000);
}

/**
 * Create a date in GMT+7 timezone
 * @param {number} year
 * @param {number} month - 0-indexed
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @returns {Date}
 */
export function createGMT7Date(year, month, day, hour = 0, minute = 0) {
	// Create date as if it's GMT+7, then convert back to local
	const gmt7 = new Date(year, month, day, hour, minute, 0, 0);
	const local = new Date();
	const offsetDiff = (local.getTimezoneOffset() + GMT_OFFSET * 60) * 60000;
	return new Date(gmt7.getTime() - offsetDiff);
}

/**
 * Format date in GMT+7 for display
 * @param {Date} date
 * @returns {string}
 */
export function formatGMT7(date) {
	const gmt7 = toGMT7(date);
	const day = gmt7.getDate();
	const month = gmt7.getMonth() + 1;
	const hour = gmt7.getHours();
	const minute = String(gmt7.getMinutes()).padStart(2, '0');
	return `${day}/${month} ${hour}:${minute}`;
}

/**
 * Get date key in GMT+7 (YYYY-MM-DD)
 * @param {Date} date
 * @returns {string}
 */
export function getDateKeyGMT7(date) {
	const gmt7 = toGMT7(date);
	const y = gmt7.getFullYear();
	const m = String(gmt7.getMonth() + 1).padStart(2, '0');
	const d = String(gmt7.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/**
 * Get hour in GMT+7
 * @param {Date} date
 * @returns {number}
 */
export function getHourGMT7(date) {
	return toGMT7(date).getHours();
}

/**
 * Get slot key in GMT+7 (YYYY-MM-DD-HH)
 * @param {Date} date
 * @returns {string}
 */
export function getSlotKeyGMT7(date) {
	const gmt7 = toGMT7(date);
	return `${getDateKeyGMT7(date)}-${gmt7.getHours()}`;
}
