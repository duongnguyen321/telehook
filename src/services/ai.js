/**
 * Random content generator for TikTok videos
 * Target: 20-30 age, sexy/18+ content
 * Note: Vietnamese with proper diacritics
 */

// Import content data from separate files
// Import content data from separate files
import { TITLES } from '../data/titles.js';
import { HASHTAG_SETS, BASE_HASHTAGS } from '../data/hashtags.js';
import { CATEGORIES } from '../data/category.js';

import { TEMPLATES } from '../data/templates.js';

// Re-export for compatibility
export { TITLES, HASHTAG_SETS, CATEGORIES, TEMPLATES };

// ============================================================
// DYNAMIC TITLE GENERATION HELPERS
// ============================================================

/**
 * Get a random keyword from a category option
 */
function getRandomKeyword(categoryKey, optionKey) {
	const category = CATEGORIES[categoryKey];
	if (!category) return '';
	const option = category.options[optionKey];
	if (!option || !option.keywords || option.keywords.length === 0) return '';
	return option.keywords[Math.floor(Math.random() * option.keywords.length)];
}

/**
 * Get a random option key from a category
 */
function getRandomOptionKey(categoryKey) {
	const category = CATEGORIES[categoryKey];
	if (!category) return null;
	const keys = Object.keys(category.options);
	if (keys.length === 0) return null;
	return keys[Math.floor(Math.random() * keys.length)];
}

/**
 * Get categories covered by a template
 */
function getTemplateCoverage(template) {
	const matches = template.match(/\{([A-Z_]+)\}/g) || [];
	return matches.map((m) => m.replace(/[{}]/g, ''));
}

/**
 * Find best template that covers most of selected categories
 */
function findBestTemplate(selectedCategories) {
	const selectedKeys = Object.keys(selectedCategories);
	let bestTemplate = TEMPLATES[0];
	let bestScore = 0;

	for (const template of TEMPLATES) {
		const coverage = getTemplateCoverage(template);
		// Score = how many selected categories are covered
		const score = selectedKeys.filter((k) => coverage.includes(k)).length;
		if (score > bestScore) {
			bestScore = score;
			bestTemplate = template;
		}
	}

	return bestTemplate;
}

/**
 * Generate a title from template using selected categories
 * Ensures all selected filters are represented
 * Handles MULTIPLE selections within a category by combining keywords
 * @param {string} template - Template with {CATEGORY} placeholders
 * @param {Object} selectedCategories - { CATEGORY_KEY: [optionKey1, optionKey2], ... }
 * @returns {string} Generated title
 */
function generateTitleFromTemplate(template, selectedCategories = {}) {
	let result = template;
	const usedCategories = new Set();

	// Find all placeholders in template
	const placeholders = template.match(/\{([A-Z_]+)\}/g) || [];

	for (const placeholder of placeholders) {
		const categoryKey = placeholder.replace(/[{}]/g, '');
		let replacementText = '';

		// Check if user selected this category
		const selectedOptions = selectedCategories[categoryKey];

		if (selectedOptions && selectedOptions.length > 0) {
			// Handle multiple selections: Pick random keyword for EACH selected option
			// Limit to 3 to avoid overly long sentences
			const selectedKeysToUse = selectedOptions.slice(0, 3);
			const keywords = selectedKeysToUse
				.map((key) => getRandomKeyword(categoryKey, key))
				.filter((k) => k.length > 0);

			if (keywords.length > 0) {
				// Join multiple keywords with ' và ' for natural flow
				replacementText = keywords.join(' và ');
				usedCategories.add(categoryKey);
			}
		} else {
			// Randomly pick ONE option if not selected by user
			const randomOptKey = getRandomOptionKey(categoryKey);
			if (randomOptKey) {
				replacementText = getRandomKeyword(categoryKey, randomOptKey);
			}
		}

		// Replace placeholder with keyword(s)
		result = result.replace(placeholder, replacementText);
	}

	// Check if any selected categories were NOT used - append them
	const selectedKeys = Object.keys(selectedCategories);
	const unusedCategories = selectedKeys.filter((k) => !usedCategories.has(k));

	if (unusedCategories.length > 0) {
		// Append unused selections as natural phrases
		const extras = [];
		for (const categoryKey of unusedCategories) {
			const options = selectedCategories[categoryKey];
			if (options && options.length > 0) {
				// For unused categories, we also try to include all selected options
				const selectedKeysToUse = options.slice(0, 2); // Limit to 2 for extras
				const keywords = selectedKeysToUse
					.map((key) => getRandomKeyword(categoryKey, key))
					.filter((k) => k.length > 0);

				if (keywords.length > 0) {
					extras.push(keywords.join(' và '));
				}
			}
		}
		if (extras.length > 0) {
			// Remove trailing period, add extras, then period
			result = result.replace(/[.!?]+$/, '');
			result = result + ', ' + extras.join(', ') + '.';
		}
	}

	// Clean up formatting
	result = result.replace(/\s+/g, ' ').trim();
	result = result.replace(/\s+([,.?!])/g, '$1');
	result = result.replace(/([,.?!])\1+/g, '$1');
	result = result.replace(/, ,/g, ',');

	// Capitalize first letter
	if (result.length > 0) {
		result = result.charAt(0).toUpperCase() + result.slice(1);
	}

	return result;
}

