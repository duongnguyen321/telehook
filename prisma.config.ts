import path from 'path';
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: {
		path: 'prisma/migrations',
	},
	engine: 'classic',
	datasource: {
		url: 'file:' + path.resolve(__dirname, './data/tiktok_bot.db'),
	},
});
