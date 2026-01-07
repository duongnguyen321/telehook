/**
 * Web Dashboard Server
 * Express server for video management dashboard with Socket.io
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { Server as SocketIO } from 'socket.io';
import authRoutes from './routes/auth.js';
import videoRoutes from './routes/videos.js';
import tagRoutes from './routes/tags.js';
import adminRoutes from './routes/admin.js';
import contentRoutes from './routes/content.js';
import broadcastRoutes from './routes/broadcast.js';
import chatRoutes from './routes/chat.js';
import channelRoutes from './routes/channels.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let bot = null;
let io = null;

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
 * Get Socket.io instance
 */
export function getIO() {
	return io;
}

/**
 * Emit a socket event to all connected clients
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export function emitEvent(event, data) {
	if (io) {
		io.emit(event, data);
	}
}

/**
 * Start the web server
 */
export function startWebServer() {
	const app = express();
	const server = http.createServer(app);
	const PORT = process.env.WEB_PORT || 8888;

	// Socket.io setup
	io = new SocketIO(server, {
		cors: {
			origin: '*',
			methods: ['GET', 'POST'],
		},
	});

	// Socket.io connection handling
	io.on('connection', (socket) => {
		console.log('[Socket.io] Client connected:', socket.id);

		socket.on('disconnect', () => {
			console.log('[Socket.io] Client disconnected:', socket.id);
		});

		// Admin joins chat room
		socket.on('join_admin', () => {
			socket.join('admin_room');
			console.log('[Socket.io] Admin joined room:', socket.id);
		});
	});

	// Middleware
	app.use(cors());
	app.use(express.json());

	// Static files
	app.use(express.static(path.join(__dirname, 'public'), { index: false }));

	// API Routes
	app.use('/api/auth', authRoutes);
	app.use('/api/videos', videoRoutes);
	app.use('/api/tags', tagRoutes);
	app.use('/api/admin', adminRoutes);
	app.use('/api/content', contentRoutes);
	app.use('/api/broadcast', broadcastRoutes);
	app.use('/api/chat', chatRoutes);
	app.use('/api/channels', channelRoutes);

	// User Feed (Main Page) - Served by express.static('public') automatically as index.html
	// But we can keep explicit route if needed.
	// Since we disabled index in static, we map / to index.html (Authentication Feed)
	app.get('/', (req, res) => {
		res.sendFile(path.join(__dirname, 'public', 'index.html'));
	});

	// Admin Dashboard
	app.get('/admin', (req, res) => {
		res.sendFile(path.join(__dirname, 'public', 'admin.html'));
	});

	// SPA fallback - default to Feed
	app.get('/{*path}', (req, res) => {
		// If path starts with /admin, fallback to admin.html (admin app)
		if (req.path.startsWith('/admin')) {
			res.sendFile(path.join(__dirname, 'public', 'admin.html'));
		} else {
			// Otherwise default to feed (index.html)
			res.sendFile(path.join(__dirname, 'public', 'index.html'));
		}
	});

	server.listen(PORT, () => {
		console.log(`[Web] Dashboard running at http://localhost:${PORT}`);
		console.log(`[Socket.io] Server ready`);
	});

	return { app, server, io };
}
