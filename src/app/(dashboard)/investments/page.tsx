"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Property, Investment, InvestmentCategory, InvestmentStatus } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Trash2 } from "lucide-react";

const InvestmentsPage = () => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [categories, setCategories] = useState<InvestmentCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline form state
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formPropertyId, setFormPropertyId] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formStatus, setFormStatus] = useState<InvestmentStatus>("active");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [filterPropertyId, setFilterPropertyId] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [
      { data: propsData },
      { data: invData },
      { data: catData },
    ] = await Promise.all([
      supabase.from("properties").select("*").order("name"),
      supabase.from("investments").select("*").order("date", { ascending: false }),
      supabase.from("investment_categories").select("*").order("name"),
    ]);

    if (propsData) setProperties(propsData);
    if (invData) setInvestments(invData);
    if (catData) setCategories(catData);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClear = () => {
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormPropertyId("");
    setFormCategory("");
    setFormAmount("");
    setFormStatus("active");
    setFormDescription("");
    setFormError(null);
  };

  const handleAddInvestment = async () => {
    setFormError(null);

    if (!formPropertyId) {
      setFormError("Please select a property");
      return;
    }
    if (!formCategory) {
      setFormError("Please select a category");
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

    const { error: insertError } = await supabase.from("investments").insert({
      property_id: formPropertyId,
      user_id: user.id,
      category: formCategory,
      amount: parseFloat(formAmount),
      status: formStatus,
      description: formDescription.trim(),
      date: formDate,
    });

    if (insertError) {
      setFormError(insertError.message);
      setSubmitting(false);
      return;
    }

    handleClear();
    setSubmitting(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this investment?");
    if (!confirmed) return;

    await supabase.from("investments").delete().eq("id", id);
    fetchData();
  };

  const getPropertyName = (propertyId: string) => {
    return properties.find((p) => p.id === propertyId)?.name || "Unknown";
  };

  // Computed values
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const activeInvestments = investments.filter((inv) => inv.status === "active");
  const writtenOffInvestments = investments.filter((inv) => inv.status === "written_off");
  const totalActive = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalWrittenOff = writtenOffInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalIncomeEarned = totalWrittenOff;

  // Investment by property
  const investmentByProperty = properties
    .map((p) => ({
      name: p.name,
      total: investments
        .filter((inv) => inv.property_id === p.id)
        .reduce((sum, inv) => sum + inv.amount, 0),
    }))
    .filter((p) => p.total > 0);

  // Investment by category
  const uniqueCategories = [...new Set(investments.map((inv) => inv.category))];
  const investmentByCategory = uniqueCategories.map((cat) => ({
    name: cat,
    total: investments
      .filter((inv) => inv.category === cat)
      .reduce((sum, inv) => sum + inv.amount, 0),
  }));

  // Filtered list
  const filteredInvestments = investments.filter((inv) => {
    if (filterPropertyId !== "all" && inv.property_id !== filterPropertyId) return false;
    if (filterCategory !== "all" && inv.category !== filterCategory) return false;
    if (filterStatus !== "all" && inv.status !== filterStatus) return false;
    return true;
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
      <h1 className="text-2xl font-bold text-foreground italic">Investment Tracker</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Total Invested
          </p>
          <p className="text-xl font-bold text-foreground mt-1">
            {formatCurrency(totalInvested)}
          </p>
          <p className="text-xs text-muted-foreground">All time</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Active Investments
          </p>
          <p className="text-xl font-bold text-foreground mt-1">
            {formatCurrency(totalActive)}
          </p>
          <p className="text-xs text-muted-foreground">Currently active</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Written Off
          </p>
          <p className="text-xl font-bold text-foreground mt-1">
            {formatCurrency(totalWrittenOff)}
          </p>
          <p className="text-xs text-muted-foreground">Lost / disposed</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Total Income Earned
          </p>
          <p className="text-xl font-bold text-foreground mt-1">
            {formatCurrency(totalIncomeEarned)}
          </p>
          <p className="text-xs text-muted-foreground">All time</p>
        </div>
      </div>

      {/* Inline Add Form */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Add an Investment
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
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
              aria-label="Investment date"
            />
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

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Category
            </label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Select category"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
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

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Status
            </label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as InvestmentStatus)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Select status"
            >
              <option value="active">Active</option>
              <option value="written_off">Written Off</option>
            </select>
          </div>
        </div>

        {/* Description - full width row */}
        <div className="mt-3 flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Description
            </label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. Queen bed frame, Water heater, AC unit"
              aria-label="Description"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAddInvestment}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              aria-label="Add investment"
            >
              + Add investment
            </button>
            <button
              onClick={handleClear}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors whitespace-nowrap"
              aria-label="Clear form"
            >
              Clear
            </button>
          </div>
        </div>

        {formError && (
          <div className="mt-3 rounded-md bg-destructive/10 p-2.5 text-sm text-destructive" role="alert">
            {formError}
          </div>
        )}
      </div>

      {/* Investment by Property & Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
            Investment by Property
          </h2>
          {investmentByProperty.length === 0 ? (
            <p className="text-sm text-muted-foreground">No investments yet</p>
          ) : (
            <div className="space-y-3">
              {investmentByProperty.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{item.name}</span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
            Investment by Category
          </h2>
          {investmentByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No investments yet</p>
          ) : (
            <div className="space-y-3">
              {investmentByCategory.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{item.name}</span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Investments Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Table header with count and filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-border">
          <p className="text-sm font-medium text-foreground">
            {filteredInvestments.length} investment{filteredInvestments.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
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
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="written_off">Written Off</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {filteredInvestments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <p className="text-sm text-muted-foreground">
              No investments found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Investments table">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground uppercase text-xs">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground uppercase text-xs">
                    Property
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground uppercase text-xs">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground uppercase text-xs">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground uppercase text-xs">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground uppercase text-xs">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground uppercase text-xs">
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredInvestments.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {new Date(inv.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {getPropertyName(inv.property_id)}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {inv.category}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inv.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          inv.status === "active"
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {inv.status === "active" ? "Active" : "Written Off"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label="Delete investment"
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
    </div>
  );
};

export default InvestmentsPage;
