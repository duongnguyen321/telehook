/**
 * Script to analyze content filter coverage with threshold 4
 * Identifies titles/descriptions that match only <4 categories
 * Run with: node scripts/analyze-filter-coverage-4.js
 */

import { TITLES, DESCRIPTIONS, CATEGORIES } from '../src/services/ai.js';

const MIN_CATEGORIES_REQUIRED = 4; // Minimum number of categories a content should match

console.log('=== FILTER COVERAGE ANALYSIS (≥4 filters) ===\n');

// Collect all keywords by category
const categoryKeywords = {};
for (const [catKey, catDef] of Object.entries(CATEGORIES)) {
	const allKeywords = [];
	for (const [, optDef] of Object.entries(catDef.options)) {
		if (optDef.keywords && optDef.keywords.length > 0) {
			allKeywords.push(...optDef.keywords.map((k) => k.toLowerCase()));
		}
	}
	categoryKeywords[catKey] = [...new Set(allKeywords)]; // Remove duplicates
}

console.log('Categories loaded:', Object.keys(categoryKeywords).length);

// Function to count how many categories a content matches
function countCategoryMatches(content) {
	const lowerContent = content.toLowerCase();
	const matchedCategories = [];

	for (const [catKey, keywords] of Object.entries(categoryKeywords)) {
		const hasMatch = keywords.some((kw) => lowerContent.includes(kw));
		if (hasMatch) {
			matchedCategories.push(catKey);
		}
	}

	return matchedCategories;
}

// Analyze TITLES
console.log('\n=== ANALYZING TITLES ===\n');

const titleAnalysis = TITLES.map((title, index) => {
	const matches = countCategoryMatches(title);
	return { index, title, matches, count: matches.length };
});

// Sort by match count (ascending - worst first)
titleAnalysis.sort((a, b) => a.count - b.count);

// Titles with only <4 category match
const poorTitles = titleAnalysis.filter(
	(t) => t.count < MIN_CATEGORIES_REQUIRED
);
const goodTitles = titleAnalysis.filter(
	(t) => t.count >= MIN_CATEGORIES_REQUIRED
);

console.log(`Total Titles: ${TITLES.length}`);
console.log(
	`Poor Coverage (< ${MIN_CATEGORIES_REQUIRED} categories): ${poorTitles.length}`
);
console.log(
	`Good Coverage (>= ${MIN_CATEGORIES_REQUIRED} categories): ${goodTitles.length}`
);
console.log(
	`Coverage Rate: ${((goodTitles.length / TITLES.length) * 100).toFixed(1)}%`
);

console.log('\n--- Titles with POOR coverage (<4 categories) ---');
poorTitles.forEach(({ title, matches, count }) => {
	console.log(`  [${count}] "${title}" → [${matches.join(', ')}]`);
});

// Analyze DESCRIPTIONS
console.log('\n=== ANALYZING DESCRIPTIONS ===\n');

const descAnalysis = DESCRIPTIONS.map((desc, index) => {
	const matches = countCategoryMatches(desc);
	return { index, desc, matches, count: matches.length };
});

descAnalysis.sort((a, b) => a.count - b.count);

const poorDescs = descAnalysis.filter((d) => d.count < MIN_CATEGORIES_REQUIRED);
const goodDescs = descAnalysis.filter(
	(d) => d.count >= MIN_CATEGORIES_REQUIRED
);

console.log(`Total Descriptions: ${DESCRIPTIONS.length}`);
console.log(
	`Poor Coverage (< ${MIN_CATEGORIES_REQUIRED} categories): ${poorDescs.length}`
);
console.log(
	`Good Coverage (>= ${MIN_CATEGORIES_REQUIRED} categories): ${goodDescs.length}`
);
console.log(
	`Coverage Rate: ${((goodDescs.length / DESCRIPTIONS.length) * 100).toFixed(
		1
	)}%`
);

console.log('\n--- Descriptions with POOR coverage (<4 categories) ---');
poorDescs.forEach(({ desc, matches, count }) => {
	console.log(`  [${count}] "${desc}" → [${matches.join(', ')}]`);
});

// Summary
console.log('\n=== SUMMARY ===');
console.log(`\nTitles:`);
console.log(`  - Total: ${TITLES.length}`);
console.log(
	`  - Poor (< ${MIN_CATEGORIES_REQUIRED} cats): ${poorTitles.length} (${(
		(poorTitles.length / TITLES.length) *
		100
	).toFixed(1)}%)`
);
console.log(
	`  - Good (>= ${MIN_CATEGORIES_REQUIRED} cats): ${goodTitles.length} (${(
		(goodTitles.length / TITLES.length) *
		100
	).toFixed(1)}%)`
);

console.log(`\nDescriptions:`);
console.log(`  - Total: ${DESCRIPTIONS.length}`);
console.log(
	`  - Poor (< ${MIN_CATEGORIES_REQUIRED} cats): ${poorDescs.length} (${(
		(poorDescs.length / DESCRIPTIONS.length) *
		100
	).toFixed(1)}%)`
);
console.log(
	`  - Good (>= ${MIN_CATEGORIES_REQUIRED} cats): ${goodDescs.length} (${(
		(goodDescs.length / DESCRIPTIONS.length) *
		100
	).toFixed(1)}%)`
);
