"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Property, Transaction, Investment, ExpenseCategory, IncomeCategory, InvestmentCategory, InvestmentStatus } from "@/types";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { Trash2, Pencil } from "lucide-react";

type EntryType = "income" | "expense" | "investment";

interface UnifiedEntry {
  id: string;
  property_id: string;
  type: EntryType;
  category: string;
  amount: number;
  description: string;
  date: string;
  status?: InvestmentStatus;
  table: "transactions" | "investments";
}

const TransactionsPage = () => {
  const [entries, setEntries] = useState<UnifiedEntry[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [investmentCategories, setInvestmentCategories] = useState<InvestmentCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline form state
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formType, setFormType] = useState<EntryType | "">("");
  const [formCategory, setFormCategory] = useState("");
  const [formPropertyId, setFormPropertyId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<InvestmentStatus>("active");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingEntry, setEditingEntry] = useState<UnifiedEntry | null>(null);

  // Filter state
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPropertyId, setFilterPropertyId] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [
      { data: propsData },
      { data: txData },
      { data: invData },
      { data: incCats },
      { data: expCats },
      { data: invCats },
    ] = await Promise.all([
      supabase.from("properties").select("*").order("name"),
      supabase.from("transactions").select("*").order("date", { ascending: false }),
      supabase.from("investments").select("*").order("date", { ascending: false }),
      supabase.from("income_categories").select("*").order("name"),
      supabase.from("expense_categories").select("*").order("name"),
      supabase.from("investment_categories").select("*").order("name"),
    ]);

    if (propsData) setProperties(propsData);

    const unified: UnifiedEntry[] = [];
    if (txData) {
      txData.forEach((tx: Transaction) => {
        unified.push({
          id: tx.id,
          property_id: tx.property_id,
          type: tx.type as EntryType,
          category: tx.category,
          amount: tx.amount,
          description: tx.description,
          date: tx.date,
          table: "transactions",
        });
      });
    }
    if (invData) {
      invData.forEach((inv: Investment) => {
        unified.push({
          id: inv.id,
          property_id: inv.property_id,
          type: "investment",
          category: inv.category,
          amount: inv.amount,
          description: inv.description,
          date: inv.date,
          status: inv.status,
          table: "investments",
        });
      });
    }
    unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEntries(unified);

    if (incCats) setIncomeCategories(incCats);
    if (expCats) setExpenseCategories(expCats);
    if (invCats) setInvestmentCategories(invCats);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getCategoriesForType = (type: EntryType | "") => {
    if (type === "income") return incomeCategories;
    if (type === "expense") return expenseCategories;
    if (type === "investment") return investmentCategories;
    return [];
  };

  const handleClear = () => {
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormType("");
    setFormCategory("");
    setFormPropertyId("");
    setFormAmount("");
    setFormDescription("");
    setFormStatus("active");
    setFormError(null);
    setEditingEntry(null);
  };

  const handleEditClick = (entry: UnifiedEntry) => {
    setEditingEntry(entry);
    setFormDate(entry.date);
    setFormType(entry.type);
    setFormCategory(entry.category);
    setFormPropertyId(entry.property_id);
    setFormAmount(entry.amount.toString());
    setFormDescription(entry.description);
    setFormStatus(entry.status || "active");
    setFormError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddTransaction = async () => {
    setFormError(null);

    if (!formType) {
      setFormError("Please select a type");
      return;
    }
    if (!formCategory) {
      setFormError("Please select a category");
      return;
    }
    if (!formPropertyId) {
      setFormError("Please select a property");
      return;
    }
    if (!formAmount || parseFloat(formAmount) <= 0) {
      setFormError("Amount must be greater than 0");
      return;
    }

    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setFormError("You must be logged in");
      setSubmitting(false);
      return;
    }

    let operationError;

    if (editingEntry) {
      const updateData = {
        property_id: formPropertyId,
        category: formCategory,
        amount: parseFloat(formAmount),
        description: formDescription.trim(),
        date: formDate,
      };

      if (editingEntry.table === "investments") {
        const { error } = await supabase
          .from("investments")
          .update({ ...updateData, status: formStatus })
          .eq("id", editingEntry.id);
        operationError = error;
      } else {
        const { error } = await supabase
          .from("transactions")
          .update({ ...updateData, type: formType as "income" | "expense" })
          .eq("id", editingEntry.id);
        operationError = error;
      }
    } else {
      if (formType === "investment") {
        const { error } = await supabase.from("investments").insert({
          property_id: formPropertyId,
          user_id: user.id,
          category: formCategory,
          amount: parseFloat(formAmount),
          status: formStatus,
          description: formDescription.trim(),
          date: formDate,
        });
        operationError = error;
      } else {
        const { error } = await supabase.from("transactions").insert({
          property_id: formPropertyId,
          user_id: user.id,
          type: formType,
          category: formCategory,
          amount: parseFloat(formAmount),
          description: formDescription.trim(),
          date: formDate,
        });
        operationError = error;
      }
    }

    if (operationError) {
      setFormError(operationError.message);
      setSubmitting(false);
      return;
    }

    handleClear();
    setSubmitting(false);
    fetchData();
  };

  const handleDelete = async (entry: UnifiedEntry) => {
    const confirmed = window.confirm("Delete this transaction?");
    if (!confirmed) return;

    await supabase.from(entry.table).delete().eq("id", entry.id);
    fetchData();
  };

  const getPropertyName = (propertyId: string) => {
    return properties.find((p) => p.id === propertyId)?.name || "Unknown";
  };

  const filteredEntries = entries
    .filter((entry) => {
      if (filterType !== "all" && entry.type !== filterType) return false;
      if (filterPropertyId !== "all" && entry.property_id !== filterPropertyId) return false;
      if (filterMonth !== "all") {
        const entryMonth = new Date(entry.date).getMonth() + 1;
        if (entryMonth !== parseInt(filterMonth)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "latest" ? dateB - dateA : dateA - dateB;
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground italic">Transactions</h1>

      {/* Inline Add Form */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          {editingEntry ? "Edit Transaction" : "Add a Transaction"}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Date
            </label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Transaction date"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Type
            </label>
            <select
              value={formType}
              onChange={(e) => {
                setFormType(e.target.value as EntryType | "");
                setFormCategory("");
              }}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Select type"
            >
              <option value="">&mdash; select &mdash;</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="investment">Investment</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Category
            </label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              disabled={!formType}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Select category"
            >
              <option value="">
                {formType ? "Select category" : "Select type first"}
              </option>
              {getCategoriesForType(formType).map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Property */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Property
            </label>
            <select
              value={formPropertyId}
              onChange={(e) => setFormPropertyId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Select property"
            >
              <option value="">All properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Amount (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="0.00"
              aria-label="Amount"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Description
            </label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. Pest control, Cleaning supplies"
              aria-label="Description"
            />
          </div>
        </div>

        {/* Status - only for investment type */}
        {formType === "investment" && (
          <div className="mt-3 max-w-xs">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Investment Status
            </label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as InvestmentStatus)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Select investment status"
            >
              <option value="active">Active</option>
              <option value="written_off">Written Off</option>
            </select>
          </div>
        )}

        {formError && (
          <div className="mt-3 rounded-md bg-destructive/10 p-2.5 text-sm text-destructive" role="alert">
            {formError}
          </div>
        )}

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleAddTransaction}
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={editingEntry ? "Update transaction" : "Add transaction"}
          >
            {editingEntry ? "Update transaction" : "+ Add transaction"}
          </button>
          <button
            onClick={handleClear}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            aria-label={editingEntry ? "Cancel editing" : "Clear form"}
          >
            {editingEntry ? "Cancel" : "Clear"}
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Table header with count and filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-border">
          <p className="text-sm font-medium text-foreground">
            {filteredEntries.length} transaction{filteredEntries.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by type"
            >
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="investment">Investment</option>
            </select>
            <select
              value={filterPropertyId}
              onChange={(e) => setFilterPropertyId(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by property"
            >
              <option value="all">All properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by month"
            >
              <option value="all">All months</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {getMonthName(m)}
                </option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "latest" | "oldest")}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Sort order"
            >
              <option value="latest">Latest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <p className="text-sm text-muted-foreground">
              No transactions found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Transactions table">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground uppercase text-xs">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground uppercase text-xs">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground uppercase text-xs">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground uppercase text-xs">
                    Property
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground uppercase text-xs">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground uppercase text-xs">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground uppercase text-xs">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground uppercase text-xs">
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr
                    key={`${entry.table}-${entry.id}`}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {new Date(entry.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          entry.type === "income"
                            ? "bg-success/10 text-success"
                            : entry.type === "expense"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {entry.type === "income" ? "Income" : entry.type === "expense" ? "Expense" : "Investment"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {entry.category}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {getPropertyName(entry.property_id)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                        entry.type === "income"
                          ? "text-success"
                          : entry.type === "expense"
                          ? "text-destructive"
                          : "text-primary"
                      }`}
                    >
                      {entry.type === "income" ? "+" : "-"}
                      {formatCurrency(entry.amount)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {entry.description || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {entry.type === "investment" && entry.status ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            entry.status === "active"
                              ? "bg-success/10 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {entry.status === "active" ? "Active" : "Written Off"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditClick(entry)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          aria-label="Edit transaction"
                          tabIndex={0}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          aria-label="Delete transaction"
                          tabIndex={0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;
