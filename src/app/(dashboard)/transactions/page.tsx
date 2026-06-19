"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Property, Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils";
import PropertySwitcher from "@/components/property-switcher";
import TransactionModal from "@/components/transaction-modal";
import {
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from "lucide-react";

const TransactionsPage = () => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: propsData } = await supabase
      .from("properties")
      .select("*")
      .order("name");

    if (propsData) setProperties(propsData);

    let query = supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false });

    if (selectedPropertyId) {
      query = query.eq("property_id", selectedPropertyId);
    }

    const { data } = await query;
    if (data) setTransactions(data);

    setLoading(false);
  }, [selectedPropertyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this transaction?");
    if (!confirmed) return;

    await supabase.from("transactions").delete().eq("id", id);
    fetchData();
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filterCategory !== "all" && tx.category !== filterCategory) return false;
    if (filterType !== "all" && tx.type !== filterType) return false;
    return true;
  });

  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const getPropertyName = (propertyId: string) => {
    return properties.find((p) => p.id === propertyId)?.name || "Unknown";
  };

  const uniqueCategories = [...new Set(transactions.map((t) => t.category))];

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Manage income and expenses across properties
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PropertySwitcher
            selectedPropertyId={selectedPropertyId}
            onPropertyChange={setSelectedPropertyId}
          />
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            aria-label="Add new transaction"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Income</p>
          <p className="text-xl font-bold text-success">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Expenses</p>
          <p className="text-xl font-bold text-destructive">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Net</p>
          <p className="text-xl font-bold text-foreground">
            {formatCurrency(totalIncome - totalExpenses)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label="Filter by type"
        >
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label="Filter by category"
        >
          <option value="all">All Categories</option>
          {uniqueCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {filteredTransactions.length === 0 ? (
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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Property
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-foreground">
                      {new Date(tx.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-6 w-6 rounded-full flex items-center justify-center ${
                            tx.type === "income"
                              ? "bg-success/10"
                              : "bg-destructive/10"
                          }`}
                        >
                          {tx.type === "income" ? (
                            <ArrowUpRight className="h-3 w-3 text-success" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 text-destructive" />
                          )}
                        </div>
                        <span className="text-foreground">
                          {tx.description || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {getPropertyName(tx.property_id)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                        {tx.category}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        tx.type === "income"
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label="Delete transaction"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <TransactionModal
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onClose={() => {
            setModalOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default TransactionsPage;
