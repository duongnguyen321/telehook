import { TITLES, CATEGORIES } from '../src/services/ai.js';

// Configuration
const REQUIRED_FILTERS = 4;

// Helper: Check if text matches keywords
function matchesKeywords(text, keywords) {
	const lowerText = text.toLowerCase();
	return keywords.some((k) => lowerText.includes(k.toLowerCase()));
}

// 1. Generate all combinations of 4 distinct categories
function generateCombinations() {
	const cats = Object.keys(CATEGORIES); // [THEME, ROLE, OUTFIT, ...]
	const combos = [];

	// We need exactly 4 distinct categories to form a combination
	// We will pick 1 option from each of 4 categories
	// This is a combinatorial explosion if we aren't careful.
	// Let's iterate through all 4-category subsets of the 8 main categories.

	// Helper to get combinations of k elements from array
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

	const catSubsets = getKCombs(cats, 4);

	// Now for each subset of 4 categories, generate all option combinations
	// BUT this is too huge (millions).
	// Let's stick to the previous strategy:
	// Identify "Core" combinations that are most important.
	// Or, just check randomly sampled combinations?
	// The previous script checked ~3000 combos.
	// Let's check specific high-value combinations:
	// ROLE + OUTFIT + ACTION + LOCATION (Classic)
	// ROLE + OUTFIT + THEME + TIME (Atmosphere)
	// ROLE + ATTRIBUTE + ACTION + POSE (Detail)

	// Since we want to find *ALL* gaps, let's try a different approach:
	// 1. Map all titles to their filters.
	// 2. See which 4-filter combinations are NOT covered.

	// But the space of 4-filter combinations is huge.
	// Let's look for "Missing" combinations from a generated target list.
	// The user wants "ensure no case missing".
	// Let's generate a robust set of valid combinations.

	// Better approach:
	// Flatten all options: { Category: OptionName, Keywords }
	const allOptions = [];
	for (const catKey of cats) {
		const cat = CATEGORIES[catKey];
		for (const optKey of Object.keys(cat.options)) {
			// Skip "General/Other" if they exist
			allOptions.push({
				cat: catKey,
				opt: optKey,
				keywords: cat.options[optKey].keywords,
				label: cat.options[optKey].label,
			});
		}
	}

	// Generate target combinations:
	// Fix 1: Role (Most important)
	const roleOpts = allOptions.filter((o) => o.cat === 'ROLE');
	const outfitOpts = allOptions.filter((o) => o.cat === 'OUTFIT');
	const actionOpts = allOptions.filter((o) => o.cat === 'ACTION');
	const locOpts = allOptions.filter((o) => o.cat === 'LOCATION');
	const themeOpts = allOptions.filter((o) => o.cat === 'THEME');
	const poseOpts = allOptions.filter((o) => o.cat === 'POSE');
	const timeOpts = allOptions.filter((o) => o.cat === 'TIME');

	const combosToCheck = [];

	// Strategy 1: ROLE + OUTFIT + LOCATION + TIME (Scenario)
	for (const r of roleOpts) {
		for (const o of outfitOpts) {
			for (const l of locOpts) {
				for (const t of timeOpts) {
					combosToCheck.push([r, o, l, t]);
				}
			}
		}
	}

	// Strategy 2: ROLE + OUTFIT + ACTION + POSE (Activity)
	for (const r of roleOpts) {
		for (const o of outfitOpts) {
			for (const a of actionOpts) {
				for (const p of poseOpts) {
					combosToCheck.push([r, o, a, p]);
				}
			}
		}
	}

	// Filter out invalid/unlikely (e.g. Teacher + Gym + Bed) - actually let's keep it broad for now.
	// Cap at 5000 to be fast.
	console.log(`🔍 Generating 4+ filter combinations...`);
	// Shuffle and take 5000 if too many
	if (combosToCheck.length > 5000) {
		return combosToCheck.sort(() => 0.5 - Math.random()).slice(0, 5000);
	}

	return combosToCheck;
}

async function analyze() {
	const combinations = generateCombinations();
	console.log(`\n✓ Generated ${combinations.length} 4+ filter combinations\n`);

	console.log(`Analyzing ${combinations.length} combinations...`);
	console.log(`(This checks ONLY TITLES since DESCRIPTIONS were removed)\n`);

	const gaps = [];
	let progress = 0;

	for (const combo of combinations) {
		progress++;
		if (progress % 500 === 0)
			console.log(`Progress: ${progress}/${combinations.length}`);

		// Check if ANY title matches ALL 4 options in this combo
		const titleMatches = TITLES.filter((t) =>
			combo.every((opt) => matchesKeywords(t, opt.keywords))
		).length;

		const totalMatches = titleMatches; // + descMatches (0)

		if (totalMatches < 1) {
			// Zero content coverage
			gaps.push({
				combo,
				titleCount: titleMatches,
				descCount: 0,
			});
		}
	}

	console.log('\n📊 ANALYSIS RESULTS');
	console.log('='.repeat(80));
	console.log(
		`\nTotal 4+ filter combinations analyzed: ${combinations.length}`
	);
	console.log(`\n❌ NO content (0 matches): ${gaps.length}`);
	console.log(`✅ Covered: ${combinations.length - gaps.length}`);

	if (gaps.length > 0) {
		console.log(
			'\n================================================================================'
		);
		console.log('❌ CRITICAL GAPS - MISSING CONTENT');
		console.log(
			'================================================================================\n'
		);
		console.log(`Found ${gaps.length} combinations with ZERO content\n`);

		// Sort by ROLE to group them
		gaps.sort((a, b) => {
			const roleA = a.combo.find((x) => x.cat === 'ROLE')?.label || '';
			const roleB = b.combo.find((x) => x.cat === 'ROLE')?.label || '';
			return roleA.localeCompare(roleB);
		});

		gaps.slice(0, 100).forEach((gap, index) => {
			// Show first 100
			console.log(`${index + 1}. Content: 0 total`);
			gap.combo.forEach((opt) => {
				console.log(
					`   ${CATEGORIES[opt.cat].emoji} ${CATEGORIES[opt.cat].name}: ${
						opt.label
					}`
				);
			});
			const neededKeywords = gap.combo.map((c) => c.keywords[0]).join(', ');
			console.log(`   💡 Need content with: ${neededKeywords}\n`);
		});

		if (gaps.length > 100) {
			console.log(`... and ${gaps.length - 100} more gaps not shown.`);
		}
	}
}

analyze();
