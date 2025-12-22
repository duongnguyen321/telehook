import {
	generateContentFromCategories,
	getCategories,
	getCategoryOptions,
} from '../src/services/ai.js';

console.log('=== Testing Content Generation with Safe Filters ===\n');

// Test 1: Generate random content (no filters)
console.log('--- Test 1: Random Generation ---');
const randomContent = generateContentFromCategories({}, 3);
randomContent.forEach((c, i) => {
	console.log(`[${i + 1}] Title: ${c.title}`);
	console.log(`    Desc:  ${c.description.substring(0, 50)}...`);
});

// Test 2: Generate with specific new categories
console.log('\n--- Test 2: Specific Categories (STANDING, POSING) ---');
const specificContent = generateContentFromCategories(
	{
		POSE: 'STANDING',
		ACTION: 'POSING',
	},
	3
);
specificContent.forEach((c, i) => {
	console.log(`[${i + 1}] Title: ${c.title}`);
	console.log(`    Desc:  ${c.description.substring(0, 50)}...`);
});

// Test 3: Generate with 'teaching' role (checking safety)
console.log("\n--- Test 3: Role 'TEACHER' Safety Check ---");
const roleContent = generateContentFromCategories(
	{
		ROLE: 'TEACHER',
	},
	3
);
roleContent.forEach((c, i) => {
	console.log(`[${i + 1}] Title: ${c.title}`);
	console.log(`    Desc:  ${c.description.substring(0, 50)}...`);
});

console.log('\n=== Test Complete ===');
