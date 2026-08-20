-- EVARAA Migration: Allow renaming categories
-- Safe to run on existing database — no data loss
-- The category tables were created with SELECT/INSERT/DELETE policies only,
-- so UPDATE was silently blocked by RLS. This adds the missing policies.
-- Run this in Supabase SQL Editor

DROP POLICY IF EXISTS "Users can update their own income categories" ON income_categories;
CREATE POLICY "Users can update their own income categories"
  ON income_categories FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own expense categories" ON expense_categories;
CREATE POLICY "Users can update their own expense categories"
  ON expense_categories FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own investment categories" ON investment_categories;
CREATE POLICY "Users can update their own investment categories"
  ON investment_categories FOR UPDATE USING (auth.uid() = user_id);
