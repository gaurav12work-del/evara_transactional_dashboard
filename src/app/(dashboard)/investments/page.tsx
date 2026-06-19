"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Property, Investment } from "@/types";
import { formatCurrency } from "@/lib/utils";
import PropertySwitcher from "@/components/property-switcher";
import InvestmentModal from "@/components/investment-modal";
import { Plus, Trash2, Filter, Package } from "lucide-react";

const InvestmentsPage = () => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: propsData } = await supabase
      .from("properties")
      .select("*")
      .order("name");

    if (propsData) setProperties(propsData);

    let query = supabase
      .from("investments")
      .select("*")
      .order("date", { ascending: false });

    if (selectedPropertyId) {
      query = query.eq("property_id", selectedPropertyId);
    }

    const { data } = await query;
    if (data) setInvestments(data);

    setLoading(false);
  }, [selectedPropertyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this investment?");
    if (!confirmed) return;

    await supabase.from("investments").delete().eq("id", id);
    fetchData();
  };

  const filteredInvestments = investments.filter((inv) => {
    if (filterCategory !== "all" && inv.category !== filterCategory) return false;
    return true;
  });

  const totalInvestments = filteredInvestments.reduce(
    (sum, inv) => sum + inv.amount,
    0
  );

  const getPropertyName = (propertyId: string) => {
    return properties.find((p) => p.id === propertyId)?.name || "Unknown";
  };

  const uniqueCategories = [...new Set(investments.map((inv) => inv.category))];

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
          <h1 className="text-2xl font-bold text-foreground">Investments</h1>
          <p className="text-sm text-muted-foreground">
            Track property investments (furniture, appliances, renovations, etc.)
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
            aria-label="Add new investment"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Investments</p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(totalInvestments)}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label="Filter by category"
        >
          <option value="all">All Categories</option>
          {uniqueCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Investments Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {filteredInvestments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Package className="h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No investments found. Track your property investments here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Investments table">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvestments.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-foreground">
                      {new Date(inv.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {inv.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {getPropertyName(inv.property_id)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {inv.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {formatCurrency(inv.amount)}
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

      {modalOpen && (
        <InvestmentModal
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

export default InvestmentsPage;
