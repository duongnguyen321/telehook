/**
 * Script to analyze filter COMBINATION coverage
 * Identifies which filter option combinations have no matching content
 * Run with: node scripts/analyze-filter-combinations.js
 */

import { TITLES, DESCRIPTIONS, CATEGORIES } from '../src/services/ai.js';

console.log('=== FILTER COMBINATION COVERAGE ANALYSIS ===\n');

// Build keyword map for each category option
const optionKeywords = {};
for (const [catKey, catDef] of Object.entries(CATEGORIES)) {
	for (const [optKey, optDef] of Object.entries(catDef.options)) {
		const fullKey = `${catKey}.${optKey}`;
		optionKeywords[fullKey] = {
			category: catKey,
			option: optKey,
			label: optDef.label,
			keywords: (optDef.keywords || []).map((k) => k.toLowerCase()),
		};
	}
}

console.log('Total filter options:', Object.keys(optionKeywords).length);

// Function to check if content matches an option
function matchesOption(content, optData) {
	if (!optData.keywords || optData.keywords.length === 0) return false;
	const lowerContent = content.toLowerCase();
	return optData.keywords.some((kw) => lowerContent.includes(kw));
}

// Function to get all options a content matches
function getMatchingOptions(content) {
	const matches = [];
	for (const [fullKey, optData] of Object.entries(optionKeywords)) {
		if (matchesOption(content, optData)) {
			matches.push(fullKey);
		}
	}
	return matches;
}

// All content combined
const allContent = [...TITLES, ...DESCRIPTIONS];

console.log('Total content items:', allContent.length);

// Analyze coverage per option
console.log('\n=== COVERAGE PER FILTER OPTION ===\n');

const optionCoverage = {};
for (const [fullKey, optData] of Object.entries(optionKeywords)) {
	const matchCount = allContent.filter((c) => matchesOption(c, optData)).length;
	optionCoverage[fullKey] = matchCount;
}

// Group by category and show coverage
const categories = {};
for (const [fullKey, count] of Object.entries(optionCoverage)) {
	const [cat, opt] = fullKey.split('.');
	if (!categories[cat]) categories[cat] = [];
	categories[cat].push({ opt, count, label: optionKeywords[fullKey].label });
}

for (const [cat, options] of Object.entries(categories)) {
	console.log(`\n${cat}:`);
	options.sort((a, b) => a.count - b.count);
	for (const { opt, count, label } of options) {
		const status = count === 0 ? '❌ MISSING' : count < 5 ? '⚠️  LOW' : '✅';
		console.log(`  ${status} ${label}: ${count} items`);
	}
}

// Find options with zero or very low coverage
console.log('\n=== OPTIONS NEEDING MORE CONTENT ===\n');
const needsContent = Object.entries(optionCoverage)
	.filter(([, count]) => count < 5)
	.sort((a, b) => a[1] - b[1]);

for (const [fullKey, count] of needsContent) {
	const optData = optionKeywords[fullKey];
	console.log(
		`[${count}] ${optData.category}.${optData.option} (${optData.label})`
	);
	console.log(
		`    Keywords: ${optData.keywords.slice(0, 5).join(', ')}${
			optData.keywords.length > 5 ? '...' : ''
		}`
	);
}

// Summary
console.log('\n=== SUMMARY ===');
const totalOptions = Object.keys(optionCoverage).length;
const zeroOptions = Object.values(optionCoverage).filter((c) => c === 0).length;
const lowOptions = Object.values(optionCoverage).filter(
	(c) => c > 0 && c < 5
).length;
const goodOptions = Object.values(optionCoverage).filter((c) => c >= 5).length;

console.log(`Total Options: ${totalOptions}`);
console.log(`Zero Coverage: ${zeroOptions}`);
console.log(`Low Coverage (<5): ${lowOptions}`);
console.log(`Good Coverage (≥5): ${goodOptions}`);
