-- =====================================================
-- Telegram Bot Tables for Supabase
-- Run this in Supabase SQL Editor
-- =====================================================

-- Scheduled Posts (main queue)
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id BIGINT NOT NULL,
  video_path TEXT NOT NULL,
  title TEXT NOT NULL,
  hashtags TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_repost BOOLEAN NOT NULL DEFAULT false,
  telegram_file_id TEXT,
  notification_sent BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON public.scheduled_posts(scheduled_at);

-- Video Archive (posted videos for repost system)
CREATE TABLE IF NOT EXISTS public.video_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id BIGINT NOT NULL,
  video_path TEXT NOT NULL,
  title TEXT NOT NULL,
  hashtags TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ NOT NULL,
  last_repost_at TIMESTAMPTZ,
  repost_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_video_archive_views ON public.video_archive(views DESC);

-- Repost Cycle (tracks which videos have been reposted in each cycle)
CREATE TABLE IF NOT EXISTS public.repost_cycle (
  id SERIAL PRIMARY KEY,
  video_id TEXT NOT NULL,
  repost_date TIMESTAMPTZ NOT NULL,
  cycle_number INTEGER NOT NULL DEFAULT 1
);

-- Settings (key-value store)
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Downloaded Videos (tracking for duplicate detection)
CREATE TABLE IF NOT EXISTS public.downloaded_videos (
  file_id TEXT PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  video_path TEXT NOT NULL,
  file_size INTEGER,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_downloaded_videos_chat_id ON public.downloaded_videos(chat_id);

-- Users (Telegram users tracking)
CREATE TABLE IF NOT EXISTS public.users (
  telegram_id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON public.users(telegram_id);

-- Audit Logs (action tracking)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_telegram_id ON public.audit_logs(telegram_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- =====================================================
-- Content Management Tables (if not already created)
-- These may already exist from the user's SQL
-- =====================================================

-- Videos table (content management)
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  duration INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tags table (should already exist from user's SQL)
-- CREATE TABLE IF NOT EXISTS public.tags (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name TEXT NOT NULL UNIQUE,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
-- );

-- Video Tags junction (should already exist from user's SQL)
-- CREATE TABLE IF NOT EXISTS public.video_tags (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
--   tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
--   UNIQUE (video_id, tag_id)
-- );

-- =====================================================
-- Row Level Security (RLS) - Optional
-- =====================================================

-- Enable RLS on all tables (but allow all operations for now)
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repost_cycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloaded_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (allow all for service role)
CREATE POLICY IF NOT EXISTS "Allow all for service role" ON public.scheduled_posts FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for service role" ON public.video_archive FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for service role" ON public.repost_cycle FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for service role" ON public.settings FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for service role" ON public.downloaded_videos FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for service role" ON public.users FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for service role" ON public.audit_logs FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for service role" ON public.videos FOR ALL USING (true);

-- Grant permissions to service role
GRANT ALL ON public.scheduled_posts TO service_role;
GRANT ALL ON public.video_archive TO service_role;
GRANT ALL ON public.repost_cycle TO service_role;
GRANT ALL ON public.settings TO service_role;
GRANT ALL ON public.downloaded_videos TO service_role;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.videos TO service_role;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
