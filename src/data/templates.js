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

	// ==================== NEW DIVERSE TEMPLATES (Added based on feedback) ====================

	// Action-First & Direct
	'{ACTIVITY} {LOCATION}, {PEOPLE} {ROLE} vô tình để lộ {FOCUS}.',
	'{POSE} {LOCATION}, {PEOPLE} {ROLE} {EMOTION} khoe trọn {FOCUS}.',
	'Chỉ cần {ACTIVITY}, {PEOPLE} {ROLE} đã khiến bao người {EMOTION}.',
	'Thử thách {ACTIVITY} {CONTEXT}, {ROLE} {EMOTION} show {FOCUS}.',

	// POV / Emotional / Storytelling
	'POV: Bắt gặp {PEOPLE} {ROLE} {ACTIVITY} {LOCATION}, {EMOTION} quá.',
	'Góc nhìn của {ROLE} khi {ACTIVITY} {LOCATION}: Thật {EMOTION}.',
	'Cảm giác {EMOTION} khó tả khi {ROLE} diện {OUTFIT} {ACTIVITY}.',
	'Ai làm {PEOPLE} {ROLE} {EMOTION} thế này? Chỉ là {ACTIVITY} thôi mà.',
	'Một chút {EMOTION} {CONTEXT} cùng {PEOPLE} {ROLE}.',

	// Focus on details
	'{FOCUS} của {ROLE} hôm nay thật {EMOTION} trong bộ {OUTFIT}.',
	'Không thể rời mắt khỏi {FOCUS} khi {ROLE} {ACTIVITY} {LOCATION}.',
	'Vẻ đẹp {EMOTION} của {ROLE} khi {POSE} với {OUTFIT}.',

	// Questions & Engagement
	'Có ai thích {ROLE} {HAIR} diện {OUTFIT} {ACTIVITY} không?',
	'{PEOPLE} {ROLE} {EMOTION} thế này đã đủ chuẩn chưa?',
	'Mọi người chấm mấy điểm cho {FOCUS} của {ROLE} {CONTEXT}?',
	'Thích {ROLE} {ACTIVITY} hay {POSE} hơn?',

	// Short & Punchy
	'{ROLE} {ACTIVITY}. {EMOTION} quá.',
	'{CONTEXT}. {ROLE} {POSE}.',
	'{OUTFIT} {EMOTION}. {ROLE} {ACTIVITY}.',
	'{LOCATION}. {ROLE} {EMOTION}.',
];
