"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ExpenseCategory, IncomeCategory, InvestmentCategory, MonthlyBalance, Property } from "@/types";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { Plus, X, Info } from "lucide-react";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i);

const SetupPage = () => {
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [investmentCategories, setInvestmentCategories] = useState<InvestmentCategory[]>([]);
  const [monthlyBalances, setMonthlyBalances] = useState<MonthlyBalance[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [newIncomeCat, setNewIncomeCat] = useState("");
  const [newExpenseCat, setNewExpenseCat] = useState("");
  const [newInvestmentCat, setNewInvestmentCat] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [balanceMonth, setBalanceMonth] = useState(new Date().getMonth() + 1);
  const [balanceYear, setBalanceYear] = useState(CURRENT_YEAR);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);

    const [
      { data: incCats },
      { data: expCats },
      { data: invCats },
      { data: props },
      { data: balances },
    ] = await Promise.all([
      supabase.from("income_categories").select("*").order("name"),
      supabase.from("expense_categories").select("*").order("name"),
      supabase.from("investment_categories").select("*").order("name"),
      supabase.from("properties").select("*").order("name"),
      supabase.from("monthly_balances").select("*").order("year").order("month"),
    ]);

    if (incCats) setIncomeCategories(incCats);
    if (expCats) setExpenseCategories(expCats);
    if (invCats) setInvestmentCategories(invCats);
    if (props) {
      setProperties(props);
      if (!selectedProperty && props.length > 0) {
        setSelectedProperty(props[0].id);
      }
    }
    if (balances) setMonthlyBalances(balances);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddIncomeCategory = async () => {
    if (!newIncomeCat.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("income_categories").insert({
      user_id: user.id,
      name: newIncomeCat.trim(),
    });

    setNewIncomeCat("");
    fetchData();
  };

  const handleRemoveIncomeCategory = async (id: string) => {
    await supabase.from("income_categories").delete().eq("id", id);
    fetchData();
  };

  const handleAddExpenseCategory = async () => {
    if (!newExpenseCat.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("expense_categories").insert({
      user_id: user.id,
      name: newExpenseCat.trim(),
    });

    setNewExpenseCat("");
    fetchData();
  };

  const handleRemoveExpenseCategory = async (id: string) => {
    await supabase.from("expense_categories").delete().eq("id", id);
    fetchData();
  };

  const handleAddInvestmentCategory = async () => {
    if (!newInvestmentCat.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("investment_categories").insert({
      user_id: user.id,
      name: newInvestmentCat.trim(),
    });

    setNewInvestmentCat("");
    fetchData();
  };

  const handleRemoveInvestmentCategory = async (id: string) => {
    await supabase.from("investment_categories").delete().eq("id", id);
    fetchData();
  };

  const handleSaveBalance = async () => {
    if (!selectedProperty || !balanceAmount) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = monthlyBalances.find(
      (b) =>
        b.property_id === selectedProperty &&
        b.month === balanceMonth &&
        b.year === balanceYear
    );

    if (existing) {
      await supabase
        .from("monthly_balances")
        .update({ opening_balance: parseFloat(balanceAmount) })
        .eq("id", existing.id);
    } else {
      await supabase.from("monthly_balances").insert({
        property_id: selectedProperty,
        user_id: user.id,
        month: balanceMonth,
        year: balanceYear,
        opening_balance: parseFloat(balanceAmount),
      });
    }

    setBalanceAmount("");
    fetchData();
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    handler: () => void
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handler();
    }
  };

  const propertyBalances = monthlyBalances.filter(
    (b) => b.property_id === selectedProperty
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Setup</h1>
        <p className="text-sm text-muted-foreground">
          Configure categories and opening balances for your properties
        </p>
      </div>

      {/* Income Categories */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-2.5 w-2.5 rounded-full bg-success" />
          <h2 className="text-base sm:text-lg font-semibold text-foreground uppercase tracking-wide">
            Income Categories
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {incomeCategories.map((cat) => (
            <span
              key={cat.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-foreground"
            >
              {cat.name}
              <button
                onClick={() => handleRemoveIncomeCategory(cat.id)}
                className="rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label={`Remove ${cat.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {incomeCategories.length === 0 && (
            <p className="text-sm text-muted-foreground">No income categories yet.</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newIncomeCat}
            onChange={(e) => setNewIncomeCat(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleAddIncomeCategory)}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="e.g. Bookings, Rent, Other"
            aria-label="New income category"
          />
          <button
            onClick={handleAddIncomeCategory}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {/* Investment Categories */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          <h2 className="text-base sm:text-lg font-semibold text-foreground uppercase tracking-wide">
            Investment Categories
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {investmentCategories.map((cat) => (
            <span
              key={cat.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-foreground"
            >
              {cat.name}
              <button
                onClick={() => handleRemoveInvestmentCategory(cat.id)}
                className="rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label={`Remove ${cat.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {investmentCategories.length === 0 && (
            <p className="text-sm text-muted-foreground">No investment categories yet.</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newInvestmentCat}
            onChange={(e) => setNewInvestmentCat(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleAddInvestmentCategory)}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="e.g. Furniture, Renovation"
            aria-label="New investment category"
          />
          <button
            onClick={handleAddInvestmentCategory}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {/* Expense Categories */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
          <h2 className="text-base sm:text-lg font-semibold text-foreground uppercase tracking-wide">
            Expense Categories
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {expenseCategories.map((cat) => (
            <span
              key={cat.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-foreground"
            >
              {cat.name}
              <button
                onClick={() => handleRemoveExpenseCategory(cat.id)}
                className="rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label={`Remove ${cat.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {expenseCategories.length === 0 && (
            <p className="text-sm text-muted-foreground">No expense categories yet.</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newExpenseCat}
            onChange={(e) => setNewExpenseCat(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleAddExpenseCategory)}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="New expense category"
            aria-label="New expense category"
          />
          <button
            onClick={handleAddExpenseCategory}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {/* How Rolling Balances Work */}
      <div className="rounded-xl border border-border bg-warning/5 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-5 w-5 text-warning" />
          <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide">
            How Rolling Balances Work
          </h2>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Set the opening balance for your <span className="font-semibold text-foreground">first month</span> only.
          </p>
          <p>
            Every month after that, the <span className="font-semibold text-foreground">Closing (C/D)</span> of the previous month automatically becomes the <span className="font-semibold text-foreground">Opening (B/D)</span> of the next.
          </p>
          <p>
            You can override any month manually if needed.
          </p>
          <p className="text-xs mt-2 text-muted-foreground">
            Closing = Opening + Income &minus; Expenses &minus; Investments
          </p>
        </div>
      </div>

      {/* Monthly Opening Balances */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Monthly Opening Balances
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Set the bank balance for any month. Closing = Opening + Income &minus; Expenses, auto-carries forward.
        </p>

        {properties.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a property first to set opening balances.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end mb-6">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Property
                </label>
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  aria-label="Select property"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Month
                </label>
                <select
                  value={balanceMonth}
                  onChange={(e) => setBalanceMonth(parseInt(e.target.value))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  aria-label="Select month"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {getMonthName(m)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Year
                </label>
                <select
                  value={balanceYear}
                  onChange={(e) => setBalanceYear(parseInt(e.target.value))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  aria-label="Select year"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleSaveBalance)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. 10000"
                  aria-label="Opening balance amount"
                />
              </div>

              <button
                onClick={handleSaveBalance}
                className="w-full sm:w-auto rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Save opening balance
              </button>
            </div>

            {/* Existing balances list */}
            {propertyBalances.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-sm" aria-label="Saved opening balances">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                        Month
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                        Opening Balance
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {propertyBalances.map((b) => (
                      <tr
                        key={b.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-4 py-2 text-foreground">
                          {getMonthName(b.month)} {b.year}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-foreground">
                          {formatCurrency(b.opening_balance)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={async () => {
                              await supabase
                                .from("monthly_balances")
                                .delete()
                                .eq("id", b.id);
                              fetchData();
                            }}
                            className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            aria-label="Delete balance"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SetupPage;
