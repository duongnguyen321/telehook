#!/usr/bin/env node
/**
 * Script sinh câu và hashtags từ các filter categories
 * Phiên bản 3.0: Narrative & Emotional Context
 *
 * Output:
 * - src/data/titles.js: 800 câu title
 * - src/data/hashtags.js: Hashtags theo category
 *
 * Run: node scripts/generate-combined-sentences.js
 * Preview: node scripts/generate-combined-sentences.js --preview
 */

import { CATEGORIES } from '../src/data/category.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isPreview = process.argv.includes('--preview');

// ============================================================
// SENTENCE TEMPLATES - Narrative & Natural Flow
// ============================================================

const TEMPLATES = [
	// Full coverage templates (9-11 categories) with PEOPLE
	'{CONTEXT}, {PEOPLE} {ROLE} {EMOTION} mặc {OUTFIT} {ACTIVITY} {LOCATION}, khoe {FOCUS} {THEME} với {HAIR}.',
	'{PEOPLE} {ROLE} với {HAIR} {EMOTION} diện {OUTFIT} {POSE} {LOCATION}, {ACTIVITY} khoe {FOCUS} {THEME} {CONTEXT}.',
	'{CONTEXT}, {PEOPLE} {ROLE} {EMOTION} {POSE} {LOCATION}, khoe {FOCUS} {THEME} với {OUTFIT}.',

	// 8-9 categories with PEOPLE
	'{CONTEXT}, {PEOPLE} {ROLE} {EMOTION} mặc {OUTFIT} {ACTIVITY} {LOCATION}, {POSE} khoe {FOCUS}.',
	'{PEOPLE} {ROLE} với {HAIR} {EMOTION} {POSE} {LOCATION}, khoe {FOCUS} {THEME}.',
	'{CONTEXT}, {PEOPLE} {ROLE} {HAIR} diện {OUTFIT} {THEME}, {EMOTION} {ACTIVITY} khoe {FOCUS}.',

	// 7-8 categories
	'{CONTEXT}, {ROLE} {EMOTION} mặc {OUTFIT} {ACTIVITY} {LOCATION}, {POSE} khoe {FOCUS}.',
	'{ROLE} với {HAIR} {EMOTION} {POSE} {LOCATION}, khoe {FOCUS} {THEME}.',
	'{CONTEXT}, {ROLE} {HAIR} diện {OUTFIT} {THEME}, {EMOTION} {ACTIVITY} khoe {FOCUS}.',

	// 6-7 categories
	'{CONTEXT}, {ROLE} {EMOTION} mặc {OUTFIT} {ACTIVITY} {LOCATION}.',
	'{CONTEXT}, {ROLE} {EMOTION} diện {OUTFIT} rồi {ACTIVITY}.',
	'{CONTEXT}, {ROLE} cảm thấy {EMOTION} khi {ACTIVITY} {LOCATION}.',
	'{CONTEXT}, {ROLE} với {HAIR} diện {OUTFIT} {THEME}, {EMOTION} khoe {FOCUS}.',
	'Góc nhìn {THEME}: {ROLE} {EMOTION} với {FOCUS} trong bộ {OUTFIT} {LOCATION}.',
	'{PEOPLE} {ROLE} {EMOTION} {ACTIVITY} {LOCATION}, khoe {FOCUS} {THEME}.',

	// 5-6 categories
	'{CONTEXT}, {ROLE} {HAIR} tự tin khoe {FOCUS} {THEME}.',
	'{CONTEXT}, {ROLE} {EMOTION} {POSE} {LOCATION}.',
	'{ROLE} với {HAIR} đang {POSE} {LOCATION}, {EMOTION} khoe {FOCUS}.',
	'{CONTEXT}, {ROLE} {EMOTION} gửi {FOCUS} {THEME} từ {POSE} {LOCATION}.',
	'{CONTEXT}, {ROLE} {ACTIVITY} {LOCATION}, {EMOTION} khoe {FOCUS} {THEME}.',
	'{PEOPLE} {ROLE} {EMOTION} {ACTIVITY} khoe {FOCUS} {CONTEXT}.',

	// 4-5 categories
	'{ROLE} {EMOTION} {ACTIVITY} để lộ {FOCUS} {CONTEXT}.',
	'{ROLE} mặc {OUTFIT} {ACTIVITY}, cảm giác thật {EMOTION} {LOCATION}.',
	'{CONTEXT}, {ROLE} {HAIR} {EMOTION} {ACTIVITY}.',
	'{ROLE} {THEME} với {FOCUS} {LOCATION} {CONTEXT}.',
	'{OUTFIT} {THEME} của {ROLE} {EMOTION} quá {CONTEXT}.',
	'{CONTEXT}, thật {EMOTION} khi {ROLE} {HAIR} {POSE} {LOCATION}.',
	'{CONTEXT}, {ROLE} với {HAIR} chỉ muốn {ACTIVITY}.',
	'{ROLE} {EMOTION} check-in {LOCATION} với {OUTFIT} và {HAIR} {THEME}.',
];

