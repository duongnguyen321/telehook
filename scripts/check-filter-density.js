import { TITLES, DESCRIPTIONS, CATEGORIES } from '../src/services/ai.js';

function checkFilterDensity() {
	console.log('Checking Filter Density per Content Item...\n');

	const categoryKeys = Object.keys(CATEGORIES);
	const flattenedCategories = {};

	// Pre-process categories for faster lookup
	categoryKeys.forEach((catKey) => {
		flattenedCategories[catKey] = [];
		Object.values(CATEGORIES[catKey].options).forEach((opt) => {
			if (opt.keywords) {
				flattenedCategories[catKey].push(
					...opt.keywords.map((k) => k.toLowerCase())
				);
			}
		});
	});

	const checkItem = (text, index, type) => {
		const lowerText = text.toLowerCase();
		let matchedCategories = 0;
		let matchedCatsList = [];

		categoryKeys.forEach((catKey) => {
			const keywords = flattenedCategories[catKey];
			const hasMatch = keywords.some((kw) => lowerText.includes(kw));
			if (hasMatch) {
				matchedCategories++;
				matchedCatsList.push(catKey);
			}
		});

		return { text, index, type, matchedCategories, matchedCatsList };
	};

	const allItems = [
		...TITLES.map((t, i) => checkItem(t, i, 'TITLES')),
		...DESCRIPTIONS.map((d, i) => checkItem(d, i, 'DESCRIPTIONS')),
	];

	const lowDensityItems = allItems.filter((item) => item.matchedCategories < 4);

	console.log(`Total Items: ${allItems.length}`);
	console.log(
		`Items with < 4 Filters: ${lowDensityItems.length} (${(
			(lowDensityItems.length / allItems.length) *
			100
		).toFixed(1)}%)`
	);

	if (lowDensityItems.length > 0) {
		console.log('\nExamples of Low Density Items:');
		lowDensityItems.slice(0, 50).forEach((item) => {
			console.log(
				`[${item.type} #${item.index}] (${
					item.matchedCategories
				} filters: ${item.matchedCatsList.join(', ')}) "${item.text}"`
			);
		});

		console.log('\n...and ' + (lowDensityItems.length - 50) + ' more.');
	} else {
		console.log('✅ All items meet the minimum 4-filter requirement!');
	}
}

checkFilterDensity();
