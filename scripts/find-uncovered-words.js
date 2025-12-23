/**
 * Script to find words in TITLES/DESCRIPTIONS that are NOT covered by CATEGORIES
 * Run with: node scripts/find-uncovered-words.js
 */

import { TITLES, DESCRIPTIONS, CATEGORIES } from '../src/services/ai.js';

// Common words to ignore (Vietnamese stop words + common terms)
const COMMON_WORDS = new Set([
	// Vietnamese stop words
	'của',
	'và',
	'là',
	'cho',
	'có',
	'này',
	'đó',
	'được',
	'với',
	'trong',
	'để',
	'còn',
	'từ',
	'như',
	'khi',
	'một',
	'những',
	'các',
	'người',
	'hay',
	'mà',
	'vì',
	'nên',
	'ra',
	'thì',
	'vẫn',
	'về',
	'không',
	'mọi',
	'nếu',
	'cũng',
	'hơn',
	'đã',
	'sẽ',
	'lại',
	'đang',
	'rồi',
	'ấy',
	'quá',
	'đi',
	'đến',
	'thế',
	'ai',
	'gì',
	'sao',
	'làm',
	'bị',
	'nào',
	// Pronouns
	'em',
	'anh',
	'bạn',
	'tôi',
	'mình',
	'cô',
	'chị',
	'ông',
	'bà',
	'họ',
	'ta',
	'chúng',
	// Common verbs & adjectives (too generic)
	'nhìn',
	'xem',
	'biết',
	'thấy',
	'muốn',
	'cần',
	'hết',
	'chỉ',
	'luôn',
	'ngay',
	'thật',
	'rất',
	'lắm',
	'nữa',
	'bao',
	'giờ',
	'lúc',
	'nhiều',
	'ít',
	'mới',
	'cùng',
	'lên',
	// Connectors
	'nhé',
	'nha',
	'nhá',
	'ơi',
	'à',
	'ừ',
	'ạ',
	'đâu',
	'đây',
	'kia',
	'thôi',
	// Numbers & punctuation artifacts
	'1',
	'2',
	'3',
	'4',
	'5',
	'6',
	'7',
	'8',
	'9',
	'0',
	// Common verbs
	'làm',
	'đưa',
	'lấy',
	'cho',
	'đặt',
	'bỏ',
	'giữ',
	'cầm',
	'đem',
	'mang',
	// Common adjectives
	'đẹp',
	'xinh',
	'tốt',
	'hay',
	'vui',
	'buồn',
	'khó',
	'dễ',
	'nhanh',
	'chậm',
	// Too generic
	'hôm',
	'nay',
	'mai',
	'qua',
	'sau',
	'trước',
	'dưới',
	'trên',
	'trong',
	'ngoài',
	// Misc common
	'nhỏ',
	'to',
	'lớn',
	'bé',
	'cao',
	'thấp',
	'dài',
	'ngắn',
	'nặng',
	'nhẹ',
	// More pronouns and particles
	'cái',
	'con',
	'chiếc',
	'bức',
	'cuốn',
	'quyển',
	// Possessives
	'của',
	'mà',
	'với',
	// More stopwords
	'thì',
	'vẫn',
	'rồi',
	'mới',
	'đang',
	'sẽ',
	'đã',
	'vừa',
	'mới',
	// Other common
	'video',
	'clip',
	'hình',
	'ảnh',
	'page',
	'link',
	'follow',
	'like',
	'share',
	// Emotions (too common)
	'thích',
	'yêu',
	'ghét',
	// Time
	'ngày',
	'tuần',
	'tháng',
	'năm',
	// Additional stop words from analysis
	'thể',
	'xuống',
	'nhưng',
	'vào',
	'bên',
	'nhắn',
	'tin',
	'thêm',
	'đường',
	'nhất',
	'gái',
	'trời',
	'đủ',
	'sẵn',
	'sàng',
	'toàn',
	'hai',
	'càng',
	'đầu',
	'sướng',
	'xong',
	'đừng',
	'nhiên',
	'chút',
	'lót',
	'đều',
	'khác',
	'giữa',
	'nơi',
	'từng',
	'nhau',
]);

// Minimum word length to consider
const MIN_WORD_LENGTH = 2;

// Minimum occurrences to be considered significant
const MIN_OCCURRENCES = 3;

console.log('=== UNCOVERED WORDS ANALYSIS ===\n');

// Collect all keywords from categories
const allCategoryKeywords = new Set();
for (const [, catDef] of Object.entries(CATEGORIES)) {
	for (const [, optDef] of Object.entries(catDef.options)) {
		const keywords = optDef.keywords || [];
		keywords.forEach((kw) => allCategoryKeywords.add(kw.toLowerCase()));
	}
}

console.log(`Total category keywords: ${allCategoryKeywords.size}`);

