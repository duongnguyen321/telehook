import { prisma } from '../src/utils/prisma.js';
import path from 'path';

async function fixVideoPaths() {
	console.log('Starting video path cleanup...');

	// 1. Get all posts
	const posts = await prisma.scheduledPost.findMany();
	console.log(`Found ${posts.length} total posts.`);

	let updatedCount = 0;

	// 2. Normalize paths
	console.log('Normalizing paths...');
	for (const post of posts) {
		const currentPath = post.videoPath;
		const normalizedPath = path.basename(currentPath);

		if (currentPath !== normalizedPath) {
			await prisma.scheduledPost.update({
				where: { id: post.id },
				data: { videoPath: normalizedPath },
			});
			updatedCount++;
			process.stdout.write('.');
		}
	}
	console.log(`\nNormalized ${updatedCount} paths.`);

	// 3. Find and remove duplicates (keep oldest)
	console.log('Checking for duplicates...');
	const allPosts = await prisma.scheduledPost.findMany({
		orderBy: { createdAt: 'asc' }, // Keep oldest
	});

	const seenPaths = new Map();
	let duplicatesRemoved = 0;

	for (const post of allPosts) {
		const videoKey = post.videoPath; // Already normalized

		if (seenPaths.has(videoKey)) {
			// Duplicate found! Remove it.
			const originalId = seenPaths.get(videoKey);
			console.log(
				`Duplicate found: ${post.id} is duplicate of ${originalId} (${videoKey})`
			);

			// Delete related downloadedVideo records first if any
			// (Though downloadedVideo usually uses fileId, but just in case logic relies on videoPath)

			await prisma.scheduledPost.delete({
				where: { id: post.id },
			});
			duplicatesRemoved++;
		} else {
			seenPaths.set(videoKey, post.id);
		}
	}

	console.log(`Removed ${duplicatesRemoved} duplicate posts.`);
	console.log('Cleanup complete!');
}

fixVideoPaths()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
