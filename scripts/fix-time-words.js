/**
 * Fix time words in TITLES - CAREFUL VERSION
 *
 * Only fix clear location-time patterns where ngày/đêm is CLEARLY a time reference.
 *
 * SAFE patterns to fix:
 * - "[location] ngày" or "[location] đêm" → add "ban"
 * - "ngày tại [location]" or "đêm tại [location]" → add "ban"
 * - "vào ngày" / "vào đêm" → add "ban"
 *
 * DO NOT touch (ambiguous):
 * - "chiều" (could be verb "indulge" - very common in dirty talk!)
 * - "sáng" in "trong sáng" (means "innocent")
 * - Natural phrases like "đêm khuya", "đêm nay", "sáng sớm"
 */
import fs from 'fs';
import { TITLES } from '../src/services/ai.js';

const LOCATIONS =
	'phòng ngủ|sofa|bếp|tắm|gương|nhà|văn phòng|gym|ngoài trời|phố|xe|bar|hồ bơi|ban công|cầu thang|biển|khách sạn';

let fixCount = 0;
const examples = [];

function fixTimeWords(title) {
	let fixed = title;

	// === NGÀY / ĐÊM patterns ONLY ===
	// These are the safest to fix since they're clearly time references in location contexts

	// Pattern: "vào ngày/đêm" (but not "vào ngày nay/này/mai")
	fixed = fixed.replace(
		/vào ngày(?!\s*(nay|này|mai|kia|xưa))/gi,
		'vào ban ngày'
	);
	fixed = fixed.replace(/vào đêm(?!\s*(nay|này|mai|hôm))/gi, 'vào ban đêm');

	// Pattern: "[location] ngày" at phrase boundary
	const locRegexDay = new RegExp(
		`(${LOCATIONS})\\s+ngày(?=\\s*[,.]|\\s+[^n]|\\s*$)`,
		'gi'
	);
	const locRegexNight = new RegExp(
		`(${LOCATIONS})\\s+đêm(?=\\s*[,.]|\\s+[^nk]|\\s*$)`,
		'gi'
	); // not before "nay/này" or "khuya"
	fixed = fixed.replace(locRegexDay, '$1 ban ngày');
	fixed = fixed.replace(locRegexNight, '$1 ban đêm');

	// Pattern: "tại [location] ngày/đêm"
	const taiLocDay = new RegExp(
		`(tại\\s+)(${LOCATIONS})\\s+ngày(?!\\s*(nay|này))`,
		'gi'
	);
	const taiLocNight = new RegExp(
		`(tại\\s+)(${LOCATIONS})\\s+đêm(?!\\s*(nay|này|khuya))`,
		'gi'
	);
	fixed = fixed.replace(taiLocDay, '$1$2 ban ngày');
	fixed = fixed.replace(taiLocNight, '$1$2 ban đêm');

	// Pattern: "ở [location] ngày/đêm"
	const oLocDay = new RegExp(
		`(ở\\s+)(${LOCATIONS})\\s+ngày(?!\\s*(nay|này))`,
		'gi'
	);
	const oLocNight = new RegExp(
		`(ở\\s+)(${LOCATIONS})\\s+đêm(?!\\s*(nay|này|khuya))`,
		'gi'
	);
	fixed = fixed.replace(oLocDay, '$1$2 ban ngày');
	fixed = fixed.replace(oLocNight, '$1$2 ban đêm');

	// Pattern: Start with "ngày tại" or "đêm tại/ở" → "Ban ngày tại" / "Ban đêm tại"
	fixed = fixed.replace(/^ngày\s+(tại|ở)/gi, 'Ban ngày $1');
	fixed = fixed.replace(/^đêm\s+(tại|ở)/gi, 'Ban đêm $1');

	// Pattern: ", ngày tại" or ", đêm tại" mid-sentence
	fixed = fixed.replace(/,\s*ngày\s+(tại|ở)/gi, ', ban ngày $1');
	fixed = fixed.replace(/,\s*đêm\s+(tại|ở)/gi, ', ban đêm $1');

	// Pattern: Start with "ngày [location]" or "đêm [location]"
	const startDayLoc = new RegExp(`^ngày\\s+(${LOCATIONS})`, 'gi');
	const startNightLoc = new RegExp(`^đêm\\s+(${LOCATIONS})`, 'gi');
	fixed = fixed.replace(startDayLoc, 'Ban ngày $1');
	fixed = fixed.replace(startNightLoc, 'Ban đêm $1');

	// Pattern: ", ngày [location]" or ", đêm [location]" mid-sentence
	const midDayLoc = new RegExp(`,\\s*ngày\\s+(${LOCATIONS})`, 'gi');
	const midNightLoc = new RegExp(`,\\s*đêm\\s+(${LOCATIONS})`, 'gi');
	fixed = fixed.replace(midDayLoc, ', ban ngày $1');
	fixed = fixed.replace(midNightLoc, ', ban đêm $1');

	// === AVOID bad patterns ===
	// "ban đêm khuya" → "đêm khuya" (khuya already implies night)
	fixed = fixed.replace(/ban đêm khuya/gi, 'đêm khuya');

	// Cleanup: avoid "ban ban" duplicates
	fixed = fixed.replace(/ban ban/gi, 'ban');

	return fixed;
}

const fixedTitles = TITLES.map((title) => {
	const fixed = fixTimeWords(title);

	if (fixed !== title) {
		fixCount++;
		if (examples.length < 20) {
			examples.push({
				before: title.substring(0, 95),
				after: fixed.substring(0, 95),
			});
		}
	}

	return fixed;
});

console.log('=== SAMPLE FIXES ===');
examples.forEach((ex, i) => {
	console.log(`${i + 1}. BEFORE: ${ex.before}`);
	console.log(`   AFTER:  ${ex.after}`);
	console.log('');
});

console.log(`\nTotal fixed: ${fixCount} titles out of ${TITLES.length}`);

// Save to file
const outputContent = `// === FIXED TIME WORDS ===
// Fixed: ${fixCount} titles (location + time patterns only)
export const TITLES = [
${fixedTitles.map((t) => `\t'${t.replace(/'/g, "\\'")}',`).join('\n')}
];
`;

fs.writeFileSync('fixed_time_titles.js', outputContent);
console.log('Saved to fixed_time_titles.js');

// Show some stats about what we DIDN'T touch
console.log('\n--- Preserved natural phrases (not modified) ---');
const chieuCount = TITLES.filter((t) => t.includes('chiều')).length;
const trongSangCount = TITLES.filter((t) => t.includes('trong sáng')).length;
const demKhuyaCount = fixedTitles.filter((t) => t.includes('đêm khuya')).length;
console.log(`"chiều" occurrences (preserved as verb): ${chieuCount}`);
console.log(`"trong sáng" occurrences (preserved): ${trongSangCount}`);
console.log(`"đêm khuya" occurrences (preserved): ${demKhuyaCount}`);
