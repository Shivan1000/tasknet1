-- Essential updates for TaskNet functionality
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_id_display TEXT UNIQUE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Tier 1';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS subreddit TEXT;

-- Add status and claiming info to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS claimed_by TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_data JSONB;

-- Add balance to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0.00;

-- Add password column to profiles for authentication
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;

-- Add payout_methods column to profiles for storing payment methods
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_methods JSONB DEFAULT '[]'::jsonb;

-- Create alerts table
CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
