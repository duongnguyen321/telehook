/**
 * Script to filter content and output only those matching >=2 categories
 * Run with: node scripts/filter-content.js > filtered-content.json
 */

import { TITLES, DESCRIPTIONS, CATEGORIES } from '../src/services/ai.js';

const MIN_CATEGORIES_REQUIRED = 3;

// Collect all keywords by category
const categoryKeywords = {};
for (const [catKey, catDef] of Object.entries(CATEGORIES)) {
	const allKeywords = [];
	for (const [, optDef] of Object.entries(catDef.options)) {
		if (optDef.keywords && optDef.keywords.length > 0) {
			allKeywords.push(...optDef.keywords.map((k) => k.toLowerCase()));
		}
	}
	categoryKeywords[catKey] = [...new Set(allKeywords)];
}

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

// Filter TITLES
const filteredTitles = TITLES.filter((title) => {
	const matches = countCategoryMatches(title);
	return matches.length >= MIN_CATEGORIES_REQUIRED;
});

// Filter DESCRIPTIONS
const filteredDescs = DESCRIPTIONS.filter((desc) => {
	const matches = countCategoryMatches(desc);
	return matches.length >= MIN_CATEGORIES_REQUIRED;
});

console.error(`=== FILTERING RESULTS ===`);
console.error(
	`Titles: ${TITLES.length} → ${filteredTitles.length} (removed ${
		TITLES.length - filteredTitles.length
	})`
);
console.error(
	`Descriptions: ${DESCRIPTIONS.length} → ${filteredDescs.length} (removed ${
		DESCRIPTIONS.length - filteredDescs.length
	})`
);

// Output as JS format for easy copy-paste
console.log('// === FILTERED TITLES ===');
console.log('export const TITLES = [');
filteredTitles.forEach((t) => console.log(`\t'${t.replace(/'/g, "\\'")}',`));
console.log('];');

console.log('\n// === FILTERED DESCRIPTIONS ===');
console.log('export const DESCRIPTIONS = [');
filteredDescs.forEach((d) => console.log(`\t'${d.replace(/'/g, "\\'")}',`));
console.log('];');
