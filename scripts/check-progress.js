/**
 * Quick check: How many videos still have integer durations?
 */

import { prisma } from '../src/utils/storage.js';

async function checkProgress() {
	const videos = await prisma.scheduledPost.findMany({
		where: {
			status: { in: ['pending', 'posted'] },
			duration: { not: null },
		},
		select: { duration: true },
	});

	let integerCount = 0;
	let preciseCount = 0;

	videos.forEach((v) => {
		const decimalPart = Math.abs(v.duration - Math.round(v.duration));
		if (decimalPart < 0.001) {
			integerCount++;
		} else {
			preciseCount++;
		}
	});

	console.log('=== Duration Migration Progress ===');
	console.log(`Total videos: ${videos.length}`);
	console.log(`Still integer (need update): ${integerCount}`);
	console.log(`Already precise (done): ${preciseCount}`);
	console.log(`Progress: ${Math.round((preciseCount / videos.length) * 100)}%`);

	await prisma.$disconnect();
}

checkProgress().catch(console.error);
