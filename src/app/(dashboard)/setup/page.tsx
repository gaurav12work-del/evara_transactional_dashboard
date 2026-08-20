"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ExpenseCategory, IncomeCategory, InvestmentCategory } from "@/types";
import { Check, Pencil, Plus, X } from "lucide-react";

type Category = IncomeCategory | ExpenseCategory | InvestmentCategory;

interface CategorySectionProps {
  title: string;
  dotClass: string;
  categories: Category[];
  placeholder: string;
  emptyText: string;
  addLabel: string;
  onAdd: (name: string) => Promise<void>;
  onRename: (cat: Category, name: string) => Promise<void>;
  onRemove: (cat: Category) => Promise<void>;
}

const CategorySection = ({
  title,
  dotClass,
  categories,
  placeholder,
  emptyText,
  addLabel,
  onAdd,
  onRename,
  onRemove,
}: CategorySectionProps) => {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isDuplicate = (name: string, exceptId?: string) =>
    categories.some(
      (c) => c.id !== exceptId && c.name.toLowerCase() === name.toLowerCase()
    );

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
    setError("");
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditValue(cat.name);
    setError("");
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name || saving) return;
    if (isDuplicate(name)) {
      setError(`"${name}" already exists.`);
      return;
    }

    setSaving(true);
    await onAdd(name);
    setSaving(false);
    setNewName("");
    setError("");
  };

  const commitEdit = async (cat: Category) => {
    const name = editValue.trim();
    if (saving) return;
    if (!name || name === cat.name) {
      cancelEdit();
      return;
    }
    if (isDuplicate(name, cat.id)) {
      setError(`"${name}" already exists.`);
      return;
    }

    setSaving(true);
    await onRename(cat, name);
    setSaving(false);
    cancelEdit();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
        <h2 className="text-base sm:text-lg font-semibold text-foreground uppercase tracking-wide">
          {title}
        </h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((cat) =>
          editingId === cat.id ? (
            <span
              key={cat.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-secondary px-3 py-1.5 text-sm font-medium text-foreground"
            >
              <input
                autoFocus
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitEdit(cat);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelEdit();
                  }
                }}
                style={{ width: `${Math.max(editValue.length + 1, 8)}ch` }}
                className="bg-transparent text-sm font-medium text-foreground focus:outline-none"
                aria-label={`Rename ${cat.name}`}
              />
              <button
                onClick={() => commitEdit(cat)}
                disabled={saving}
                className="rounded-full p-0.5 hover:bg-success/10 hover:text-success transition-colors disabled:opacity-50"
                aria-label={`Save ${cat.name}`}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={cancelEdit}
                className="rounded-full p-0.5 hover:bg-muted transition-colors"
                aria-label="Cancel rename"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : (
            <span
              key={cat.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-foreground"
            >
              {cat.name}
              <button
                onClick={() => startEdit(cat)}
                className="rounded-full p-0.5 hover:bg-primary/10 hover:text-primary transition-colors"
                aria-label={`Rename ${cat.name}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onRemove(cat)}
                className="rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label={`Remove ${cat.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )
        )}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        )}
      </div>

      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder={placeholder}
          aria-label={addLabel}
        />
        <button
          onClick={handleAdd}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
    </div>
  );
};

type CategoryTable =
  | "income_categories"
  | "expense_categories"
  | "investment_categories";

const SetupPage = () => {
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [investmentCategories, setInvestmentCategories] = useState<InvestmentCategory[]>([]);
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

  const addCategory = async (table: CategoryTable, name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from(table).insert({ user_id: user.id, name });
    await fetchData();
  };

  const removeCategory = async (table: CategoryTable, id: string) => {
    await supabase.from(table).delete().eq("id", id);
    await fetchData();
  };

  // Transactions and investments store the category as free text, so a rename
  // has to carry through to existing records or they get orphaned.
  const renameCategory = async (
    table: CategoryTable,
    cat: Category,
    name: string
  ) => {
    await supabase.from(table).update({ name }).eq("id", cat.id);

    if (table === "investment_categories") {
      await supabase
        .from("investments")
        .update({ category: name })
        .eq("user_id", cat.user_id)
        .eq("category", cat.name);
    } else {
      await supabase
        .from("transactions")
        .update({ category: name })
        .eq("user_id", cat.user_id)
        .eq("type", table === "income_categories" ? "income" : "expense")
        .eq("category", cat.name);
    }

    await fetchData();
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

      <CategorySection
        title="Income Categories"
        dotClass="bg-success"
        categories={incomeCategories}
        placeholder="e.g. Bookings, Rent, Other"
        emptyText="No income categories yet."
        addLabel="New income category"
        onAdd={(name) => addCategory("income_categories", name)}
        onRename={(cat, name) => renameCategory("income_categories", cat, name)}
        onRemove={(cat) => removeCategory("income_categories", cat.id)}
      />

      <CategorySection
        title="Investment Categories"
        dotClass="bg-primary"
        categories={investmentCategories}
        placeholder="e.g. Furniture, Renovation"
        emptyText="No investment categories yet."
        addLabel="New investment category"
        onAdd={(name) => addCategory("investment_categories", name)}
        onRename={(cat, name) => renameCategory("investment_categories", cat, name)}
        onRemove={(cat) => removeCategory("investment_categories", cat.id)}
      />

      <CategorySection
        title="Expense Categories"
        dotClass="bg-destructive"
        categories={expenseCategories}
        placeholder="New expense category"
        emptyText="No expense categories yet."
        addLabel="New expense category"
        onAdd={(name) => addCategory("expense_categories", name)}
        onRename={(cat, name) => renameCategory("expense_categories", cat, name)}
        onRemove={(cat) => removeCategory("expense_categories", cat.id)}
      />

    </div>
  );
};

export default SetupPage;
