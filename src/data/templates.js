/**
 * Shared sentence templates for content generation
 * Used by:
 * - src/services/ai.js (Dynamic generation)
 * - scripts/generate-combined-sentences.js (Static generation)
 */

export const TEMPLATES = [
	// Full coverage templates (9-10 categories) with PEOPLE
	'{CONTEXT}, {PEOPLE} {ROLE} {EMOTION} mặc {OUTFIT} {ACTIVITY} {LOCATION}, khoe {FOCUS} với {HAIR}.',
	'{PEOPLE} {ROLE} với {HAIR} {EMOTION} diện {OUTFIT} {POSE} {LOCATION}, {ACTIVITY} khoe {FOCUS} {CONTEXT}.',
	'{CONTEXT}, {PEOPLE} {ROLE} {EMOTION} {POSE} {LOCATION}, khoe {FOCUS} với {OUTFIT}.',

	// 7-9 categories with PEOPLE
	'{CONTEXT}, {PEOPLE} {ROLE} {EMOTION} mặc {OUTFIT} {ACTIVITY} {LOCATION}, {POSE} khoe {FOCUS}.',
	'{PEOPLE} {ROLE} với {HAIR} {EMOTION} {POSE} {LOCATION}, khoe {FOCUS}.',
	'{CONTEXT}, {PEOPLE} {ROLE} {HAIR} diện {OUTFIT}, {EMOTION} {ACTIVITY} khoe {FOCUS}.',

	// 6-8 categories
	'{CONTEXT}, {ROLE} {EMOTION} mặc {OUTFIT} {ACTIVITY} {LOCATION}, {POSE} khoe {FOCUS}.',
	'{ROLE} với {HAIR} {EMOTION} {POSE} {LOCATION}, khoe {FOCUS}.',
	'{CONTEXT}, {ROLE} {HAIR} diện {OUTFIT}, {EMOTION} {ACTIVITY} khoe {FOCUS}.',

	// 5-7 categories
	'{CONTEXT}, {ROLE} {EMOTION} mặc {OUTFIT} {ACTIVITY} {LOCATION}.',
	'{CONTEXT}, {ROLE} {EMOTION} diện {OUTFIT} rồi {ACTIVITY}.',
	'{CONTEXT}, {ROLE} cảm thấy {EMOTION} khi {ACTIVITY} {LOCATION}.',
	'{CONTEXT}, {ROLE} với {HAIR} diện {OUTFIT}, {EMOTION} khoe {FOCUS}.',
	'Góc nhìn {EMOTION}: {ROLE} với {FOCUS} trong bộ {OUTFIT} {LOCATION}.',
	'{PEOPLE} {ROLE} {EMOTION} {ACTIVITY} {LOCATION}, khoe {FOCUS}.',

	// 4-6 categories
	'{CONTEXT}, {ROLE} {HAIR} tự tin khoe {FOCUS}.',
	'{CONTEXT}, {ROLE} {EMOTION} {POSE} {LOCATION}.',
	'{ROLE} với {HAIR} đang {POSE} {LOCATION}, {EMOTION} khoe {FOCUS}.',
	'{CONTEXT}, {ROLE} {EMOTION} gửi {FOCUS} từ {POSE} {LOCATION}.',
	'{CONTEXT}, {ROLE} {ACTIVITY} {LOCATION}, {EMOTION} khoe {FOCUS}.',
	'{PEOPLE} {ROLE} {EMOTION} {ACTIVITY} khoe {FOCUS} {CONTEXT}.',

	// 3-5 categories
	'{ROLE} {EMOTION} {ACTIVITY} để lộ {FOCUS} {CONTEXT}.',
	'{ROLE} mặc {OUTFIT} {ACTIVITY}, cảm giác thật {EMOTION} {LOCATION}.',
	'{CONTEXT}, {ROLE} {HAIR} {EMOTION} {ACTIVITY}.',
	'{ROLE} {EMOTION} với {FOCUS} {LOCATION} {CONTEXT}.',
	'{OUTFIT} của {ROLE} {EMOTION} quá {CONTEXT}.',
	'{CONTEXT}, thật {EMOTION} khi {ROLE} {HAIR} {POSE} {LOCATION}.',
	'{CONTEXT}, {ROLE} với {HAIR} chỉ muốn {ACTIVITY}.',
	'{ROLE} {EMOTION} check-in {LOCATION} với {OUTFIT} và {HAIR}.',
];
