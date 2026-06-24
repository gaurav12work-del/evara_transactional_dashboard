export type TransactionType = "income" | "expense";

export interface Property {
  id: string;
  user_id: string;
  name: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface IncomeCategory {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface IncomeCategory {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface InvestmentCategory {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  property_id: string;
  user_id: string;
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

export type InvestmentStatus = "active" | "written_off";

export interface Investment {
  id: string;
  property_id: string;
  user_id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  status: InvestmentStatus;
  created_at: string;
}

export interface MonthlyBalance {
  id: string;
  property_id: string;
  user_id: string;
  month: number;
  year: number;
  opening_balance: number;
  created_at: string;
  updated_at: string;
}

export interface ComputedMonthlyData {
  month: number;
  year: number;
  openingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalInvestments: number;
  totalRecovered: number;
  closingBalance: number;
}