/**
 * Generate hashtags directly from selected categories
 * Always includes #xuhuong #fyp + 3 specific tags = exactly 5 total
 * @param {Object} selectedCategories - { CATEGORY_KEY: [optionKey1, optionKey2], ... }
 * @returns {string} Hashtag string (exactly 5 tags, always starts with #xuhuong #fyp)
 */
function generateHashtagsFromSelections(selectedCategories) {
	// Base tags - ALWAYS included
	const REQUIRED_TAGS = ['#xuhuong', '#fyp'];

	// Fallback trending tags for when few filters selected
	const FALLBACK_TAGS = [
		'#gauxinh',
		'#dance',
		'#trend',
		'#body',
		'#visual',
		'#sexy',
		'#hot',
		'#girl',
	];

	// Collect hashtags from selected options
	const categoryTags = [];
	for (const [categoryKey, optionKeys] of Object.entries(selectedCategories)) {
		const category = CATEGORIES[categoryKey];
		if (!category) continue;

		const keys = Array.isArray(optionKeys) ? optionKeys : [optionKeys];
		for (const optionKey of keys) {
			const option = category.options[optionKey];
			if (option && option.hashtags && option.hashtags.length > 0) {
				// Pick 1 random hashtag from this option
				const tag =
					option.hashtags[Math.floor(Math.random() * option.hashtags.length)];
				// Skip if already in required or already collected
				if (!REQUIRED_TAGS.includes(tag) && !categoryTags.includes(tag)) {
					categoryTags.push(tag);
				}
			}
		}
	}

	// Shuffle category tags for variety
	categoryTags.sort(() => Math.random() - 0.5);

	// Need exactly 3 more tags (total 5 = 2 required + 3 specific)
	let specificTags = categoryTags.slice(0, 3);

	// If not enough, fill with fallback
	if (specificTags.length < 3) {
		const shuffledFallback = [...FALLBACK_TAGS].sort(() => Math.random() - 0.5);
		for (const tag of shuffledFallback) {
			if (specificTags.length >= 3) break;
			if (!specificTags.includes(tag)) {
				specificTags.push(tag);
			}
		}
	}

	// Return exactly 5 hashtags: #xuhuong #fyp + 3 specific
	return [...REQUIRED_TAGS, ...specificTags].join(' ');
}

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
	if (!arr || arr.length === 0) return '';
	return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Find which category options are matched in a title
 */
