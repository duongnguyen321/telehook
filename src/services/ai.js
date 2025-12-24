/**
 * Random content generator for TikTok videos
 * Target: 20-30 age, sexy/18+ content
 * Note: Vietnamese with proper diacritics
 */

// Import content data from separate files
import { TITLES } from '../data/titles.js';
import { HASHTAG_SETS } from '../data/hashtags.js';
import { CATEGORIES } from '../data/category.js';

// Re-export for compatibility
export { TITLES, HASHTAG_SETS, CATEGORIES };

// Global tracking to avoid duplicates across all generated content
const usedTitlesGlobal = new Set();

/**
 * Get random item from array, avoiding items in usedSet
 * @param {string[]} arr - Array to pick from
 * @param {Set} usedSet - Set of already used items
 * @returns {string} Random unused item
 */
function getUniqueRandom(arr, usedSet) {
	// Reset if we've used too many (80% threshold)
	if (usedSet.size >= arr.length * 0.8) {
		usedSet.clear();
	}

	let item;
	let attempts = 0;
	const maxAttempts = arr.length;

	do {
		item = arr[Math.floor(Math.random() * arr.length)];
		attempts++;
	} while (usedSet.has(item) && attempts < maxAttempts);

	usedSet.add(item);
	return item;
}

/**
 * Get random item from array (simple, for hashtags)
 */
