-- EVARAA Transactional Dashboard Schema
-- Run this in Supabase SQL Editor

-- Properties table
CREATE TABLE properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Expense Categories (user-defined)
CREATE TABLE expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Investment Categories (user-defined)
CREATE TABLE investment_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Transactions table (income and expenses)
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Investments table (separate from regular expenses)
CREATE TABLE investments (
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
CREATE TABLE monthly_balances (
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

-- Indexes
CREATE INDEX idx_properties_user_id ON properties(user_id);
CREATE INDEX idx_expense_categories_user_id ON expense_categories(user_id);
CREATE INDEX idx_investment_categories_user_id ON investment_categories(user_id);
CREATE INDEX idx_transactions_property_id ON transactions(property_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_investments_property_id ON investments(property_id);
CREATE INDEX idx_investments_user_id ON investments(user_id);
CREATE INDEX idx_investments_date ON investments(date);
CREATE INDEX idx_monthly_balances_property_id ON monthly_balances(property_id);

-- Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_balances ENABLE ROW LEVEL SECURITY;

-- Properties policies
CREATE POLICY "Users can view their own properties"
  ON properties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own properties"
  ON properties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own properties"
  ON properties FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own properties"
  ON properties FOR DELETE USING (auth.uid() = user_id);

-- Expense Categories policies
CREATE POLICY "Users can view their own expense categories"
  ON expense_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own expense categories"
  ON expense_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own expense categories"
  ON expense_categories FOR DELETE USING (auth.uid() = user_id);

-- Investment Categories policies
CREATE POLICY "Users can view their own investment categories"
  ON investment_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own investment categories"
  ON investment_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own investment categories"
  ON investment_categories FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
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

-- Investments policies
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

-- Monthly Balances policies
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

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_balances_updated_at
  BEFORE UPDATE ON monthly_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
