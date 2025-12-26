import { prisma } from '../utils/prisma.js';

/**
 * Create a new tag
 * @param {string} name - Tag name (will be normalized to lowercase)
 * @returns {Promise<Object>} Created tag
 */
export async function createTag(name) {
	const normalizedName = name.toLowerCase().trim().replace(/^#/, '');

	const tag = await prisma.tag.upsert({
		where: { name: normalizedName },
		update: {},
		create: { name: normalizedName },
	});

	console.log(`[Tag] Created/found tag: ${normalizedName}`);
	return tag;
}

/**
 * Get all tags
 * @returns {Promise<Object[]>} Array of tags
 */
export async function getAllTags() {
	return prisma.tag.findMany({
		orderBy: { name: 'asc' },
	});
}

/**
 * Delete a tag by name
 * @param {string} name - Tag name
 * @returns {Promise<boolean>} Success status
 */
export async function deleteTag(name) {
	const normalizedName = name.toLowerCase().trim().replace(/^#/, '');

	try {
		await prisma.tag.delete({
			where: { name: normalizedName },
		});
		console.log(`[Tag] Deleted tag: ${normalizedName}`);
		return true;
	} catch (error) {
		console.error(`[Tag] Delete failed: ${error.message}`);
		return false;
	}
}

/**
 * Get or create multiple tags from hashtag strings
 * @param {string} hashtagString - String like "#sexy #dance #hot"
 * @returns {Promise<Object[]>} Array of tags
 */
export async function getOrCreateTagsFromHashtags(hashtagString) {
	// Parse hashtags
	const tagNames = hashtagString
		.split(/\s+/)
		.filter((t) => t.startsWith('#'))
		.map((t) => t.toLowerCase().replace(/^#/, '').trim())
		.filter((t) => t.length > 0);

	if (tagNames.length === 0) return [];

	const tags = [];
	for (const name of tagNames) {
		const tag = await prisma.tag.upsert({
			where: { name },
			update: {},
			create: { name },
		});
		tags.push(tag);
	}

	return tags;
}

/**
 * Create a video record and link tags
 * @param {Object} params - Video parameters
 * @param {string} params.title - Video title
 * @param {string} params.storagePath - S3 storage path (filename)
 * @param {string} params.hashtags - Hashtag string
 * @param {number} [params.duration] - Video duration in seconds
 * @returns {Promise<Object>} Created video with tags
 */
export async function createVideoWithTags({
	title,
	storagePath,
	hashtags,
	duration,
}) {
	// Create or get tags first
	const tags = await getOrCreateTagsFromHashtags(hashtags);

	// Create video
	const video = await prisma.video.create({
		data: {
			title,
			storagePath,
			duration,
			videoTags: {
				create: tags.map((tag) => ({
					tagId: tag.id,
				})),
			},
		},
		include: {
			videoTags: {
				include: {
					tag: true,
				},
			},
		},
	});

	console.log(`[Video] Created video: ${video.id} with ${tags.length} tags`);
	return video;
}

/**
 * Get video by storage path
 * @param {string} storagePath - S3 storage path (filename)
 * @returns {Promise<Object|null>} Video or null
 */
export async function getVideoByStoragePath(storagePath) {
	return prisma.video.findFirst({
		where: { storagePath },
		include: {
			videoTags: {
				include: {
					tag: true,
				},
			},
		},
	});
}

/**
 * Link tags to an existing video
 * @param {string} videoId - Video UUID
 * @param {string[]} tagIds - Array of tag UUIDs
 */
export async function linkVideoTags(videoId, tagIds) {
	for (const tagId of tagIds) {
		await prisma.videoTag.upsert({
			where: {
				videoId_tagId: { videoId, tagId },
			},
			update: {},
			create: { videoId, tagId },
		});
	}
	console.log(
		`[Video] Linked ${tagIds.length} tags to video ${videoId.slice(0, 8)}`
	);
}
