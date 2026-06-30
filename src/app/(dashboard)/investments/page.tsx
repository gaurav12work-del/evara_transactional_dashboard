"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Property, Investment } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";

const InvestmentsPage = () => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterPropertyId, setFilterPropertyId] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [
      { data: propsData },
      { data: invData },
    ] = await Promise.all([
      supabase.from("properties").select("*").order("name"),
      supabase.from("investments").select("*").order("date", { ascending: false }),
    ]);

    if (propsData) setProperties(propsData);
    if (invData) setInvestments(invData);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
  const activeInvestments = investments.filter((inv) => inv.status === "active");
  const writtenOffInvestments = investments.filter((inv) => inv.status === "written_off");
  const totalActive = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalWrittenOff = writtenOffInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const currentActiveValue = totalActive - totalWrittenOff;
  const totalIncomeEarned = totalActive - totalWrittenOff;

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

  // Written off by property
  const writtenOffByProperty = properties
    .map((p) => ({
      name: p.name,
      total: writtenOffInvestments
        .filter((inv) => inv.property_id === p.id)
        .reduce((sum, inv) => sum + inv.amount, 0),
    }))
    .filter((p) => p.total > 0);

  // Written off by category (partner)
  const writtenOffUniqueCategories = [...new Set(writtenOffInvestments.map((inv) => inv.category))];
  const writtenOffByCategory = writtenOffUniqueCategories.map((cat) => ({
    name: cat,
    total: writtenOffInvestments
      .filter((inv) => inv.category === cat)
      .reduce((sum, inv) => sum + inv.amount, 0),
  }));

  // Filtered list
  const filteredInvestments = investments
    .filter((inv) => {
      if (filterPropertyId !== "all" && inv.property_id !== filterPropertyId) return false;
      if (filterCategory !== "all" && inv.category !== filterCategory) return false;
      if (filterStatus !== "all" && inv.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "latest" ? dateB - dateA : dateA - dateB;
    });

  const totalPages = Math.ceil(filteredInvestments.length / itemsPerPage);
  const paginatedInvestments = filteredInvestments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        {/* Summary cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-6 w-20 animate-pulse rounded bg-muted" />
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
        {/* Breakdown skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-3">
              <div className="h-4 w-36 animate-pulse rounded bg-muted" />
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* Table skeleton */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 w-24 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          </div>
          <div className="divide-y divide-border">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted ml-auto" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                <div className="h-7 w-7 animate-pulse rounded-lg bg-muted" />
              </div>
            ))}
          </div>
        </div>
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
            {formatCurrency(totalActive)}
          </p>
          <p className="text-xs text-muted-foreground">All active entries</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Written Off
          </p>
          <p className="text-xl font-bold text-destructive mt-1">
            {formatCurrency(totalWrittenOff)}
          </p>
          <p className="text-xs text-muted-foreground">Deducted from active</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Active Investments
          </p>
          <p className="text-xl font-bold text-primary mt-1">
            {formatCurrency(currentActiveValue)}
          </p>
          <p className="text-xs text-muted-foreground">Active − Written Off</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Total Income Earned
          </p>
          <p className="text-xl font-bold text-success mt-1">
            {formatCurrency(totalIncomeEarned)}
          </p>
          <p className="text-xs text-muted-foreground">Active − Written Off</p>
        </div>
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

      {/* Written Off by Property & Partner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
            Written Off by Property
          </h2>
          {writtenOffByProperty.length === 0 ? (
            <p className="text-sm text-muted-foreground">No written-off investments yet</p>
          ) : (
            <div className="space-y-3">
              {writtenOffByProperty.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{item.name}</span>
                  <span className="text-sm font-semibold text-destructive">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
            Written Off by Partner
          </h2>
          {writtenOffByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No written-off investments yet</p>
          ) : (
            <div className="space-y-3">
              {writtenOffByCategory.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{item.name}</span>
                  <span className="text-sm font-semibold text-destructive">
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
              onChange={(e) => { setFilterPropertyId(e.target.value); setCurrentPage(1); }}
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
              onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
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
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="written_off">Written Off</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value as "latest" | "oldest"); setCurrentPage(1); }}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Sort order"
            >
              <option value="latest">Latest first</option>
              <option value="oldest">Oldest first</option>
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
                {paginatedInvestments.map((inv) => (
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredInvestments.length)} of {filteredInvestments.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <span className="text-sm text-foreground font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestmentsPage;