// ============================================================
// HASHTAG EXTRACTION - Read from CATEGORIES
// ============================================================

function getHashtagsForOption(categoryKey, optionKey) {
	const category = CATEGORIES[categoryKey];
	if (!category) return [];
	const option = category.options[optionKey];
	if (!option || !option.hashtags) return [];
	return option.hashtags;
}

// Base hashtags always included (2 required)
const BASE_HASHTAGS = '#xuhuong #fyp';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function randomItem(arr) {
	if (!arr || arr.length === 0) return '';
	return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomPhrase(categoryKey, optionKey) {
	const category = CATEGORIES[categoryKey];
	if (!category) return '';

	const option = category.options[optionKey];
	if (!option) return '';

	if (!option.keywords || option.keywords.length === 0) return '';

	return randomItem(option.keywords);
}

function getOptionKeys(categoryKey) {
	const category = CATEGORIES[categoryKey];
	if (!category) return [];
	return Object.keys(category.options);
}

function getTemplatePlaceholders(template) {
	const matches = template.match(/\{([A-Z_]+)\}/g) || [];
	return matches.map((m) => m.replace(/[{}]/g, ''));
}

function capitalize(str) {
	if (!str || str.length === 0) return str;
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateSentence(template) {
	let sentence = template;
	const placeholders = getTemplatePlaceholders(template);

	for (const placeholder of placeholders) {
		const optionKeys = getOptionKeys(placeholder);
		if (optionKeys.length > 0) {
			const optionKey = randomItem(optionKeys);
			const phrase = getRandomPhrase(placeholder, optionKey);
			sentence = sentence.replace(
				new RegExp(`\\{${placeholder}\\}`, 'g'),
				phrase
			);
		}
	}

	// Clean up formatting
	sentence = sentence.replace(/\{[A-Z_]+\}/g, '');
	sentence = sentence.replace(/\s+/g, ' ').trim();
	sentence = sentence.replace(/\s+([,.?!])/g, '$1');
	sentence = sentence.replace(/([,.?!])\1+/g, '$1');

	// Capitalize first letter of each sentence part
	sentence = capitalize(sentence);

	// Also capitalize after ". " or "? " or "! "
	sentence = sentence.replace(
		/([.?!]\s+)([a-záàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ])/gi,
		(match, p1, p2) => p1 + p2.toUpperCase()
	);

	return sentence;
}

function generateAllCombinations(maxCount = 2000) {
	const sentences = new Set();
	let iterations = 0;
	const maxIterations = maxCount * 100;

	while (sentences.size < maxCount && iterations < maxIterations) {
		iterations++;

		const template = randomItem(TEMPLATES);
		const sentence = generateSentence(template);

		// Only require minimum length, no max limit
		if (sentence.length > 20) {
			sentences.add(sentence);
		}
	}

	return Array.from(sentences);
}

function countCategoryMatches(sentence) {
	const lowerSentence = sentence.toLowerCase();
	const matchedCategories = new Set();

	for (const [categoryKey, category] of Object.entries(CATEGORIES)) {
		for (const option of Object.values(category.options)) {
			if (option.keywords) {
				for (const keyword of option.keywords) {
					if (lowerSentence.includes(keyword.toLowerCase())) {
						matchedCategories.add(categoryKey);
						break;
					}
				}
			}
			if (matchedCategories.has(categoryKey)) break;
		}
	}

	return matchedCategories.size;
}

/**
 * Find which category options are matched in a sentence
 */
function findMatchedOptions(sentence) {
	const lowerSentence = sentence.toLowerCase();
	const matches = {};

	for (const [categoryKey, category] of Object.entries(CATEGORIES)) {
		for (const [optionKey, option] of Object.entries(category.options)) {
			if (option.keywords) {
				for (const keyword of option.keywords) {
					if (lowerSentence.includes(keyword.toLowerCase())) {
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
 * Generate hashtags based on matched categories
 */
function generateHashtagsForSentence(sentence) {
	const matches = findMatchedOptions(sentence);
	const hashtags = new Set();

	// Add hashtags based on matched categories (read from CATEGORIES)
	for (const [categoryKey, optionKeys] of Object.entries(matches)) {
		for (const optionKey of optionKeys) {
			const tags = getHashtagsForOption(categoryKey, optionKey);
			if (tags && tags.length > 0) {
				// Pick 1 random hashtag from this option
				hashtags.add(randomItem(tags));
			}
		}
	}

	// Limit to 3 category-specific hashtags (total 5 with base)
	const specificTags = Array.from(hashtags).slice(0, 3).join(' ');
	return `${BASE_HASHTAGS} ${specificTags}`.trim();
}

function displayCategoryInfo() {
	console.log('📂 Loaded Categories:\n');
	for (const [categoryKey, category] of Object.entries(CATEGORIES)) {
		const optionCount = Object.keys(category.options).length;
		console.log(`   ${category.emoji} ${categoryKey}: ${optionCount} options`);
	}
	console.log('');
}

// ============================================================
// GENERATE HASHTAGS FROM ACTUAL SENTENCES
// ============================================================

function generateHashtagSetsFromSentences(sentences) {
	const sets = new Set();

	// Generate hashtags for each sentence
	for (const sentence of sentences) {
		const hashtags = generateHashtagsForSentence(sentence);
		if (hashtags && hashtags.split(' ').length >= 4) {
			sets.add(hashtags);
		}
	}

	return Array.from(sets);
}

// ============================================================
// MAIN EXECUTION
// ============================================================

console.log('\n🔥 Generating narrative sentences (v3)...\n');

displayCategoryInfo();

const generatedSentences = generateAllCombinations(2000);

console.log(`📊 Generated raw: ${generatedSentences.length} sentences\n`);

// Analyze category coverage
const coverage = {};
for (const sentence of generatedSentences) {
	const matchCount = countCategoryMatches(sentence);
	coverage[matchCount] = (coverage[matchCount] || 0) + 1;
}

console.log('📈 Category match distribution:');
for (const [count, num] of Object.entries(coverage).sort(
	(a, b) => Number(b[0]) - Number(a[0])
)) {
	const bar = '█'.repeat(Math.min(50, Math.floor(num / 10)));
	console.log(`   ${count} categories: ${num} sentences ${bar}`);
}

// Filter for quality - keep ALL matching sentences
const qualitySentences = generatedSentences.filter(
	(s) => countCategoryMatches(s) >= 6
);

console.log(
	`\n✅ Selected top ${qualitySentences.length} sentences with ≥6 matches`
);

if (isPreview) {
	console.log('\n📝 Preview (first 20 sentences with hashtags):');
	for (const sentence of qualitySentences.slice(0, 20)) {
		const matches = countCategoryMatches(sentence);
		const hashtags = generateHashtagsForSentence(sentence);
		console.log(`   [${matches} cat] ${sentence}`);
		console.log(`   📌 ${hashtags}\n`);
	}
	console.log('\n⚠️  Preview mode - no file output');
	process.exit(0);
}

// Write titles.js
const titlesPath = path.join(__dirname, '../src/data/titles.js');
const titlesContent = `/**
 * Generated Titles
 * ${qualitySentences.length} sentences - Auto-generated on ${
	new Date().toISOString().split('T')[0]
}
 * Narrative & Diverse Filter Style
 */

export const TITLES = [
${qualitySentences.map((s) => `\t'${s.replace(/'/g, "\\'")}',`).join('\n')}
];
`;
fs.writeFileSync(titlesPath, titlesContent, 'utf8');
console.log(`\n✅ Written titles to: ${titlesPath}`);

// Generate and write hashtags.js based on actual sentences
const hashtagSets = generateHashtagSetsFromSentences(qualitySentences);
const hashtagsPath = path.join(__dirname, '../src/data/hashtags.js');
const hashtagsContent = `/**
 * Hashtag sets for TikTok videos
 * Auto-generated from category mapping on ${
		new Date().toISOString().split('T')[0]
 }
 * TẤT CẢ phải có #xuhuong #fyp (bắt buộc)
 */

export const HASHTAG_SETS = [
${hashtagSets.map((s) => `\t'${s}',`).join('\n')}
];

export const BASE_HASHTAGS = '${BASE_HASHTAGS}';
`;
fs.writeFileSync(hashtagsPath, hashtagsContent, 'utf8');
console.log(`✅ Written hashtags to: ${hashtagsPath}`);

console.log(`   Total titles: ${qualitySentences.length}`);
console.log(`   Total hashtag sets: ${hashtagSets.length}`);
console.log('\n');
