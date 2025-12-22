/**
 * Simple timezone utility - GMT+7 (Vietnam)
 */

const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000; // +7 hours in ms

/**
 * Get current time as if we're in GMT+7
 * Returns a regular Date but adjusted to GMT+7
 */
export function nowGMT7() {
	const now = new Date();
	// Get UTC time, then add 7 hours
	return new Date(
		now.getTime() + now.getTimezoneOffset() * 60000 + GMT7_OFFSET_MS
	);
}

/**
 * Convert UTC Date to GMT+7 Date
 */
export function toGMT7(date) {
	return new Date(
		date.getTime() + date.getTimezoneOffset() * 60000 + GMT7_OFFSET_MS
	);
}

/**
 * Get slot key from a Date (YYYY-MM-DD-HH format)
 * Works on both local and GMT+7 adjusted dates consistently
 */
export function getSlotKey(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	const h = date.getHours();
	return `${y}-${m}-${d}-${h}`;
}

/**
 * Get date key (YYYY-MM-DD format)
 */
export function getDateKey(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/**
 * Create a Date for a specific time in GMT+7
 * @param {number} year
 * @param {number} month - 1-indexed (1 = January)
 * @param {number} day
 * @param {number} hour
 * @returns {Date} - A Date that when stored as ISO will represent this GMT+7 time
 */
export function createGMT7Time(year, month, day, hour) {
	// Create date in GMT+7, then convert back to local for proper ISO storage
	const gmt7Date = new Date(Date.UTC(year, month - 1, day, hour - 7, 0, 0, 0));
	return gmt7Date;
}
