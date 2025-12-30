#!/usr/bin/env node
/**
 * Comprehensive Content Generator Script
 * Generates ALL possible combinations of categories (from 6 to max categories)
 * with all option variations within each category
 *
 * Usage:
 *   node scripts/generate-content.js                       # Generate all combinations, output to console
 *   node scripts/generate-content.js --write               # Generate all combinations and write to data files
 *   node scripts/generate-content.js --min 8               # Minimum 8 categories per combination
 *   node scripts/generate-content.js --max 1000            # Limit to 1000 total outputs
 *   node scripts/generate-content.js --categories          # List all available categories
 */

import { CATEGORIES } from '../src/data/category.js';
import { TEMPLATES } from '../src/data/templates.js';
import { TITLES } from '../src/data/titles.js';
import { HASHTAG_SETS } from '../src/data/hashtags.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get all category keys
 */
function getCategoryKeys() {
	return Object.keys(CATEGORIES);
}

/**
 * Get all option keys for a category
 */
function getOptionKeys(categoryKey) {
	const category = CATEGORIES[categoryKey];
	if (!category) return [];
	return Object.keys(category.options);
}

/**
 * Generate all k-combinations from an array
 */
function* combinations(array, k) {
	if (k === 0) {
		yield [];
		return;
	}
	if (array.length < k) return;

	const [first, ...rest] = array;

	// Include first element
	for (const combo of combinations(rest, k - 1)) {
		yield [first, ...combo];
	}

	// Exclude first element
	yield* combinations(rest, k);
}

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

// ============================================================
// CONTENT GENERATION FUNCTIONS
// ============================================================

/**
 * Generate a title from template using selected categories
 */
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

	// Append unused selected categories
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

	// Clean up formatting
	result = result.replace(/\s+/g, ' ').trim();
	result = result.replace(/\s+([,.?!])/g, '$1');
	result = result.replace(/([,.?!])\1+/g, '$1');
	result = result.replace(/, ,/g, ',');

	if (result.length > 0) {
		result = result.charAt(0).toUpperCase() + result.slice(1);
	}

	return result;
}

/**
 * Generate hashtags from selected categories
 */
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

/**
 * Generate random option selections for given category keys
 * @param {string[]} categoryKeys - Array of category keys to use
 * @param {number} optionsPerCategory - Max options to select per category (1-3)
 */
function generateRandomSelections(categoryKeys, optionsPerCategory = 1) {
	const selections = {};

	for (const catKey of categoryKeys) {
		const category = CATEGORIES[catKey];
		if (!category) continue;

		const optionKeys = Object.keys(category.options);
		if (optionKeys.length === 0) continue;

		// For singleChoice categories, always pick 1
		const maxPicks = category.singleChoice
			? 1
			: Math.min(optionsPerCategory, optionKeys.length);

		// Shuffle and pick random options
		const shuffled = [...optionKeys].sort(() => Math.random() - 0.5);
		selections[catKey] = shuffled.slice(0, maxPicks);
	}

	return selections;
}

/**
 * Generate content for a specific category combination with multiple variations
 */
function generateForCombination(
	categoryKeys,
	variationsPerCombo,
	usedTitles,
	usedHashtags
) {
	const results = [];

	for (let v = 0; v < variationsPerCombo; v++) {
		// Vary the number of options per category (1, 2, or 3)
		const optionsPerCategory = (v % 3) + 1;
		const selections = generateRandomSelections(
			categoryKeys,
			optionsPerCategory
		);

		// Pick a random template
		const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];

		const title = generateTitleFromTemplate(template, selections);

		// Skip if too short or duplicate
		if (title.length < 20 || usedTitles.has(title)) {
			continue;
		}

		usedTitles.add(title);

		// Generate hashtags
		let hashtags = generateHashtagsFromSelections(selections);
		let attempts = 0;
		while (usedHashtags.has(hashtags) && attempts < 5) {
			hashtags = generateHashtagsFromSelections(selections);
			attempts++;
		}
		usedHashtags.add(hashtags);

		results.push({ title, hashtags });
	}

	return results;
}