function random(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate 1 unique content option (title)
 * Tracks used titles globally to minimize duplicates
 */
export function generateContentOptions(count = 3) {
	const options = [];
	const sessionTitles = new Set();

	for (let i = 0; i < count; i++) {
		let title;
		// Ensure unique within this generation session too
		do {
			title = getUniqueRandom(TITLES, usedTitlesGlobal);
		} while (sessionTitles.has(title) && sessionTitles.size < TITLES.length);
		sessionTitles.add(title);

		options.push({
			title,
			hashtags: random(HASHTAG_SETS),
		});
	}

	return options;
}

/**
 * Get stats about content pool usage
 */
export function getContentStats() {
	return {
		titlesTotal: TITLES.length,
		titlesUsed: usedTitlesGlobal.size,
		titlesRemaining: TITLES.length - usedTitlesGlobal.size,
	};
}

/**
 * Reset all tracking (useful for testing or manual reset)
 */
export function resetContentTracking() {
	usedTitlesGlobal.clear();
}

/**
 * Suggest best posting time - late night content performs better
 */
export function suggestPostingTime() {
	const now = new Date();
	const hour = now.getHours();
	const day = now.getDay();

	// Evening/night times work best for 18+ content
	if (day === 0 || day === 6) {
		if (hour < 14) return { hour: 21, reason: 'Weekend night peak' };
		return { hour: 23, reason: 'Late weekend peak' };
	}

	if (hour < 18) return { hour: 21, reason: 'Night peak time' };
	if (hour < 22) return { hour: 23, reason: 'Late night content' };
	return { hour: 0, reason: 'Midnight vibes' };
}

// ==================== CATEGORY-BASED CONTENT SYSTEM ====================

/**
 * Get all available categories for UI display
 * @returns {Array<{key: string, name: string, emoji: string}>}
 */
export function getCategories() {
	return Object.entries(CATEGORIES).map(([key, cat]) => ({
		key,
		name: cat.name,
		emoji: cat.emoji,
	}));
}

/**
 * Get options for a specific category
 * @param {string} categoryKey - e.g. 'POSE', 'ACTION', 'EXPRESSION'
 * @returns {Array<{key: string, label: string}>|null}
 */
export function getCategoryOptions(categoryKey) {
	const category = CATEGORIES[categoryKey];
	if (!category) return null;

	return Object.entries(category.options).map(([key, opt]) => ({
		key,
		label: opt.label,
	}));
}

/**
 * Generate content based on selected categories
 * Uses AND logic across categories: content must match at least one keyword from EACH selected category.
 * Uses OR logic within a category: any keyword match counts.
 * @param {Object} selectedCategories - e.g. { ROLE: ['TEACHER'], OUTFIT: ['BIKINI'], LOCATION: ['BEDROOM'] }
 * @param {number} count - Number of options to generate (default: 6)
 * @returns {Array<{title: string, hashtags: string}>}
 */
export function generateContentFromCategories(selectedCategories, count = 6) {
	// Collect keyword sets from each selected category
	const keywordSets = [];

	for (const [categoryKey, optionKeys] of Object.entries(selectedCategories)) {
		const category = CATEGORIES[categoryKey];
		if (!category) continue;

		// Handle both string (single) and array (multi) input
		const keys = Array.isArray(optionKeys) ? optionKeys : [optionKeys];

		// Collect all keywords from selected options in this category (OR within category)
		const categoryKeywords = [];
		for (const optionKey of keys) {
			const option = category.options[optionKey];
			if (option?.keywords?.length > 0) {
				categoryKeywords.push(...option.keywords);
			}
		}

		if (categoryKeywords.length > 0) {
			keywordSets.push({
				categoryKey,
				keywords: categoryKeywords,
			});
		}
	}

	// If no valid selections, fall back to random
	if (keywordSets.length === 0) {
		return generateContentOptions(count);
	}

	/**
	 * Check if a string matches at least one keyword from the set
	 */
	const matchesCategory = (str, keywords) => {
		const lowerStr = str.toLowerCase();
		return keywords.some((kw) => lowerStr.includes(kw.toLowerCase()));
	};

	/**
	 * AND logic: Content must match ALL selected categories
	 * Each category requires at least one keyword match
	 */
	const matchesAllCategories = (str) => {
		return keywordSets.every((set) => matchesCategory(str, set.keywords));
	};

	/**
	 * Score: count how many keyword sets (categories) are matched + bonus for individual keywords
	 */
	const scoreByCategories = (str) => {
		const lowerStr = str.toLowerCase();
		let score = 0;
		for (const set of keywordSets) {
			if (matchesCategory(str, set.keywords)) {
				score++; // 1 point per category matched
				// Bonus: count individual keyword matches within category
				for (const kw of set.keywords) {
					if (lowerStr.includes(kw.toLowerCase())) {
						score += 0.1; // Small bonus for each keyword match
					}
				}
			}
		}
		return score;
	};

	// Step 1: Filter to only items matching ALL categories (AND logic)
	let matchingItems = TITLES.filter(matchesAllCategories);

	// Step 2: If too few results, relax to items matching at least N-1 categories
	if (matchingItems.length < count && keywordSets.length > 1) {
		const relaxedMatches = TITLES.filter((item) => {
			const matchCount = keywordSets.filter((set) =>
				matchesCategory(item, set.keywords)
			).length;
			return matchCount >= keywordSets.length - 1;
		});
		// Add relaxed matches that aren't already included
		for (const item of relaxedMatches) {
			if (!matchingItems.includes(item)) {
				matchingItems.push(item);
			}
		}
	}

	// Step 3: If still too few, fall back to items matching ANY category
	if (matchingItems.length < count) {
		const allKeywords = keywordSets.flatMap((s) => s.keywords);
		const anyMatch = TITLES.filter((item) => {
			const lowerItem = item.toLowerCase();
			return allKeywords.some((kw) => lowerItem.includes(kw.toLowerCase()));
		});
		for (const item of anyMatch) {
			if (!matchingItems.includes(item)) {
				matchingItems.push(item);
			}
		}
	}

	// Step 4: Score and sort
	const scoredItems = matchingItems.map((item) => ({
		text: item,
		score: scoreByCategories(item),
	}));
	scoredItems.sort((a, b) => b.score - a.score);

	// Step 5: Pick top results, avoiding duplicates
	const options = [];
	const usedTitles = new Set();

	for (const titleObj of scoredItems) {
		if (options.length >= count) break;
		if (usedTitles.has(titleObj.text)) continue;

		usedTitles.add(titleObj.text);
		options.push({
			title: titleObj.text,
			hashtags: random(HASHTAG_SETS),
		});
	}

	// If still not enough, fill with random
	if (options.length < count) {
		const remaining = generateContentOptions(count - options.length);
		options.push(...remaining);
	}

	return options;
}

/**
 * Get category name by key (for display)
 * @param {string} categoryKey
 * @returns {string}
 */
export function getCategoryName(categoryKey) {
	const category = CATEGORIES[categoryKey];
	return category ? `${category.emoji} ${category.name}` : categoryKey;
}

/**
 * Get option label by category and option key
 * @param {string} categoryKey
 * @param {string} optionKey
 * @returns {string}
 */
export function getOptionLabel(categoryKey, optionKey) {
	const category = CATEGORIES[categoryKey];
	if (!category) return optionKey;
	const option = category.options[optionKey];
	return option ? option.label : optionKey;
}

/**
 * Get category key by index
 * @param {number} index
 * @returns {string|null}
 */
export function getCategoryKeyByIndex(index) {
	const keys = Object.keys(CATEGORIES);
	return keys[index] || null;
}

/**
 * Get option key by category index and option index
 * @param {string} categoryKey
 * @param {number} optionIndex
 * @returns {string|null}
 */
export function getOptionKeyByIndex(categoryKey, optionIndex) {
	const category = CATEGORIES[categoryKey];
	if (!category) return null;
	const keys = Object.keys(category.options);
	return keys[optionIndex] || null;
}
