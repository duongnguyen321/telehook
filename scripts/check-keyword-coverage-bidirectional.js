import { TITLES, DESCRIPTIONS, CATEGORIES } from '../src/services/ai.js';

// Common Vietnamese stop words to ignore in reverse check
const STOP_WORDS = new Set([
	'là',
	'của',
	'và',
	'có',
	'trong',
	'những',
	'các',
	'với',
	'cho',
	'để',
	'về',
	'người',
	'này',
	'đó',
	'khi',
	'như',
	'được',
	'tại',
	'vào',
	'bởi',
	'vì',
	'cũng',
	'nên',
	'cái',
	'việc',
	'anh',
	'em',
	'mình',
	'tôi',
	'bạn',
	'đêm',
	'nay',
	'xem',
	'nghe',
	'thấy',
	'muốn',
	'thích',
	'yêu',
	'nhé',
	'nha',
	'chưa',
	'rồi',
	'đây',
	'đâu',
	'nào',
	'lúc',
	'nữa',
	'cùng',
	'á',
	'ơi',
	'à',
	'thế',
	'này',
	'kia',
	'hả',
	'kìa',
	'ra',
	'lên',
	'xuống',
	'qua',
	'lại',
	'đi',
	'đến',
	'vẫn',
	'chỉ',
	'sẽ',
	'đang',
	'đã',
	'phải',
	'biết',
	'làm',
	'nói',
	'hỏi',
	'gọi',
	'bảo',
	'nghĩ',
	'nhớ',
	'quên',
	'nhìn',
	'thấy',
	'ngó',
	'liếc',
	'ngắm',
	'coi',
	'trên',
	'dưới',
	'trong',
	'ngoài',
	'giữa',
	'cạnh',
	'bên',
	'trước',
	'sau',
	'đầu',
	'cuối',
	'từ',
	'đến',
	'lúc',
	'khi',
	'lúc',
	'giờ',
	'phút',
	'giây',
	'ngày',
	'tháng',
	'năm',
]);

function getAllCategoryKeywords() {
	const keywords = new Set();
	Object.values(CATEGORIES).forEach((category) => {
		Object.values(category.options).forEach((option) => {
			option.keywords.forEach((kw) => keywords.add(kw.toLowerCase()));
		});
	});
	return keywords;
}

function checkMissingKeywords(contentArray, allKeywords) {
	const missing = new Set(allKeywords);
	const contentText = contentArray.join(' ').toLowerCase();

	allKeywords.forEach((kw) => {
		if (contentText.includes(kw)) {
			missing.delete(kw);
		}
	});

	return Array.from(missing);
}

function getUncoveredWords(contentArray, allKeywords) {
	const uncovered = new Map(); // word -> count
	const keywordList = Array.from(allKeywords);

	contentArray.forEach((line) => {
		// Simple tokenization: split by spaces, remove punctuation
		const words = line
			.toLowerCase()
			.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
			.split(/\s+/);

		words.forEach((word) => {
			if (word.length < 2) return; // Skip single chars
			if (STOP_WORDS.has(word)) return;

			// Check if this word is part of ANY category keyword
			// This is tricky because "áo dài" is a keyword, but "áo" might be a word
			// We want to flag "áo" if it's NOT part of any covered keyword phrase

			const isCovered = keywordList.some((kw) => kw.includes(word));

			if (!isCovered) {
				uncovered.set(word, (uncovered.get(word) || 0) + 1);
			}
		});
	});

	// Sort by frequency
	return Array.from(uncovered.entries())
		.sort((a, b) => b[1] - a[1])
		.filter((item) => item[1] > 2); // Show only words appearing > 2 times
}

function analyze() {
	console.log('Analyzing Keyword Coverage...\n');
	const allKeywords = getAllCategoryKeywords();
	console.log(`Total Categories Keywords: ${allKeywords.size}`);

	// Check 1: Keywords from Categories NOT present in Content
	console.log(
		'\n--- Category Keywords MISSING in Content (Titles + Descriptions) ---'
	);
	const allContent = [...TITLES, ...DESCRIPTIONS];
	const missingInContent = checkMissingKeywords(allContent, allKeywords);

	if (missingInContent.length === 0) {
		console.log('✅ All category keywords are present in the content!');
	} else {
		console.log(`❌ Found ${missingInContent.length} missing keywords:`);
		console.log(missingInContent.join(', '));
	}

	// Check 2: Words in Content NOT covered by Categories (potential new keywords)
	console.log('\n--- Content Words NOT in Categories (Top Occurrences) ---');
	const uncovered = getUncoveredWords(allContent, allKeywords);

	if (uncovered.length === 0) {
		console.log(
			'✅ All significant words in content are covered by categories!'
		);
	} else {
		console.log(
			`⚠️ Found ${uncovered.length} potentially uncovered words (appearing > 2 times):`
		);
		uncovered.slice(0, 50).forEach(([word, count]) => {
			console.log(`${word}: ${count}`);
		});
		if (uncovered.length > 50)
			console.log(`...and ${uncovered.length - 50} more.`);
	}
}

analyze();