// Extract words from content
function extractWords(text) {
	// Lowercase and split by non-word characters
	return text
		.toLowerCase()
		.split(/[\s,.:;!?"'()\[\]{}<>\/\\|@#$%^&*+=~`]+/)
		.filter((w) => w.length >= MIN_WORD_LENGTH)
		.filter((w) => !COMMON_WORDS.has(w))
		.filter((w) => !/^\d+$/.test(w)); // Filter pure numbers
}

// Count word occurrences
const wordCounts = new Map();
const allContent = [...TITLES, ...DESCRIPTIONS];

allContent.forEach((text) => {
	const words = extractWords(text);
	words.forEach((word) => {
		wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
	});
});

// Filter to significant words not in categories
const uncoveredWords = [];
for (const [word, count] of wordCounts.entries()) {
	if (count >= MIN_OCCURRENCES && !allCategoryKeywords.has(word)) {
		uncoveredWords.push({ word, count });
	}
}

// Sort by count descending
uncoveredWords.sort((a, b) => b.count - a.count);

console.log(`Total unique words in content: ${wordCounts.size}`);
console.log(
	`Significant uncovered words (>=${MIN_OCCURRENCES} occurrences): ${uncoveredWords.length}\n`
);

// Group by potential category
const suggestions = {
	THEME: [],
	OUTFIT: [],
	ACTIVITY: [],
	FOCUS: [],
	LOCATION: [],
	TIME: [],
	PEOPLE: [],
	HAIR: [],
	POSITION: [],
	UNKNOWN: [],
};

// Simple heuristic categorization
const categoryHints = {
	THEME: [
		'sexy',
		'cute',
		'hot',
		'đẹp',
		'xinh',
		'ngọt',
		'cool',
		'cá tính',
		'quyến',
		'gợi',
		'táo',
		'nóng',
		'cháy',
		'mlem',
	],
	OUTFIT: [
		'áo',
		'váy',
		'quần',
		'đồ',
		'bikini',
		'nội y',
		'ren',
		'lụa',
		'vải',
		'mặc',
		'cởi',
		'khăn',
		'giày',
		'dép',
	],
	ACTIVITY: [
		'nhảy',
		'múa',
		'lắc',
		'chuyển',
		'động',
		'nằm',
		'ngồi',
		'đứng',
		'quẩy',
		'cover',
		'pose',
		'dáng',
		'tạo',
	],
	FOCUS: [
		'mặt',
		'ngực',
		'mông',
		'chân',
		'tay',
		'eo',
		'vai',
		'lưng',
		'vòng',
		'body',
		'thân',
	],
	LOCATION: [
		'nhà',
		'phòng',
		'biển',
		'hồ',
		'phố',
		'quán',
		'gym',
		'hotel',
		'resort',
		'xe',
		'ngoài',
		'trong',
		'gương',
		'bếp',
		'sofa',
		'giường',
	],
	TIME: ['sáng', 'tối', 'đêm', 'ngày', 'trưa', 'chiều', 'khuya'],
	PEOPLE: ['một', 'đôi', 'cặp', 'nhóm', 'solo', 'couple', 'hội', 'bạn'],
	HAIR: ['tóc', 'xoăn', 'thẳng', 'nhuộm', 'màu', 'dài', 'ngắn', 'buộc', 'búi'],
	POSITION: [
		'truyền thống',
		'úp',
		'sấp',
		'ngửa',
		'ghế',
		'doggy',
		'chổng',
		'cưỡi',
		'nhấp',
		'tư thế',
		'kiểu',
	],
};

uncoveredWords.forEach(({ word, count }) => {
	let assigned = false;
	for (const [cat, hints] of Object.entries(categoryHints)) {
		if (hints.some((h) => word.includes(h) || h.includes(word))) {
			suggestions[cat].push({ word, count });
			assigned = true;
			break;
		}
	}
	if (!assigned) {
		suggestions.UNKNOWN.push({ word, count });
	}
});

// Print results
console.log('=== SUGGESTED ADDITIONS ===\n');

for (const [cat, words] of Object.entries(suggestions)) {
	if (words.length === 0) continue;
	console.log(`\n${cat}:`);
	words.slice(0, 20).forEach(({ word, count }) => {
		console.log(`  - "${word}" (${count} occurrences)`);
	});
	if (words.length > 20) {
		console.log(`  ... and ${words.length - 20} more`);
	}
}

// Summary
console.log('\n=== SUMMARY ===');
console.log(`Total significant uncovered: ${uncoveredWords.length}`);
console.log('\nTop 30 uncovered words by frequency:');
uncoveredWords.slice(0, 30).forEach(({ word, count }, i) => {
	console.log(`  ${i + 1}. "${word}" - ${count} times`);
});
