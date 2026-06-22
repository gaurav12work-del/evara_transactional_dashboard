"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Property, TransactionType, ExpenseCategory, IncomeCategory, InvestmentCategory } from "@/types";
import { X } from "lucide-react";

interface TransactionModalProps {
  properties: Property[];
  selectedPropertyId: string | null;
  onClose: () => void;
}

const TransactionModal = ({
  properties,
  selectedPropertyId,
  onClose,
}: TransactionModalProps) => {
  const [propertyId, setPropertyId] = useState(selectedPropertyId || properties[0]?.id || "");
  const [type, setType] = useState<TransactionType | "investment">("expense");
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [investmentCategories, setInvestmentCategories] = useState<InvestmentCategory[]>([]);
  const [category, setCategory] = useState("");
  const [incomeCategory, setIncomeCategory] = useState("");
  const [investmentCategory, setInvestmentCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [fetchingCats, setFetchingCats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchCategories = async () => {
      setFetchingCats(true);
      const [{ data: incCats }, { data: expCats }, { data: invCats }] = await Promise.all([
        supabase.from("income_categories").select("*").order("name"),
        supabase.from("expense_categories").select("*").order("name"),
        supabase.from("investment_categories").select("*").order("name"),
      ]);

      if (incCats && incCats.length > 0) {
        setIncomeCategories(incCats);
        setIncomeCategory(incCats[0].name);
      }
      if (expCats && expCats.length > 0) {
        setExpenseCategories(expCats);
        setCategory(expCats[0].name);
      }
      if (invCats && invCats.length > 0) {
        setInvestmentCategories(invCats);
        setInvestmentCategory(invCats[0].name);
      }
      setFetchingCats(false);
    };

    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!propertyId) {
      setError("Please select a property");
      return;
    }

    let finalCategory = "";
    if (type === "income") {
      finalCategory = incomeCategory || customCategory;
    } else if (type === "investment") {
      finalCategory = investmentCategory || customCategory;
    } else {
      finalCategory = category || customCategory;
    }

    if (!finalCategory) {
      setError("Please select or enter a category");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in");
      setLoading(false);
      return;
    }

    let insertError;

    if (type === "investment") {
      const { error } = await supabase.from("investments").insert({
        property_id: propertyId,
        user_id: user.id,
        category: finalCategory,
        amount: parseFloat(amount),
        description: description.trim(),
        date,
      });
      insertError = error;
    } else {
      const { error } = await supabase.from("transactions").insert({
        property_id: propertyId,
        user_id: user.id,
        type,
        category: finalCategory,
        amount: parseFloat(amount),
        description: description.trim(),
        date,
      });
      insertError = error;
    }

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-modal-title"
    >
      <div className="w-full max-w-md rounded-xl bg-card border border-border p-4 sm:p-6 shadow-xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2
            id="transaction-modal-title"
            className="text-lg font-semibold text-foreground"
          >
            Add Transaction
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property Select */}
          <div>
            <label htmlFor="tx-property" className="block text-sm font-medium text-foreground">
              Property *
            </label>
            <select
              id="tx-property"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
              aria-label="Select property"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Type *
            </label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setType("income")}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  type === "income"
                    ? "bg-success text-white"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
                aria-pressed={type === "income"}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  type === "expense"
                    ? "bg-destructive text-white"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
                aria-pressed={type === "expense"}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType("investment")}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  type === "investment"
                    ? "bg-primary text-white"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
                aria-pressed={type === "investment"}
              >
                Investment
              </button>
            </div>
          </div>

          {/* Category */}
          {type === "expense" && (
            <div>
              <label htmlFor="tx-category" className="block text-sm font-medium text-foreground">
                Category *
              </label>
              {fetchingCats ? (
                <div className="mt-1 h-9 w-full animate-pulse rounded-md bg-muted" />
              ) : expenseCategories.length > 0 ? (
                <select
                  id="tx-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                  aria-label="Select category"
                >
                  {expenseCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Enter category (add categories in Setup)"
                  required
                  aria-label="Enter category"
                />
              )}
            </div>
          )}

          {type === "income" && (
            <div>
              <label htmlFor="tx-income-category" className="block text-sm font-medium text-foreground">
                Category *
              </label>
              {fetchingCats ? (
                <div className="mt-1 h-9 w-full animate-pulse rounded-md bg-muted" />
              ) : incomeCategories.length > 0 ? (
                <select
                  id="tx-income-category"
                  value={incomeCategory}
                  onChange={(e) => setIncomeCategory(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                  aria-label="Select income category"
                >
                  {incomeCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Enter category (add categories in Setup)"
                  required
                  aria-label="Enter income category"
                />
              )}
            </div>
          )}

          {type === "investment" && (
            <div>
              <label htmlFor="tx-investment-category" className="block text-sm font-medium text-foreground">
                Category *
              </label>
              {fetchingCats ? (
                <div className="mt-1 h-9 w-full animate-pulse rounded-md bg-muted" />
              ) : investmentCategories.length > 0 ? (
                <select
                  id="tx-investment-category"
                  value={investmentCategory}
                  onChange={(e) => setInvestmentCategory(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                  aria-label="Select investment category"
                >
                  {investmentCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Enter category (add categories in Setup)"
                  required
                  aria-label="Enter investment category"
                />
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <label htmlFor="tx-amount" className="block text-sm font-medium text-foreground">
              Amount (₹) *
            </label>
            <input
              id="tx-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="0.00"
              required
              aria-label="Transaction amount"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="tx-description" className="block text-sm font-medium text-foreground">
              Description
            </label>
            <input
              id="tx-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g., June booking payment"
              aria-label="Transaction description"
            />
          </div>

          {/* Date */}
          <div>
            <label htmlFor="tx-date" className="block text-sm font-medium text-foreground">
              Date *
            </label>
            <input
              id="tx-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
              aria-label="Transaction date"
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Adding..." : "Add Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