/**
 * Generate ALL possible combinations from minCategories to maxCategories
 * @param {Object} options - Generation options
 * @param {number} options.minCategories - Minimum number of categories (default: 6)
 * @param {number} options.maxResults - Maximum total results (default: Infinity)
 * @param {number} options.variationsPerCombo - Variations per combination (default: 3)
 */
function generateAllCombinations({
	minCategories = 6,
	maxResults = Infinity,
	variationsPerCombo = 3,
} = {}) {
	const categoryKeys = getCategoryKeys();
	const maxCategories = categoryKeys.length;

	console.log(`\n📊 Category Info:`);
	console.log(`   Total categories: ${maxCategories}`);
	console.log(`   Min combination size: ${minCategories}`);
	console.log(
		`   Max results: ${maxResults === Infinity ? 'Unlimited' : maxResults}`
	);
	console.log(`   Variations per combo: ${variationsPerCombo}\n`);

	// Include existing titles/hashtags to avoid duplicates
	const usedTitles = new Set(TITLES);
	const usedHashtags = new Set(HASHTAG_SETS);

	const allResults = [];
	let totalCombinations = 0;

	// Generate for each combination size from minCategories to maxCategories
	for (let size = minCategories; size <= maxCategories; size++) {
		if (allResults.length >= maxResults) break;

		let combosAtSize = 0;
		for (const combo of combinations(categoryKeys, size)) {
			if (allResults.length >= maxResults) break;

			const results = generateForCombination(
				combo,
				variationsPerCombo,
				usedTitles,
				usedHashtags
			);

			allResults.push(...results);
			combosAtSize++;
			totalCombinations++;

			// Progress update every 100 combinations
			if (totalCombinations % 100 === 0) {
				process.stdout.write(
					`\r   Processing... ${totalCombinations} combos, ${allResults.length} results`
				);
			}
		}

		console.log(
			`   Size ${size}: ${combosAtSize} combinations → ${allResults.length} total results`
		);
	}

	console.log(
		`\n✨ Generated ${allResults.length} unique titles from ${totalCombinations} combinations\n`
	);

	return allResults;
}

// ============================================================
// FILE I/O FUNCTIONS
// ============================================================

function writeToDataFiles(results) {
	const titlesPath = path.join(__dirname, '../src/data/titles.js');
	const hashtagsPath = path.join(__dirname, '../src/data/hashtags.js');

	let titlesContent = fs.readFileSync(titlesPath, 'utf-8');
	let hashtagsContent = fs.readFileSync(hashtagsPath, 'utf-8');

	const existingTitles = new Set(TITLES);
	const existingHashtags = new Set(HASHTAG_SETS);

	const newTitles = results
		.map((r) => r.title)
		.filter((t) => !existingTitles.has(t));

	const newHashtags = results
		.map((r) => r.hashtags)
		.filter((h) => !existingHashtags.has(h));

	// Remove duplicate new entries
	const uniqueNewTitles = [...new Set(newTitles)];
	const uniqueNewHashtags = [...new Set(newHashtags)];

	if (uniqueNewTitles.length === 0 && uniqueNewHashtags.length === 0) {
		console.log('⚠️ No new unique content to add (all duplicates).');
		return { titlesAdded: 0, hashtagsAdded: 0 };
	}

	// Update titles.js
	if (uniqueNewTitles.length > 0) {
		const newTitlesFormatted = uniqueNewTitles
			.map((t) => `\t'${t.replace(/'/g, "\\'")}',`)
			.join('\n');

		const titlesClosingIndex = titlesContent.lastIndexOf('];');
		if (titlesClosingIndex !== -1) {
			titlesContent =
				titlesContent.slice(0, titlesClosingIndex) +
				newTitlesFormatted +
				'\n' +
				titlesContent.slice(titlesClosingIndex);

			const totalTitles = TITLES.length + uniqueNewTitles.length;
			const date = new Date().toISOString().split('T')[0];
			titlesContent = titlesContent.replace(
				/\* \d+ sentences - Auto-generated on \d{4}-\d{2}-\d{2}/,
				`* ${totalTitles} sentences - Auto-generated on ${date}`
			);

			fs.writeFileSync(titlesPath, titlesContent);
		}
	}

	// Update hashtags.js
	if (uniqueNewHashtags.length > 0) {
		const newHashtagsFormatted = uniqueNewHashtags
			.map((h) => `\t'${h}',`)
			.join('\n');

		const hashtagsClosingIndex = hashtagsContent.lastIndexOf('];');
		if (hashtagsClosingIndex !== -1) {
			hashtagsContent =
				hashtagsContent.slice(0, hashtagsClosingIndex) +
				newHashtagsFormatted +
				'\n' +
				hashtagsContent.slice(hashtagsClosingIndex);

			fs.writeFileSync(hashtagsPath, hashtagsContent);
		}
	}

	return {
		titlesAdded: uniqueNewTitles.length,
		hashtagsAdded: uniqueNewHashtags.length,
	};
}

