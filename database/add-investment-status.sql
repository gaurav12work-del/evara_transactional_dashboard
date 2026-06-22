-- EVARAA Migration: Add status column to investments
-- Safe to run on existing database — no data loss
-- "written_off" means money was recovered from the investment (sold/disposed)
-- Run this in Supabase SQL Editor

-- Add status column (defaults existing investments to 'active')
ALTER TABLE investments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'written_off'));
