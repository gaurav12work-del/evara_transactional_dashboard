"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Property, Transaction, Investment, MonthlyBalance } from "@/types";
import { formatCurrency, getCurrentMonthData, computeMonthlyData, getShortMonthName } from "@/lib/utils";
import PropertySwitcher from "@/components/property-switcher";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Package,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const COLORS = ["#556b2f", "#8b9a6b", "#c68b2c", "#6b3a2a", "#7d8b5e", "#8b5e4a"];

const DashboardPage = () => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [monthlyBalances, setMonthlyBalances] = useState<MonthlyBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: propsData } = await supabase
      .from("properties")
      .select("*")
      .order("name");
    if (propsData) setProperties(propsData);

    let txQuery = supabase.from("transactions").select("*").order("date", { ascending: false });
    let invQuery = supabase.from("investments").select("*").order("date", { ascending: false });
    let balQuery = supabase.from("monthly_balances").select("*");

    if (selectedPropertyId) {
      txQuery = txQuery.eq("property_id", selectedPropertyId);
      invQuery = invQuery.eq("property_id", selectedPropertyId);
      balQuery = balQuery.eq("property_id", selectedPropertyId);
    }

    const [{ data: txData }, { data: invData }, { data: balData }] =
      await Promise.all([txQuery, invQuery, balQuery]);

    if (txData) setTransactions(txData);
    if (invData) setInvestments(invData);
    if (balData) setMonthlyBalances(balData);

    setLoading(false);
  }, [selectedPropertyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentMonth = getCurrentMonthData(transactions, investments, monthlyBalances);

  const now = new Date();
  const startMonth = now.getMonth() >= 5 ? now.getMonth() - 4 : 1;
  const startYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;

  const monthlyData = computeMonthlyData(
    transactions,
    investments,
    monthlyBalances,
    startMonth,
    startYear,
    now.getMonth() + 1,
    now.getFullYear()
  );

  const chartData = monthlyData.map((m) => ({
    name: `${getShortMonthName(m.month)} ${m.year}`,
    income: m.totalIncome,
    expenses: m.totalExpenses,
    investments: m.totalInvestments,
    balance: m.closingBalance,
  }));

  const categoryData = transactions
    .filter((t) => t.type === "expense")
    .reduce(
      (acc, t) => {
        const existing = acc.find((a) => a.name === t.category);
        if (existing) {
          existing.value += t.amount;
        } else {
          acc.push({ name: t.category, value: t.amount });
        }
        return acc;
      },
      [] as { name: string; value: number }[]
    );

  const recentTransactions = transactions.slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your property finances
          </p>
        </div>
        <PropertySwitcher
          selectedPropertyId={selectedPropertyId}
          onPropertyChange={setSelectedPropertyId}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Opening</p>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">
            {formatCurrency(currentMonth.openingBalance)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Income</p>
            <ArrowUpRight className="h-4 w-4 text-success" />
          </div>
          <p className="mt-2 text-xl font-bold text-success">
            {formatCurrency(currentMonth.totalIncome)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expenses</p>
            <ArrowDownRight className="h-4 w-4 text-destructive" />
          </div>
          <p className="mt-2 text-xl font-bold text-destructive">
            {formatCurrency(currentMonth.totalExpenses)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Investments</p>
            <Package className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-xl font-bold text-primary">
            {formatCurrency(currentMonth.totalInvestments)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Closing</p>
            <DollarSign className="h-4 w-4 text-foreground" />
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">
            {formatCurrency(currentMonth.closingBalance)}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs">
            {currentMonth.closingBalance >= currentMonth.openingBalance ? (
              <>
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="text-success">Profit</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-3 w-3 text-destructive" />
                <span className="text-destructive">Loss</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expenses vs Investments Bar Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Monthly Breakdown
          </h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9cfc2" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} />
                <YAxis fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #d9cfc2",
                    backgroundColor: "#faf6f0",
                  }}
                />
                <Legend />
                <Bar dataKey="income" fill="#4a7c3f" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expenses" fill="#b94a3b" radius={[4, 4, 0, 0]} name="Expenses" />
                <Bar dataKey="investments" fill="#556b2f" radius={[4, 4, 0, 0]} name="Investments" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data yet. Add transactions to see charts.
            </div>
          )}
        </div>

        {/* Expense Breakdown Pie Chart */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Expense Breakdown
          </h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #d9cfc2",
                    backgroundColor: "#faf6f0",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No expenses yet.
            </div>
          )}
        </div>
      </div>

      {/* Balance Trend Line Chart */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Balance Trend
        </h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9cfc2" />
              <XAxis dataKey="name" fontSize={12} tickLine={false} />
              <YAxis fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #d9cfc2",
                  backgroundColor: "#faf6f0",
                }}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#556b2f"
                strokeWidth={2}
                dot={{ fill: "#556b2f" }}
                name="Closing Balance"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            No data yet.
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Recent Transactions
        </h2>
        {recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center ${
                      tx.type === "income"
                        ? "bg-success/10"
                        : "bg-destructive/10"
                    }`}
                  >
                    {tx.type === "income" ? (
                      <ArrowUpRight className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {tx.description || tx.category}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.category} &bull; {new Date(tx.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    tx.type === "income" ? "text-success" : "text-destructive"
                  }`}
                >
                  {tx.type === "income" ? "+" : "-"}
                  {formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No transactions yet. Add your first transaction to get started.
          </p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
