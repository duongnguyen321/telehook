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
	// 1. Storytelling (Bối cảnh + Nhân vật + Hành động + Địa điểm)
	'{CONTEXT}, {ROLE} {EMOTION} mặc {OUTFIT} {ACTIVITY} {LOCATION}.',
	'{CONTEXT}, {ROLE} {EMOTION} diện {OUTFIT} rồi {ACTIVITY}.',
	'{CONTEXT}, {ROLE} cảm thấy {EMOTION} khi {ACTIVITY} {LOCATION}.',

	// 2. Visual Focus (Trang phục + Điểm nhấn + Cảm xúc)
	'{CONTEXT}, {ROLE} diện {OUTFIT} {THEME}, {EMOTION} khoe {FOCUS}.',
	'Góc nhìn {THEME}: {ROLE} {EMOTION} với {FOCUS} trong bộ {OUTFIT} {LOCATION}.',
	'{CONTEXT}, {ROLE} tự tin khoe {FOCUS} {THEME}.',

	// 3. Invitation / Interaction (Mời gọi + Đối tượng)
	'{CONTEXT}, {ROLE} {EMOTION} muốn {ACTIVITY} {PEOPLE}.',
	'Anh có thích {ROLE} {EMOTION} mặc {OUTFIT} {ACTIVITY} {LOCATION} không?',
	'{CONTEXT}, {ROLE} {EMOTION} gửi {FOCUS} {THEME} {PEOPLE} xem nè.',

	// 4. Action Oriented (Hành động + Tư thế + Cảm xúc)
	'{CONTEXT}, {ROLE} {ACTIVITY} {LOCATION}, {EMOTION} khoe {FOCUS} {THEME}.',
	'{ROLE} {EMOTION} {ACTIVITY} để lộ {FOCUS} {CONTEXT}.',
	'{ROLE} mặc {OUTFIT} {ACTIVITY}, cảm giác thật {EMOTION} {LOCATION}.',

	// 5. Short & Punchy (Ngắn gọn, ấn tượng)
	'{CONTEXT}, {ROLE} {EMOTION} {ACTIVITY}.',
	'{ROLE} {THEME} với {FOCUS} {LOCATION} {CONTEXT}.',
	'{OUTFIT} {THEME} của {ROLE} {EMOTION} quá {CONTEXT}.',

	// 6. Confession / Mood
	'{CONTEXT}, thật {EMOTION} khi {ROLE} {ACTIVITY} {LOCATION}.',
	'{CONTEXT}, {ROLE} chỉ muốn {ACTIVITY} {PEOPLE} thôi.',
	'{ROLE} {EMOTION} check-in {LOCATION} với {OUTFIT} {THEME}.',
];

// ============================================================
// HASHTAG MAPPING - Based on category keywords
// ============================================================

