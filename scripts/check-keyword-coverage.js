/**
 * Script to check keyword coverage in TITLES and DESCRIPTIONS
 * Run with: node scripts/check-keyword-coverage.js
 */

import { TITLES, DESCRIPTIONS, CATEGORIES } from '../src/services/ai.js';

console.log('=== KEYWORD COVERAGE ANALYSIS ===\n');

// Combine all content for searching
// Lowercase for checking
const allContent = [...TITLES, ...DESCRIPTIONS]
	.map((t) => t.toLowerCase())
	.join('\n');

const missingKeywords = {};
const foundKeywords = {};
let totalKeywords = 0;
let coveredKeywords = 0;

console.log(
	`Analyzing ${TITLES.length} titles and ${DESCRIPTIONS.length} descriptions...`
);

// Iterate through all categories and their options
for (const [catKey, catDef] of Object.entries(CATEGORIES)) {
	console.log(`\nChecking Category: ${catDef.name} (${catKey})`);

	for (const [optKey, optDef] of Object.entries(catDef.options)) {
		const keywords = optDef.keywords || [];
		if (keywords.length === 0) continue;

		const found = [];
		const missing = [];

		for (const kw of keywords) {
			totalKeywords++;
			// Simple inclusion check
			if (allContent.includes(kw.toLowerCase())) {
				found.push(kw);
				coveredKeywords++;
			} else {
				missing.push(kw);
			}
		}

		const coveragePct = Math.round((found.length / keywords.length) * 100);
		const statusIcon =
			coveragePct === 100 ? '✅' : coveragePct === 0 ? '❌' : '⚠️';

		console.log(
			`  ${statusIcon} [${optKey}] ${optDef.label}: ${found.length}/${keywords.length} keywords found (${coveragePct}%)`
		);

		if (missing.length > 0) {
			console.log(`      Missing: ${missing.join(', ')}`);
			// Store global missing stats
			if (!missingKeywords[catKey]) missingKeywords[catKey] = [];
			missingKeywords[catKey].push(...missing);
		}
	}
}

console.log('\n=== SUMMARY ===');
console.log(`Total Keywords: ${totalKeywords}`);
console.log(`Covered: ${coveredKeywords}`);
console.log(`Missing: ${totalKeywords - coveredKeywords}`);
console.log(
	`Total Coverage: ${((coveredKeywords / totalKeywords) * 100).toFixed(1)}%`
);

if (totalKeywords - coveredKeywords > 0) {
	console.log('\nTop Missing Keywords by Category:');
	for (const [cat, kws] of Object.entries(missingKeywords)) {
		console.log(`  ${cat}: ${kws.length} missing`);
	}
}
