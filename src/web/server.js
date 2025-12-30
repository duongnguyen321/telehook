/**
 * Web Dashboard Server
 * Express server for video management dashboard
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import videoRoutes from './routes/videos.js';
import tagRoutes from './routes/tags.js';
import adminRoutes from './routes/admin.js';
import contentRoutes from './routes/content.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let bot = null;

/**
 * Set bot instance for sending OTP messages
 */
export function setBot(botInstance) {
	bot = botInstance;
}

/**
 * Get bot instance
 */
export function getBot() {
	return bot;
}

/**
 * Start the web server
 */
export function startWebServer() {
	const app = express();
	const PORT = process.env.WEB_PORT || 8888;

	// Middleware
	app.use(cors());
	app.use(express.json());

	// Static files
	app.use(express.static(path.join(__dirname, 'public')));

	// API Routes
	app.use('/api/auth', authRoutes);
	app.use('/api/videos', videoRoutes);
	app.use('/api/tags', tagRoutes);
	app.use('/api/admin', adminRoutes);
	app.use('/api/content', contentRoutes);

	// SPA fallback - use explicit path for Express 5 compatibility
	app.get('/{*path}', (req, res) => {
		res.sendFile(path.join(__dirname, 'public', 'index.html'));
	});

	app.listen(PORT, () => {
		console.log(`[Web] Dashboard running at http://localhost:${PORT}`);
	});

	return app;
}
