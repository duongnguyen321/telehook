/**
 * Content Generation Routes
 * API endpoints for generating SEO-optimized titles and hashtags
 */

import express from 'express';
import { authMiddleware } from './auth.js';
import { CATEGORIES } from '../../data/category.js';
import { TEMPLATES } from '../../data/templates.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Get all available categories for UI rendering
 */
router.get('/categories', (req, res) => {
	const categories = Object.entries(CATEGORIES).map(([key, cat]) => ({
		key,
		name: cat.name,
		emoji: cat.emoji,
		singleChoice: cat.singleChoice || false,
		options: Object.entries(cat.options).map(([optKey, opt]) => ({
			key: optKey,
			label: opt.label,
		})),
	}));

	res.json({ categories });
});

/**
 * Generate content from selected categories
 * POST body: { categories: { ROLE: ['TEACHER'], OUTFIT: ['BIKINI'] }, count: 5 }
 */
router.post('/generate', (req, res) => {
	const { categories: selectedCategories = {}, count = 5 } = req.body;

	const results = generateContentFromCategories(
		selectedCategories,
		Math.min(count, 10)
	);

	res.json({ results });
});

// ============================================================
// CONTENT GENERATION FUNCTIONS (from ai.js logic)
// ============================================================

function getRandomKeyword(categoryKey, optionKey) {
	const category = CATEGORIES[categoryKey];
	if (!category) return '';
	const option = category.options[optionKey];
	if (!option || !option.keywords || option.keywords.length === 0) return '';
	return option.keywords[Math.floor(Math.random() * option.keywords.length)];
}

function getRandomOptionKey(categoryKey) {
	const category = CATEGORIES[categoryKey];
	if (!category) return null;
	const keys = Object.keys(category.options);
	if (keys.length === 0) return null;
	return keys[Math.floor(Math.random() * keys.length)];
}

function getTemplateCoverage(template) {
	const matches = template.match(/\{([A-Z_]+)\}/g) || [];
	return matches.map((m) => m.replace(/[{}]/g, ''));
}

function generateTitleFromTemplate(template, selectedCategories = {}) {
	let result = template;
	const usedCategories = new Set();

	const placeholders = template.match(/\{([A-Z_]+)\}/g) || [];

	for (const placeholder of placeholders) {
		const categoryKey = placeholder.replace(/[{}]/g, '');
		let replacementText = '';

		const selectedOptions = selectedCategories[categoryKey];
		const categoryObject = CATEGORIES[categoryKey];

		if (selectedOptions && selectedOptions.length > 0) {
			if (categoryObject && categoryObject.singleChoice) {
				const optionKey =
					selectedOptions[Math.floor(Math.random() * selectedOptions.length)];
				replacementText = getRandomKeyword(categoryKey, optionKey);
				usedCategories.add(categoryKey);
			} else {
				const selectedKeysToUse = selectedOptions.slice(0, 3);
				const keywords = selectedKeysToUse
					.map((key) => getRandomKeyword(categoryKey, key))
					.filter((k) => k.length > 0);

				if (keywords.length > 0) {
					replacementText = keywords.join(' và ');
					usedCategories.add(categoryKey);
				}
			}
		} else {
			const randomOptKey = getRandomOptionKey(categoryKey);
			if (randomOptKey) {
				replacementText = getRandomKeyword(categoryKey, randomOptKey);
			}
		}

		result = result.replace(placeholder, replacementText);
	}

	const selectedKeys = Object.keys(selectedCategories);
	const unusedCategories = selectedKeys.filter((k) => !usedCategories.has(k));

	if (unusedCategories.length > 0) {
		const extras = [];
		for (const categoryKey of unusedCategories) {
			const options = selectedCategories[categoryKey];
			if (options && options.length > 0) {
				const selectedKeysToUse = options.slice(0, 2);
				const keywords = selectedKeysToUse
					.map((key) => getRandomKeyword(categoryKey, key))
					.filter((k) => k.length > 0);

				if (keywords.length > 0) {
					extras.push(keywords.join(' và '));
				}
			}
		}
		if (extras.length > 0) {
			result = result.replace(/[.!?]+$/, '');
			result = result + ', ' + extras.join(', ') + '.';
		}
	}

	result = result.replace(/\s+/g, ' ').trim();
	result = result.replace(/\s+([,.?!])/g, '$1');
	result = result.replace(/([,.?!])\1+/g, '$1');
	result = result.replace(/, ,/g, ',');

	if (result.length > 0) {
		result = result.charAt(0).toUpperCase() + result.slice(1);
	}

	return result;
}

function generateHashtagsFromSelections(selectedCategories) {
	const REQUIRED_TAGS = ['#xuhuong', '#fyp'];
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

	const categoryTags = [];
	for (const [categoryKey, optionKeys] of Object.entries(selectedCategories)) {
		const category = CATEGORIES[categoryKey];
		if (!category) continue;

		const keys = Array.isArray(optionKeys) ? optionKeys : [optionKeys];
		for (const optionKey of keys) {
			const option = category.options[optionKey];
			if (option && option.hashtags && option.hashtags.length > 0) {
				const tag =
					option.hashtags[Math.floor(Math.random() * option.hashtags.length)];
				if (!REQUIRED_TAGS.includes(tag) && !categoryTags.includes(tag)) {
					categoryTags.push(tag);
				}
			}
		}
	}

	categoryTags.sort(() => Math.random() - 0.5);

	let specificTags = categoryTags.slice(0, 3);

	if (specificTags.length < 3) {
		const shuffledFallback = [...FALLBACK_TAGS].sort(() => Math.random() - 0.5);
		for (const tag of shuffledFallback) {
			if (specificTags.length >= 3) break;
			if (!specificTags.includes(tag)) {
				specificTags.push(tag);
			}
		}
	}

	return [...REQUIRED_TAGS, ...specificTags].join(' ');
}

function generateContentFromCategories(selectedCategories = {}, count = 5) {
	const options = [];
	const usedTitles = new Set();
	const maxAttempts = count * 15;
	let attempts = 0;

	const selectedKeys = Object.keys(selectedCategories);
	const sortedTemplates = [...TEMPLATES].sort((a, b) => {
		const aCoverage = getTemplateCoverage(a).filter((k) =>
			selectedKeys.includes(k)
		).length;
		const bCoverage = getTemplateCoverage(b).filter((k) =>
			selectedKeys.includes(k)
		).length;
		return bCoverage - aCoverage;
	});

	while (options.length < count && attempts < maxAttempts) {
		attempts++;

		const templateIndex = Math.floor(
			Math.random() * Math.min(5, sortedTemplates.length)
		);
		const template = sortedTemplates[templateIndex] || sortedTemplates[0];

		const title = generateTitleFromTemplate(template, selectedCategories);

		if (title.length < 20 || usedTitles.has(title)) {
			continue;
		}

		usedTitles.add(title);

		const hashtags = generateHashtagsFromSelections(selectedCategories);

		options.push({ title, hashtags });
	}

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

export default router;
