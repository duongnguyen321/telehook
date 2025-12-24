import { TITLES, CATEGORIES } from '../src/services/ai.js';
import fs from 'fs';

// --- CONFIG ---
const REQUIRED_FILTERS = 4;

// --- HELPERS ---
function matchesKeywords(text, keywords) {
	const lowerText = text.toLowerCase();
	return keywords.some((k) => lowerText.includes(k.toLowerCase()));
}

function getRandom(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

// Map Category Option -> Best primary keyword for generation
// We need to ensure the keyword we pick triggers the filter match.
function getPrimaryKeyword(catKey, optKey, optionData) {
	// Pick the first keyword as primary, or a specific manual map if needed
	// Most first keywords are good: 'cô giáo', 'y tá', 'bikini', 'gym', 'đêm'
	return optionData.keywords[0];
}

// Templates for generation
// Slots: ${ROLE}, ${OUTFIT}, ${LOCATION}, ${ACTION}, ${TIME}, ${FEELING}, ${INVITATION}
// We will dynamically construct templates based on which 4 categories are in the gap.
// But mostly we need a sentence that flows.

const TEMPLATES = [
	// Standard Roleplay
	'Em là ${ROLE} ${OUTFIT} ${ACTION} tại ${LOCATION} ${TIME}, ${INVITATION}',
	'${TIME} tại ${LOCATION}, ${ROLE} ${OUTFIT} chờ anh, ${INVITATION}',
	'Anh ơi, ${ROLE} ${OUTFIT} đang ${ACTION} ở ${LOCATION}, ${INVITATION}',
	'${OUTFIT} của ${ROLE} ướt đẫm ${LOCATION} ${TIME}, ${INVITATION}',
	'Em ${ACTION} ${LOCATION} ${TIME} với thân phận ${ROLE}, ${INVITATION}',
	'Anh thích ${ROLE} ${OUTFIT} ${ACTION} ở ${LOCATION} ${TIME} không? ${INVITATION}',
	'Hôm nay ${TIME}, ${ROLE} ${OUTFIT} muốn ${ACTION} tại ${LOCATION}, ${INVITATION}',
];

const INVITATIONS = [
	'anh muốn phạt em không?',
	'em hư lắm anh chiều em đi.',
	'làm em sướng run người nhé.',
	'anh vào sâu bên trong em đi.',
	'em muốn anh làm mạnh bạo.',
	'cơ thể em nóng ran chờ anh.',
	'anh thích e như thế này không?',
	'em dam dang chỉ vì anh.',
	'anh chịu nổi không?',
	'em muốn được anh yêu chiều.',
	'hãy làm cho em hét lên vì sướng.',
	'anh có muốn xé toạc đồ của em không?',
	'thân thể này là của anh.',
	'dạy dỗ em đi anh.',
	'em đang rất ướt át chờ anh.',
	'anh làm em nứng quá.',
	'đêm nay em thuộc về anh.',
	'hãy chiếm lấy em đi.',
];

// --- GENERATOR ---

function generateCombinations() {
	// Same logic as gap finder, but just get the combos
	const cats = Object.keys(CATEGORIES);
	const getKCombs = (set, k) => {
		if (k > set.length || k <= 0) return [];
		if (k === set.length) return [set];
		if (k === 1) return set.map((x) => [x]);
		const combs = [];
		for (let i = 0; i < set.length - k + 1; i++) {
			const head = set.slice(i, i + 1);
			const tailcombs = getKCombs(set.slice(i + 1), k - 1);
			for (const tail of tailcombs) {
				combs.push(head.concat(tail));
			}
		}
		return combs;
	};

	const allOptions = [];
	for (const catKey of cats) {
		const cat = CATEGORIES[catKey];
		for (const optKey of Object.keys(cat.options)) {
			allOptions.push({
				cat: catKey,
				opt: optKey,
				keywords: cat.options[optKey].keywords,
				label: cat.options[optKey].label,
				keyword: cat.options[optKey].keywords[0], // Use first keyword
			});
		}
	}

	// Limit to high value subsets to avoid infinite loop
	// Focus on ROLE + LOC + OUTFIT + TIME/ACTION
	const roleOpts = allOptions.filter((o) => o.cat === 'ROLE');
	const outfitOpts = allOptions.filter((o) => o.cat === 'OUTFIT');
	const actionOpts = allOptions.filter((o) => o.cat === 'ACTION');
	const locOpts = allOptions.filter((o) => o.cat === 'LOCATION');
	const timeOpts = allOptions.filter((o) => o.cat === 'TIME');
	const posOpts = allOptions.filter((o) => o.cat === 'POSITION');

	const combos = [];

	// 1. Role + Outfit + Loc + Time
	for (const r of roleOpts)
		for (const o of outfitOpts)
			for (const l of locOpts)
				for (const t of timeOpts) combos.push([r, o, l, t]);

	// 2. Role + Outfit + Action + Loc
	for (const r of roleOpts)
		for (const o of outfitOpts)
			for (const a of actionOpts)
				for (const l of locOpts) combos.push([r, o, a, l]);

	// 3. Role + Pos + Loc + Time
	for (const r of roleOpts)
		for (const p of posOpts)
			for (const l of locOpts)
				for (const t of timeOpts) combos.push([r, p, l, t]);

	// Shuffle and limit? No, user wants ALL. But wait, duplicates?
	// Let's uniq by combination key
	const uniqueCombos = new Map();
	combos.forEach((c) => {
		const key = c
			.map((i) => `${i.cat}:${i.opt}`)
			.sort()
			.join('|');
		uniqueCombos.set(key, c);
	});

	return Array.from(uniqueCombos.values());
}

function fillGaps() {
	console.log('Generating potential gaps...');
	const combinations = generateCombinations();
	console.log(`Checking ${combinations.length} combinations...`);

	const newTitles = [];
	let filledCount = 0;

	for (const combo of combinations) {
		// Check if covered
		const isCovered = TITLES.some((t) =>
			combo.every((opt) => matchesKeywords(t, opt.keywords))
		);

		if (!isCovered) {
			// Generate content
			// Map combo options to their category for insertion
			const map = {};
			combo.forEach((opt) => (map[opt.cat] = opt.keyword));

			// If a category is missing in the combo, pick a generic logical one?
			// Or just construct sentence from available parts.

			// Simple synthesis:
			const parts = [
				map['ROLE'] ? `Em là ${map['ROLE']}` : 'Em',
				map['OUTFIT'] ? `mặc ${map['OUTFIT']}` : '',
				map['ACTION'] ? `đang ${map['ACTION']}` : '',
				map['POSITION'] ? `${map['POSITION']}` : '',
				map['LOCATION'] ? `tại ${map['LOCATION']}` : '',
				map['TIME'] ? `${map['TIME']}` : '',
			]
				.filter((x) => x)
				.join(' ');

			const invitation = getRandom(INVITATIONS);
			const sentence = `${parts}, ${invitation}`;

			// Ensure it sounds natural? "Em là cô giáo mặc bikini đang tắm tại nhà tắm đêm, anh muốn phạt em không?"
			// A bit robotic but covers keywords.
			// Let's make it slightly better.

			let text;
			// Strategy: Role first, then action/pos/outfit, then loc/time
			let subject = map['ROLE'] ? `Em là ${map['ROLE']}` : 'Em';
			if (map['OUTFIT']) subject += ` mặc ${map['OUTFIT']}`;

			let verb = '';
			if (map['ACTION']) verb += ` ${map['ACTION']}`;
			else if (map['POSITION']) verb += ` ${map['POSITION']}`;
			else {
				const randActs = ['đứng', 'ngồi', 'nằm', 'tạo dáng', 'chờ'];
				verb = ` ${getRandom(randActs)}`;
			}

			let place = '';
			if (map['LOCATION']) place += ` tại ${map['LOCATION']}`;
			if (map['TIME']) place += ` vào ${map['TIME']}`;

			// Randomize structure
			const r = Math.random();
			if (r < 0.3) {
				text = `${subject}${verb}${place}, ${invitation}`;
			} else if (r < 0.6) {
				text = `${place}, ${subject}${verb} chờ anh, ${invitation}`;
			} else {
				text = `Anh ơi, ${subject}${verb}${place}, ${invitation}`;
			}

			// Clean up spaces
			text = text.replace(/\s+/g, ' ').trim();
			// Capitalize first letter
			text = text.charAt(0).toUpperCase() + text.slice(1);

			newTitles.push(text);
			filledCount++;
		}
	}

	console.log(`Generated ${filledCount} new titles to fill gaps.`);

	if (filledCount > 0) {
		// Append to file?
		// Let's limit output to avoid huge file in one go if it's massive.
		// Combinations could be 10k+.
		// Let's save to 'new_content.js'
		const content = `// === NEW GAPS FILLED ===\nexport const NEW_TITLES = [\n${newTitles
			.map((t) => `\t'${t}',`)
			.join('\n')}\n];`;
		fs.writeFileSync('new_content.js', content);
		console.log('Saved to new_content.js');
	}
}

fillGaps();
