-- EVARAA Safe Migration Script
-- This will NOT delete any existing data
-- Run this if you already have the old schema and need to upgrade

-- ============================================================
-- 1. Create new tables (IF NOT EXISTS = safe to re-run)
-- ============================================================

-- Remove old initial_balance column from properties if it exists
ALTER TABLE properties DROP COLUMN IF EXISTS initial_balance;

-- Expense Categories (user-defined)
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Investment Categories (user-defined)
CREATE TABLE IF NOT EXISTS investment_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Investments table (separate from regular expenses)
CREATE TABLE IF NOT EXISTS investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Monthly Opening Balances (manual override, auto-carries forward)
CREATE TABLE IF NOT EXISTS monthly_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(property_id, month, year)
);

-- ============================================================
-- 2. Create indexes (IF NOT EXISTS = safe to re-run)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON expense_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_categories_user_id ON investment_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_property_id ON transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_investments_property_id ON investments(property_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_date ON investments(date);
CREATE INDEX IF NOT EXISTS idx_monthly_balances_property_id ON monthly_balances(property_id);

-- ============================================================
-- 3. Enable RLS on all tables (safe to re-run)
-- ============================================================

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_balances ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. Drop old policies and recreate with secure versions
--    (DROP IF EXISTS is safe, won't fail if policy doesn't exist)
-- ============================================================

-- Properties policies
DROP POLICY IF EXISTS "Users can view their own properties" ON properties;
DROP POLICY IF EXISTS "Users can create their own properties" ON properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON properties;

CREATE POLICY "Users can view their own properties"
  ON properties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own properties"
  ON properties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own properties"
  ON properties FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own properties"
  ON properties FOR DELETE USING (auth.uid() = user_id);

-- Expense Categories policies
DROP POLICY IF EXISTS "Users can view their own expense categories" ON expense_categories;
DROP POLICY IF EXISTS "Users can create their own expense categories" ON expense_categories;
DROP POLICY IF EXISTS "Users can delete their own expense categories" ON expense_categories;

CREATE POLICY "Users can view their own expense categories"
  ON expense_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own expense categories"
  ON expense_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own expense categories"
  ON expense_categories FOR DELETE USING (auth.uid() = user_id);

-- Investment Categories policies
DROP POLICY IF EXISTS "Users can view their own investment categories" ON investment_categories;
DROP POLICY IF EXISTS "Users can create their own investment categories" ON investment_categories;
DROP POLICY IF EXISTS "Users can delete their own investment categories" ON investment_categories;

CREATE POLICY "Users can view their own investment categories"
  ON investment_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own investment categories"
  ON investment_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own investment categories"
  ON investment_categories FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies (with property ownership check)
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transactions"
  ON transactions FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Investments policies (with property ownership check)
DROP POLICY IF EXISTS "Users can view their own investments" ON investments;
DROP POLICY IF EXISTS "Users can create their own investments" ON investments;
DROP POLICY IF EXISTS "Users can update their own investments" ON investments;
DROP POLICY IF EXISTS "Users can delete their own investments" ON investments;

CREATE POLICY "Users can view their own investments"
  ON investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own investments"
  ON investments FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update their own investments"
  ON investments FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete their own investments"
  ON investments FOR DELETE USING (auth.uid() = user_id);

-- Monthly Balances policies (with property ownership check)
DROP POLICY IF EXISTS "Users can view their own monthly balances" ON monthly_balances;
DROP POLICY IF EXISTS "Users can create their own monthly balances" ON monthly_balances;
DROP POLICY IF EXISTS "Users can update their own monthly balances" ON monthly_balances;
DROP POLICY IF EXISTS "Users can delete their own monthly balances" ON monthly_balances;

CREATE POLICY "Users can view their own monthly balances"
  ON monthly_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own monthly balances"
  ON monthly_balances FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update their own monthly balances"
  ON monthly_balances FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND property_id IN (SELECT id FROM properties WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete their own monthly balances"
  ON monthly_balances FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 5. Triggers (CREATE OR REPLACE = safe to re-run)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monthly_balances_updated_at ON monthly_balances;
CREATE TRIGGER update_monthly_balances_updated_at
  BEFORE UPDATE ON monthly_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
