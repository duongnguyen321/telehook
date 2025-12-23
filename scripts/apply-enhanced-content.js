/**
 * Script to apply enhanced content to ai.js
 * Run with: node scripts/apply-enhanced-content.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const aiJsPath = path.join(__dirname, '../src/services/ai.js');
const enhancedContentPath = '/tmp/enhanced-content.js';

const aiJsContent = fs.readFileSync(aiJsPath, 'utf8');
const enhancedContent = fs.readFileSync(enhancedContentPath, 'utf8');

// Find the TITLES array start
const titlesStart = aiJsContent.indexOf('export const TITLES = [');
if (titlesStart === -1) {
	console.error('Could not find TITLES array start');
	process.exit(1);
}

// Find the HASHTAG_SETS to mark the end of content we're replacing
const hashtagStart = aiJsContent.indexOf('// 40+ hashtag sets');
if (hashtagStart === -1) {
	console.error('Could not find hashtag comment');
	process.exit(1);
}

// Get everything before TITLES and after DESCRIPTIONS (before HASHTAG_SETS)
const prefix = aiJsContent.substring(0, titlesStart);
const suffix = aiJsContent.substring(hashtagStart);

// Build new content
const newContent = prefix + enhancedContent + '\n\n' + suffix;

// Write back
fs.writeFileSync(aiJsPath, newContent);
console.log('Successfully applied enhanced content to ai.js');

// Count lines
const titleMatches = enhancedContent.match(/^\t'/gm);
const descMatches = enhancedContent.match(/^\t'/gm);
console.log(`Enhanced content applied.`);