function findMatchedOptions(title) {
	const lowerTitle = title.toLowerCase();
	const matches = {};

	for (const [categoryKey, category] of Object.entries(CATEGORIES)) {
		for (const [optionKey, option] of Object.entries(category.options)) {
			if (option.keywords) {
				for (const keyword of option.keywords) {
					if (lowerTitle.includes(keyword.toLowerCase())) {
						if (!matches[categoryKey]) matches[categoryKey] = [];
						if (!matches[categoryKey].includes(optionKey)) {
							matches[categoryKey].push(optionKey);
						}
						break;
					}
				}
			}
		}
	}

	return matches;
}
/**
 * Generate hashtags that match the content of a title
 * @param {string} title - The title to generate hashtags for
 * @returns {string} Hashtag string
 */
function generateMatchingHashtags(title) {
	const matches = findMatchedOptions(title);
	const hashtags = new Set();

	// Add hashtags based on matched categories
	for (const [categoryKey, optionKeys] of Object.entries(matches)) {
		const category = CATEGORIES[categoryKey];
		if (!category) continue;

		for (const optionKey of optionKeys) {
			const option = category.options[optionKey];
			if (option && option.hashtags && Array.isArray(option.hashtags)) {
				// Pick 1-2 random hashtags from this option
				const count = Math.min(2, option.hashtags.length);
				for (let i = 0; i < count; i++) {
					hashtags.add(random(option.hashtags));
				}
			}
		}
	}

	// If no matches found, use random hashtag set
	if (hashtags.size === 0) {
		return random(HASHTAG_SETS);
	}

	// Limit to 3 category-specific hashtags (total 5 with base)
	const specificTags = Array.from(hashtags).slice(0, 3).join(' ');
	const base = BASE_HASHTAGS || '#xuhuong #fyp';
	return `${base} ${specificTags}`.trim();
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
			hashtags: generateMatchingHashtags(title),
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
 * Generate content based on selected categories - DYNAMIC GENERATION
 * Generates titles on-the-fly using templates and selected filter options.
 * @param {Object} selectedCategories - e.g. { ROLE: ['TEACHER'], OUTFIT: ['NURSE_UNIFORM'], THEME: ['COSPLAY'] }
 * @param {number} count - Number of options to generate (default: 5)
 * @returns {Array<{title: string, hashtags: string}>}
 */
export function generateContentFromCategories(selectedCategories, count = 5) {
	// If no valid selections, fall back to random from static titles
	if (!selectedCategories || Object.keys(selectedCategories).length === 0) {
		return generateContentOptions(count);
	}

	const options = [];
	const usedTitles = new Set();
	const maxAttempts = count * 15; // More attempts for variety
	let attempts = 0;

	// Get templates sorted by coverage of selected categories
	const selectedKeys = Object.keys(selectedCategories);
	const sortedTemplates = [...TEMPLATES].sort((a, b) => {
		const aCoverage = getTemplateCoverage(a).filter((k) =>
			selectedKeys.includes(k)
		).length;
		const bCoverage = getTemplateCoverage(b).filter((k) =>
			selectedKeys.includes(k)
		).length;
		return bCoverage - aCoverage; // Higher coverage first
	});

	while (options.length < count && attempts < maxAttempts) {
		attempts++;

		// Pick template - prioritize high coverage ones
		const templateIndex = Math.floor(
			Math.random() * Math.min(5, sortedTemplates.length)
		);
		const template = sortedTemplates[templateIndex] || sortedTemplates[0];

		// Generate title using selected categories
		const title = generateTitleFromTemplate(template, selectedCategories);

		// Skip if too short or duplicate
		if (title.length < 20 || usedTitles.has(title)) {
			continue;
		}

		usedTitles.add(title);

		// Generate hashtags directly from selections
		const hashtags = generateHashtagsFromSelections(selectedCategories);

		options.push({ title, hashtags });
	}

	// If still not enough, fill with more attempts using different templates
	if (options.length < count) {
		for (let i = 0; i < TEMPLATES.length && options.length < count; i++) {
			const template = TEMPLATES[i];
			const title = generateTitleFromTemplate(template, selectedCategories);

			if (title.length >= 20 && !usedTitles.has(title)) {
				usedTitles.add(title);
				options.push({
					title,
					hashtags: generateHashtagsFromSelections(selectedCategories),
				});
			}
		}
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
