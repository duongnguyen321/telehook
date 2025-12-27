/**
 * Migrate data from Supabase PostgreSQL to MongoDB Atlas
 * Run: bun run scripts/migrate-to-mongo.js
 *
 * This script is IDEMPOTENT - safe to run multiple times:
 * - Uses upsert for unique-key collections
 * - Skips collections that already have sufficient data
 */

import pg from 'pg';
import { MongoClient } from 'mongodb';

// Supabase PostgreSQL connection
const POSTGRES_URL =
	'postgresql://postgres.xtuvpndtntvaxebuyfhu:3zp6LuDnAXvb_P4@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';

// MongoDB connection
const MONGO_URL =
	'mongodb+srv://duongcoilc2004:Nguyenduong21104@cluster0.up9mqjz.mongodb.net/videogiaitri?retryWrites=true&w=majority';

async function migrate() {
	console.log('🚀 Starting migration from Supabase to MongoDB...\n');

	// Connect to PostgreSQL
	const pgClient = new pg.Client({ connectionString: POSTGRES_URL });
	await pgClient.connect();
	console.log('✅ Connected to PostgreSQL');

	// Connect to MongoDB
	const mongoClient = new MongoClient(MONGO_URL);
	await mongoClient.connect();
	const db = mongoClient.db('videogiaitri');
	console.log('✅ Connected to MongoDB\n');

	try {
		// Helper to check if collection needs migration
		const needsMigration = async (collection, pgTable) => {
			const mongoCount = await db.collection(collection).countDocuments();
			const { rows } = await pgClient.query(`SELECT COUNT(*) FROM ${pgTable}`);
			const pgCount = parseInt(rows[0].count, 10);

			if (mongoCount >= pgCount) {
				console.log(
					`   ⏭️  Skipped (MongoDB: ${mongoCount}, PostgreSQL: ${pgCount})`
				);
				return false;
			}
			console.log(`   � MongoDB: ${mongoCount}, PostgreSQL: ${pgCount}`);
			return true;
		};

		// 1. Migrate scheduled_posts
		console.log('📦 scheduled_posts...');
		if (await needsMigration('scheduled_posts', 'scheduled_posts')) {
			const { rows: posts } = await pgClient.query(
				'SELECT * FROM scheduled_posts'
			);
			for (const row of posts) {
				await db.collection('scheduled_posts').updateOne(
					{
						video_path: row.video_path,
						scheduled_at: new Date(row.scheduled_at),
					},
					{
						$setOnInsert: {
							chat_id: BigInt(row.chat_id),
							video_path: row.video_path,
							title: row.title,
							hashtags: row.hashtags,
							scheduled_at: new Date(row.scheduled_at),
							status: row.status,
							error: row.error,
							created_at: new Date(row.created_at),
							is_repost: row.is_repost,
							telegram_file_id: row.telegram_file_id,
							notification_sent: row.notification_sent,
						},
					},
					{ upsert: true }
				);
			}
			console.log(`   ✅ Processed ${posts.length} records`);
		}

		// 2. Migrate video_archive
		console.log('📦 video_archive...');
		if (await needsMigration('video_archive', 'video_archive')) {
			const { rows: archives } = await pgClient.query(
				'SELECT * FROM video_archive'
			);
			for (const row of archives) {
				await db.collection('video_archive').updateOne(
					{ video_path: row.video_path },
					{
						$setOnInsert: {
							chat_id: BigInt(row.chat_id),
							video_path: row.video_path,
							title: row.title,
							hashtags: row.hashtags,
							views: row.views,
							likes: row.likes,
							posted_at: new Date(row.posted_at),
							last_repost_at: row.last_repost_at
								? new Date(row.last_repost_at)
								: null,
							repost_count: row.repost_count,
						},
					},
					{ upsert: true }
				);
			}
			console.log(`   ✅ Processed ${archives.length} records`);
		}

		// 3. Migrate settings (upsert by key)
		console.log('📦 settings...');
		if (await needsMigration('settings', 'settings')) {
			const { rows: settings } = await pgClient.query('SELECT * FROM settings');
			for (const row of settings) {
				await db
					.collection('settings')
					.updateOne(
						{ key: row.key },
						{ $set: { key: row.key, value: row.value } },
						{ upsert: true }
					);
			}
			console.log(`   ✅ Processed ${settings.length} records`);
		}

		// 4. Migrate users (upsert by telegram_id)
		console.log('📦 users...');
		if (await needsMigration('users', 'users')) {
			const { rows: users } = await pgClient.query('SELECT * FROM users');
			for (const row of users) {
				await db.collection('users').updateOne(
					{ telegram_id: BigInt(row.telegram_id) },
					{
						$set: {
							telegram_id: BigInt(row.telegram_id),
							username: row.username,
							first_name: row.first_name,
							last_name: row.last_name,
							role: row.role,
							created_at: new Date(row.created_at),
							last_active_at: new Date(row.last_active_at),
						},
					},
					{ upsert: true }
				);
			}
			console.log(`   ✅ Processed ${users.length} records`);
		}

		// 5. Migrate downloaded_videos (upsert by file_id)
		console.log('📦 downloaded_videos...');
		if (await needsMigration('downloaded_videos', 'downloaded_videos')) {
			const { rows: downloads } = await pgClient.query(
				'SELECT * FROM downloaded_videos'
			);
			for (const row of downloads) {
				await db.collection('downloaded_videos').updateOne(
					{ file_id: row.file_id },
					{
						$set: {
							file_id: row.file_id,
							chat_id: BigInt(row.chat_id),
							video_path: row.video_path,
							file_size: row.file_size,
							downloaded_at: new Date(row.downloaded_at),
							status: row.status,
						},
					},
					{ upsert: true }
				);
			}
			console.log(`   ✅ Processed ${downloads.length} records`);
		}

		// 6. Migrate repost_cycle
		console.log('📦 repost_cycle...');
		if (await needsMigration('repost_cycle', 'repost_cycle')) {
			const { rows: cycles } = await pgClient.query(
				'SELECT * FROM repost_cycle'
			);
			for (const row of cycles) {
				await db.collection('repost_cycle').updateOne(
					{ video_id: row.video_id, cycle_number: row.cycle_number },
					{
						$setOnInsert: {
							video_id: row.video_id,
							repost_date: new Date(row.repost_date),
							cycle_number: row.cycle_number,
						},
					},
					{ upsert: true }
				);
			}
			console.log(`   ✅ Processed ${cycles.length} records`);
		}

		// 7. Migrate audit_logs (bulk insert, skip if already migrated)
		console.log('📦 audit_logs...');
		if (await needsMigration('audit_logs', 'audit_logs')) {
			const { rows: logs } = await pgClient.query(
				'SELECT * FROM audit_logs ORDER BY id'
			);

			// Get existing count to know where to start
			const existingCount = await db.collection('audit_logs').countDocuments();
			const toInsert = logs.slice(existingCount);

			if (toInsert.length > 0) {
				// Batch insert in chunks of 500
				const chunkSize = 500;
				for (let i = 0; i < toInsert.length; i += chunkSize) {
					const chunk = toInsert.slice(i, i + chunkSize);
					const logData = chunk.map((row) => ({
						telegram_id: BigInt(row.telegram_id),
						action: row.action,
						target_id: row.target_id,
						details: row.details,
						created_at: new Date(row.created_at),
					}));
					await db.collection('audit_logs').insertMany(logData);
					process.stdout.write(
						`   Inserted ${Math.min(i + chunkSize, toInsert.length)}/${
							toInsert.length
						}\r`
					);
				}
				console.log(`\n   ✅ Inserted ${toInsert.length} new records`);
			} else {
				console.log('   ✅ Already up to date');
			}
		}

		console.log('\n🎉 Migration completed successfully!');
	} catch (error) {
		console.error('\n❌ Migration failed:', error.message);
		throw error;
	} finally {
		await pgClient.end();
		await mongoClient.close();
		console.log('\n🔌 Connections closed');
	}
}

migrate().catch(console.error);
