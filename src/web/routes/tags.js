/**
 * Tags Routes - Get available hashtags
 */

import express from 'express';
import { authMiddleware } from './auth.js';
import { getCategories, getCategoryOptions } from '../../services/ai.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Get all available tags/categories
 */
router.get('/', async (req, res) => {
	try {
		const categories = getCategories();

		// Build flat list of all hashtags
		const allTags = new Set();

		for (const cat of categories) {
			const options = getCategoryOptions(cat.key);
			for (const opt of options) {
				if (opt.tag) {
					allTags.add(opt.tag);
				}
				if (opt.tags) {
					opt.tags.forEach((t) => allTags.add(t));
				}
			}
		}

		// Common popular hashtags
		const popularTags = [
			'#gaixinh',
			'#hotgirl',
			'#sexy',
			'#cute',
			'#fyp',
			'#viral',
			'#trending',
			'#vietnam',
			'#tiktokvietnam',
			'#xuhuong',
		];

		res.json({
			categories: categories.map((c) => ({
				key: c.key,
				name: c.name,
				options: getCategoryOptions(c.key).map((o) => ({
					key: o.key,
					label: o.label,
					tags: o.tags || [o.tag],
				})),
			})),
			popularTags,
			allTags: Array.from(allTags),
		});
	} catch (error) {
		console.error('[Tags API] Error:', error);
		res.status(500).json({ error: error.message });
	}
});

export default router;
