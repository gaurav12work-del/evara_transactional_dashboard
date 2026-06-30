"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ExpenseCategory, IncomeCategory, InvestmentCategory } from "@/types";
import { Plus, X } from "lucide-react";

const SetupPage = () => {
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [investmentCategories, setInvestmentCategories] = useState<InvestmentCategory[]>([]);
  const [newIncomeCat, setNewIncomeCat] = useState("");
  const [newExpenseCat, setNewExpenseCat] = useState("");
  const [newInvestmentCat, setNewInvestmentCat] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);

    const [
      { data: incCats },
      { data: expCats },
      { data: invCats },
    ] = await Promise.all([
      supabase.from("income_categories").select("*").order("name"),
      supabase.from("expense_categories").select("*").order("name"),
      supabase.from("investment_categories").select("*").order("name"),
    ]);

    if (incCats) setIncomeCategories(incCats);
    if (expCats) setExpenseCategories(expCats);
    if (invCats) setInvestmentCategories(invCats);

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

  const handleKeyDown = (
    e: React.KeyboardEvent,
    handler: () => void
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handler();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-28 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        {/* Category sections skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-4">
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-9 flex-1 animate-pulse rounded-md bg-muted" />
                <div className="h-9 w-16 animate-pulse rounded-lg bg-muted" />
              </div>
              <div className="space-y-2">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="flex items-center justify-between py-2">
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                    <div className="h-6 w-6 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Setup</h1>
        <p className="text-sm text-muted-foreground">
          Configure categories for your properties
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

    </div>
  );
};

export default SetupPage;
