/**
 * Script to check keyword coverage in TITLES and DESCRIPTIONS
 * Run with: node scripts/check-keyword-coverage.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the ai.js file
const aiJsPath = join(__dirname, '../src/services/ai.js');
const aiJsContent = readFileSync(aiJsPath, 'utf-8');

// Extract TITLES array content (between line 8 and first ];)
const titlesMatch = aiJsContent.match(/const TITLES = \[([\s\S]*?)\];/);
const descriptionsMatch = aiJsContent.match(
	/const DESCRIPTIONS = \[([\s\S]*?)\];/
);

if (!titlesMatch || !descriptionsMatch) {
	console.error('Could not find TITLES or DESCRIPTIONS arrays');
	process.exit(1);
}

const titlesContent = titlesMatch[1].toLowerCase();
const descriptionsContent = descriptionsMatch[1].toLowerCase();
const allContent = titlesContent + descriptionsContent;

// All keywords from CATEGORIES
const allKeywords = {
	// POSE
	POSE_FRONT: ['trước', 'mặt', 'nhìn', 'ngực'],
	POSE_BACK: ['sau', 'lưng', 'mông', 'quay'],
	POSE_TOP: ['trên', 'xuống', 'rãnh', 'top'],
	POSE_BOTTOM: ['dưới', 'lên', 'chân', 'low'],
	POSE_SIDE: ['nghiêng', 'cong', 'đường cong', 'profile'],

	// ACTION
	ACTION_SHOWING: ['khoe', 'show', 'flex', 'xem'],
	ACTION_BOUNCING: ['nhún', 'bounce', 'nảy', 'lắc'],
	ACTION_DANCING: ['lắc', 'dance', 'nhảy', 'quẩy', 'xoay'],
	ACTION_LYING: ['nằm', 'giường', 'lying', 'ngủ'],
	ACTION_BENDING: ['cúi', 'bend', 'gập', 'doggy'],
	ACTION_TOUCHING: ['sờ', 'chạm', 'vuốt', 'touch'],

	// EXPRESSION
	EXPR_MOANING: ['kêu', 'rên', 'sướng', 'ahh', 'ơi'],
	EXPR_SILENT: ['im', 'lặng', 'quiet', 'silent'],
	EXPR_SMILING: ['cười', 'smile', 'vui'],
	EXPR_SEDUCTIVE: ['mắt', 'nhìn', 'gợi', 'quyến rũ'],
	EXPR_BITING: ['cắn', 'môi', 'liếm', 'lip'],

	// LOCATION
	LOC_MIRROR: ['gương', 'mirror', 'selfie'],
	LOC_KARAOKE: ['karaoke', 'phòng hát'],
	LOC_OUTDOOR: ['ngoài', 'outdoor', 'beach', 'biển'],
	LOC_INDOOR: ['nhà', 'phòng', 'indoor', 'home'],
	LOC_BED: ['giường', 'bed', 'nằm', 'gối', 'chăn'],
	LOC_BATHROOM: ['tắm', 'bathroom', 'shower', 'ướt'],
	LOC_HOTEL: ['khách sạn', 'hotel', 'check-in'],

	// TIME
	TIME_DAY: ['ngày', 'nắng', 'sáng', 'day'],
	TIME_NIGHT: ['đêm', 'khuya', 'night', 'midnight', 'tối'],

	// PEOPLE
	PEOPLE_SOLO: ['em', 'một mình', 'solo'],
	PEOPLE_MANY_MALE: ['nhiều anh', 'các anh', 'nhóm'],
	PEOPLE_MANY_FEMALE: ['chị em', 'hội', 'girls', 'các em'],
	PEOPLE_COUPLE: ['anh và em', 'couple', 'hai đứa'],

	// OUTFIT
	OUTFIT_BIKINI: ['bikini', 'đồ bơi', 'beach', 'summer'],
	OUTFIT_LINGERIE: ['nội y', 'lingerie', 'lace', 'ren', 'đồ lót'],
	OUTFIT_COSPLAY: ['cosplay', 'bunny', 'maid', 'nurse', 'nữ sinh'],
	OUTFIT_CASUAL: ['đồ nhà', 'casual', 'bình thường'],
	OUTFIT_NAKED: ['cởi', 'nude', 'trần', 'không mặc'],
	OUTFIT_WET: ['ướt', 'wet', 'nước', 'tắm'],

	// HAIR
	HAIR_SHORT: ['tóc ngắn', 'short hair'],
	HAIR_LONG: ['tóc dài', 'long hair', 'thướt tha'],
	HAIR_LOOSE: ['xõa', 'tóc xõa', 'vai'],
	HAIR_TIED: ['buộc', 'ponytail', 'đuôi ngựa'],

	// FOCUS
	FOCUS_CHEST: ['ngực', 'vòng 1', 'rãnh', 'căng'],
	FOCUS_BUTT: ['mông', 'vòng 3', 'đít'],
	FOCUS_WAIST: ['eo', 'vòng eo', 'bé xíu'],
	FOCUS_LEGS: ['chân', 'đùi', 'legs'],
	FOCUS_FACE: ['mặt', 'face', 'xinh'],
	FOCUS_FULL: ['body', 'full', 'toàn thân', '3 vòng'],
	FOCUS_BACK: ['lưng', 'back'],
};

console.log('=== KEYWORD COVERAGE ANALYSIS ===\n');

const missingKeywords = {};
const foundKeywords = {};

for (const [category, keywords] of Object.entries(allKeywords)) {
	const found = [];
	const missing = [];

	for (const kw of keywords) {
		if (allContent.includes(kw.toLowerCase())) {
			found.push(kw);
		} else {
			missing.push(kw);
		}
	}

	if (found.length > 0) {
		foundKeywords[category] = found;
	}
	if (missing.length > 0) {
		missingKeywords[category] = missing;
	}
}

console.log('✅ KEYWORDS WITH MATCHES:');
for (const [cat, kws] of Object.entries(foundKeywords)) {
	console.log(`  ${cat}: ${kws.join(', ')}`);
}

console.log('\n❌ KEYWORDS WITHOUT MATCHES (need content):');
for (const [cat, kws] of Object.entries(missingKeywords)) {
	console.log(`  ${cat}: ${kws.join(', ')}`);
}

console.log('\n=== SUMMARY ===');
const totalFound = Object.values(foundKeywords).flat().length;
const totalMissing = Object.values(missingKeywords).flat().length;
console.log(`Found: ${totalFound} keywords`);
console.log(`Missing: ${totalMissing} keywords`);
console.log(
	`Coverage: ${((totalFound / (totalFound + totalMissing)) * 100).toFixed(1)}%`
);
