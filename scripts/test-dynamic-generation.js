#!/usr/bin/env node
/**
 * Comprehensive test for dynamic title generation
 * Tests all filter combinations from 1 to all categories
 */

import { generateContentFromCategories } from '../src/services/ai.js';
import { CATEGORIES } from '../src/data/category.js';

console.log('🧪 Comprehensive Dynamic Title Generation Test\n');
console.log(`📊 Total Categories: ${Object.keys(CATEGORIES).length}\n`);

// Test 1: Only 1 filter
console.log('=== Test 1: 1 filter ===');
const r1 = generateContentFromCategories({ OUTFIT: ['NURSE_UNIFORM'] }, 2);
r1.forEach((r, i) => console.log(`${i + 1}. ${r.title}\n   ${r.hashtags}`));

// Test 2: 3 filters
console.log('\n=== Test 2: 3 filters ===');
const r2 = generateContentFromCategories(
	{ OUTFIT: ['NURSE_UNIFORM'], THEME: ['COSPLAY'], LOCATION: ['BEDROOM'] },
	2
);
r2.forEach((r, i) => console.log(`${i + 1}. ${r.title}\n   ${r.hashtags}`));

// Test 3: 5 filters
console.log('\n=== Test 3: 5 filters ===');
const r3 = generateContentFromCategories(
	{
		OUTFIT: ['NURSE_UNIFORM'],
		THEME: ['COSPLAY'],
		LOCATION: ['BEDROOM'],
		ROLE: ['NURSE'],
		EMOTION: ['SHY'],
	},
	2
);
r3.forEach((r, i) => console.log(`${i + 1}. ${r.title}\n   ${r.hashtags}`));

// Test 4: 7 filters
console.log('\n=== Test 4: 7 filters ===');
const r4 = generateContentFromCategories(
	{
		OUTFIT: ['NURSE_UNIFORM'],
		THEME: ['COSPLAY'],
		LOCATION: ['BEDROOM'],
		ROLE: ['NURSE'],
		EMOTION: ['SHY'],
		POSE: ['LYING'],
		ACTIVITY: ['TEASING'],
	},
	2
);
r4.forEach((r, i) => console.log(`${i + 1}. ${r.title}\n   ${r.hashtags}`));

// Test 5: ALL 10 categories
console.log('\n=== Test 5: ALL 10 categories ===');
const r5 = generateContentFromCategories(
	{
		CONTEXT: ['LATE_NIGHT'],
		EMOTION: ['HORNY'],
		ROLE: ['NURSE'],
		OUTFIT: ['NURSE_UNIFORM'],
		ACTIVITY: ['TEASING'],
		LOCATION: ['BEDROOM'],
		FOCUS: ['CHEST'],
		THEME: ['COSPLAY'],
		HAIR: ['WET'],
		POSE: ['LYING'],
	},
	2
);
r5.forEach((r, i) => console.log(`${i + 1}. ${r.title}\n   ${r.hashtags}`));

// Test 6: Multiple options per category
console.log('\n=== Test 6: Multiple options per category ===');
const r6 = generateContentFromCategories(
	{
		OUTFIT: ['NURSE_UNIFORM', 'MAID_UNIFORM', 'BUNNY'],
		ROLE: ['NURSE', 'MAID'],
		THEME: ['COSPLAY', 'HOT'],
	},
	2
);
r6.forEach((r, i) => console.log(`${i + 1}. ${r.title}\n   ${r.hashtags}`));

console.log('\n✅ All tests completed!');
