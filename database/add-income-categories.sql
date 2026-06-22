-- EVARAA Migration: Add Income Categories
-- Safe to run on existing database — no data loss, uses IF NOT EXISTS
-- Run this in Supabase SQL Editor

-- 1. Create income_categories table
CREATE TABLE IF NOT EXISTS income_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create index
CREATE INDEX IF NOT EXISTS idx_income_categories_user_id ON income_categories(user_id);

-- 3. Enable RLS
ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies (drop first to make re-runnable)
DROP POLICY IF EXISTS "Users can view their own income categories" ON income_categories;
DROP POLICY IF EXISTS "Users can create their own income categories" ON income_categories;
DROP POLICY IF EXISTS "Users can delete their own income categories" ON income_categories;

CREATE POLICY "Users can view their own income categories"
  ON income_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own income categories"
  ON income_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own income categories"
  ON income_categories FOR DELETE USING (auth.uid() = user_id);
