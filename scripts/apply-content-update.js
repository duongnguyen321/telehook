import fs from 'fs';
import path from 'path';

const aiJsPath = path.join(process.cwd(), 'src/services/ai.js');
const newContentPath = '/tmp/filtered-content-final.js';

const aiJsContent = fs.readFileSync(aiJsPath, 'utf8');
const newContent = fs.readFileSync(newContentPath, 'utf8');

// Identify start and end markers
const startMarker = 'export const TITLES = [';
const endMarker = 'export const HASHTAG_SETS = [';

const startIndex = aiJsContent.indexOf(startMarker);
const endIndex = aiJsContent.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
	console.error('Could not find markers in ai.js');
	process.exit(1);
}

// Find lines before HASHTAG_SETS to preserve comments if needed,
// but actually the new content ends with DESCRIPTIONS array.
// We need to verify what is between DESCRIPTIONS and HASHTAG_SETS in the original file.
// Looking at view_file output, there are some comments before HASHTAG_SETS (lines 1914-1915).
// " // 40+ hashtag sets - TẤT CẢ phải có #xuhuong #fyp (bắt buộc)"
// The endIndex currently points to "export const HASHTAG_SETS".
// So we should back up to include the comments before it.

// Let's look for " // 40+ hashtag sets"
const commentMarker = '// 40+ hashtag sets';
const commentIndex = aiJsContent.indexOf(commentMarker);

const finalEndIndex = commentIndex !== -1 ? commentIndex : endIndex;

const prefix = aiJsContent.substring(0, startIndex);
const suffix = aiJsContent.substring(finalEndIndex);

const updatedContent = prefix + newContent + '\n\n' + suffix;

fs.writeFileSync(aiJsPath, updatedContent);
console.log('Successfully updated ai.js with filtered content.');
