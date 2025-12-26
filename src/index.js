import 'dotenv/config';
import { Bot } from 'grammy';
import { setupVideoHandler } from './handlers/videoHandler.js';
import { setBot, startWorker } from './services/scheduler.js';

// Validate environment
if (!process.env.TELEGRAM_BOT_TOKEN) {
	console.error('❌ TELEGRAM_BOT_TOKEN is required');
	process.exit(1);
}

// Create bot
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Setup handlers
setupVideoHandler(bot);

// Set bot for scheduler notifications
setBot(bot);

// Start worker for processing uploads
startWorker();

// Error handling
bot.catch((err) => {
	console.error('Bot error:', err);
});

// Start bot
console.log('🤖 Starting Telegram TikTok Hook Bot...');
bot
	.start({
		drop_pending_updates: true, // Don't process old messages on restart
		onStart: (botInfo) => {
			console.log(`✅ Bot started: @${botInfo.username}`);
			console.log('📹 Ready to receive videos!');
		},
	})
	.catch((err) => {
		console.error('❌ Failed to start bot:', err.message);
		process.exit(1);
	});