const HASHTAG_MAPPING = {
	CONTEXT: {
		BREAK_TIME: ['#nghitrua', '#giogiaolao', '#vanphong'],
		HOME_ALONE: ['#onha', '#motminh', '#cuoisuan'],
		LATE_NIGHT: ['#demkhuya', '#midnight', '#khuya'],
		SECRET: ['#bimat', '#lenlut', '#riengtu'],
		JUST_BATHED: ['#tamxong', '#shower', '#fresh'],
		DRUNK: ['#chill', '#say', '#relaxing'],
		MORNING: ['#buoisang', '#morning', '#goodmorning'],
	},
	ROLE: {
		TEACHER: ['#cogiao', '#giaovien', '#teacher'],
		STUDENT: ['#nusinh', '#student', '#hocsinh'],
		NURSE: ['#yta', '#nurse', '#bacsi'],
		SECRETARY: ['#thuky', '#secretary', '#troly'],
		MAID: ['#haugai', '#maid', '#cosplay'],
		OFFICE: ['#vanphong', '#office', '#congso'],
		KTV: ['#ktv', '#karaoke', '#tiepvien'],
		GYMER: ['#gym', '#fitness', '#yoga'],
		RICH_KID: ['#tieuthuu', '#richkid', '#sangchanh'],
		EX_GIRLFRIEND: ['#tinhcu', '#exgf', '#nguoiyeucu'],
		NEIGHBOR: ['#hangxom', '#neighbor', '#girl'],
	},
	OUTFIT: {
		BIKINI: ['#bikini', '#doboi', '#beach'],
		LINGERIE: ['#noiy', '#lingerie', '#sexy'],
		AO_DAI: ['#aodai', '#vietnam', '#truyenthong'],
		OFFICE_WEAR: ['#congso', '#somi', '#vest'],
		GYM_WEAR: ['#gymmotivation', '#legging', '#fitness'],
		STREET: ['#streetstyle', '#fashion', '#ootd'],
		COSPLAY: ['#cosplay', '#anime', '#costume'],
		NO_CLOTHES: ['#body', '#art', '#nude'],
		TOWEL: ['#khantam', '#shower', '#fresh'],
	},
	ACTIVITY: {
		POSING: ['#pose', '#taodang', '#model'],
		DANCING: ['#dance', '#nhay', '#tiktokdance'],
		RELAXING: ['#relax', '#thugian', '#chill'],
		WORKING: ['#working', '#lamviec', '#busy'],
		EXERCISING: ['#workout', '#exercise', '#gym'],
		SHOWING_OFF: ['#khoe', '#show', '#flex'],
		TOUCHING: ['#sensual', '#touch', '#feel'],
		TEASING: ['#teasing', '#sexy', '#hot'],
		BATHING: ['#shower', '#bath', '#bathing'],
		CHANGING: ['#changing', '#behind', '#dressing'],
	},
	LOCATION: {
		BEDROOM: ['#phongngu', '#bedroom', '#giuong'],
		LIVING_ROOM: ['#phongkhach', '#sofa', '#home'],
		KITCHEN: ['#bep', '#kitchen', '#cooking'],
		BATHROOM: ['#phongtam', '#bathroom', '#shower'],
		OFFICE: ['#vanphong', '#office', '#work'],
		PUBLIC: ['#public', '#outdoor', '#risky'],
		OUTDOOR: ['#outdoor', '#nature', '#fresh'],
		CAR: ['#xehoi', '#car', '#drive'],
		STAIRS: ['#cauthang', '#stairs', '#secret'],
	},
	FOCUS: {
		CHEST: ['#body', '#curves', '#vong1'],
		BUTT: ['#booty', '#vong3', '#curves'],
		LEGS: ['#legs', '#chan', '#dai'],
		WAIST: ['#eo', '#waist', '#thon'],
		BACK: ['#back', '#lung', '#sexy'],
		LIPS: ['#lips', '#moi', '#kiss'],
		SKIN: ['#skin', '#da', '#glow'],
		GENERAL: ['#body', '#figure', '#curves'],
	},
	THEME: {
		HOT: ['#hot', '#nongbong', '#fire'],
		SWEET: ['#cute', '#sweet', '#kawaii'],
		DARK: ['#dark', '#mysterious', '#gothic'],
		REALISTIC: ['#real', '#natural', '#nofilter'],
		HARDCORE: ['#wild', '#intense', '#crazy'],
		SUBMISSIVE: ['#submissive', '#obedient', '#gentle'],
	},
	EMOTION: {
		SHY: ['#shy', '#cute', '#ngaingung'],
		BOLD: ['#bold', '#confident', '#taobao'],
		NAUGHTY: ['#naughty', '#bad', '#huhong'],
		SWEET: ['#sweet', '#cute', '#ngotngao'],
		HORNY: ['#horny', '#turned', '#excited'],
		CONFIDENT: ['#confident', '#queen', '#boss'],
	},
	PEOPLE: {
		BOYFRIEND: ['#foryou', '#love', '#boyfriend'],
		STRANGER: ['#stranger', '#random', '#anyone'],
		FAN: ['#fan', '#followers', '#support'],
		SOMEONE: ['#someone', '#secret', '#mystery'],
	},
};

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

	// Add hashtags based on matched categories
	for (const [categoryKey, optionKeys] of Object.entries(matches)) {
		const categoryMapping = HASHTAG_MAPPING[categoryKey];
		if (categoryMapping) {
			for (const optionKey of optionKeys) {
				const tags = categoryMapping[optionKey];
				if (tags) {
					// Pick 1-2 random hashtags from this option
					const count = Math.min(2, tags.length);
					for (let i = 0; i < count; i++) {
						hashtags.add(randomItem(tags));
					}
				}
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
// GENERATE HASHTAGS.JS FROM MAPPING
// ============================================================

function generateHashtagSets() {
	const sets = new Set();
	const allTags = [];

	// Collect all available hashtags from mapping
	for (const catMapping of Object.values(HASHTAG_MAPPING)) {
		for (const optTags of Object.values(catMapping)) {
			if (Array.isArray(optTags)) {
				allTags.push(...optTags);
			}
		}
	}

	// Generate various combinations - ensure exactly 5 hashtags each
	for (let i = 0; i < 500; i++) {
		const tagSet = new Set();

		// Keep adding until we have exactly 3 unique tags
		while (tagSet.size < 3) {
			tagSet.add(randomItem(allTags));
		}

		// Combine: 2 base + 3 specific = 5 total
		const result = `${BASE_HASHTAGS} ${Array.from(tagSet).join(' ')}`;
		sets.add(result);
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

// Generate and write hashtags.js
const hashtagSets = generateHashtagSets();
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

/**
 * Hashtag mapping by category for dynamic generation
 */
export const HASHTAG_MAPPING = ${JSON.stringify(HASHTAG_MAPPING, null, '\t')};

export const BASE_HASHTAGS = '${BASE_HASHTAGS}';
`;
fs.writeFileSync(hashtagsPath, hashtagsContent, 'utf8');
console.log(`✅ Written hashtags to: ${hashtagsPath}`);

console.log(`   Total titles: ${qualitySentences.length}`);
console.log(`   Total hashtag sets: ${hashtagSets.length}`);
console.log('\n');