/**
 * Get all available categories for display
 */
function getCategories() {
	return Object.entries(CATEGORIES).map(([key, cat]) => ({
		key,
		name: cat.name,
		emoji: cat.emoji,
		singleChoice: cat.singleChoice || false,
		optionCount: Object.keys(cat.options).length,
		options: Object.entries(cat.options).map(([optKey, opt]) => ({
			key: optKey,
			label: opt.label,
		})),
	}));
}

// ============================================================
// CLI
// ============================================================

function main() {
	const args = process.argv.slice(2);

	const minCategories = args.includes('--min')
		? parseInt(args[args.indexOf('--min') + 1]) || 6
		: 6;

	const maxResults = args.includes('--max')
		? parseInt(args[args.indexOf('--max') + 1]) || Infinity
		: Infinity;

	const variationsPerCombo = args.includes('--variations')
		? parseInt(args[args.indexOf('--variations') + 1]) || 3
		: 3;

	const shouldWrite = args.includes('--write');
	const showCategories = args.includes('--categories');
	const asJson = args.includes('--json');

	if (showCategories) {
		const categories = getCategories();
		if (asJson) {
			console.log(JSON.stringify(categories, null, 2));
		} else {
			console.log('\n📚 Available Categories:\n');
			for (const cat of categories) {
				console.log(
					`${cat.emoji} ${cat.name} (${cat.key}) [${cat.optionCount} options]${
						cat.singleChoice ? ' [Single Choice]' : ''
					}`
				);
				for (const opt of cat.options) {
					console.log(`   - ${opt.label} (${opt.key})`);
				}
				console.log();
			}
			console.log(`Total: ${categories.length} categories\n`);
		}
		return;
	}

	console.log('🚀 Starting comprehensive content generation...');

	const results = generateAllCombinations({
		minCategories,
		maxResults,
		variationsPerCombo,
	});

	if (shouldWrite) {
		console.log('📝 Writing to data files...');
		const { titlesAdded, hashtagsAdded } = writeToDataFiles(results);
		console.log(`✅ Added ${titlesAdded} new titles to src/data/titles.js`);
		console.log(
			`✅ Added ${hashtagsAdded} new hashtags to src/data/hashtags.js`
		);
		console.log();
	}

	if (asJson) {
		console.log(JSON.stringify(results, null, 2));
	} else if (!shouldWrite) {
		// Show preview
		console.log('📋 Preview (first 10):\n');
		results.slice(0, 10).forEach((item, index) => {
			console.log(`${index + 1}. ${item.title}`);
			console.log(`   ${item.hashtags}`);
			console.log();
		});
		if (results.length > 10) {
			console.log(`... and ${results.length - 10} more.\n`);
		}
		console.log('💡 Use --write to save to data files\n');
	} else {
		// Show preview when writing
		console.log('📋 Sample of generated content:\n');
		results.slice(0, 5).forEach((item, index) => {
			console.log(`${index + 1}. ${item.title}`);
			console.log(`   ${item.hashtags}`);
			console.log();
		});
		if (results.length > 5) {
			console.log(`... and ${results.length - 5} more.\n`);
		}
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

// Export for API use
export { generateAllCombinations, getCategories };
