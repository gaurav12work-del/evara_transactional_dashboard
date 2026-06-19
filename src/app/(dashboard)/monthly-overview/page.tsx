"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Property, Transaction, Investment, MonthlyBalance, ComputedMonthlyData } from "@/types";
import { formatCurrency, getMonthName, computeMonthlyData } from "@/lib/utils";
import PropertySwitcher from "@/components/property-switcher";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();

const MonthlyOverviewPage = () => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [monthlyBalances, setMonthlyBalances] = useState<MonthlyBalance[]>([]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: propsData } = await supabase
      .from("properties")
      .select("*")
      .order("name");
    if (propsData) setProperties(propsData);

    let txQuery = supabase.from("transactions").select("*");
    let invQuery = supabase.from("investments").select("*");
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

  const monthlyData: ComputedMonthlyData[] = computeMonthlyData(
    transactions,
    investments,
    monthlyBalances,
    1,
    selectedYear,
    12,
    selectedYear
  );

  const yearTotalIncome = monthlyData.reduce((s, m) => s + m.totalIncome, 0);
  const yearTotalExpenses = monthlyData.reduce((s, m) => s + m.totalExpenses, 0);
  const yearTotalInvestments = monthlyData.reduce((s, m) => s + m.totalInvestments, 0);

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
          <h1 className="text-2xl font-bold text-foreground">Monthly Overview</h1>
          <p className="text-sm text-muted-foreground">
            Month-by-month breakdown with rolling balances
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-full sm:w-auto rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Select year"
          >
            {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <PropertySwitcher
            selectedPropertyId={selectedPropertyId}
            onPropertyChange={setSelectedPropertyId}
          />
        </div>
      </div>

      {/* Year Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Income</p>
          <p className="text-xl font-bold text-success mt-1">{formatCurrency(yearTotalIncome)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Expenses</p>
          <p className="text-xl font-bold text-destructive mt-1">{formatCurrency(yearTotalExpenses)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Investments</p>
          <p className="text-xl font-bold text-primary mt-1">{formatCurrency(yearTotalInvestments)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Net Profit</p>
          <p className={cn(
            "text-xl font-bold mt-1",
            yearTotalIncome - yearTotalExpenses - yearTotalInvestments >= 0
              ? "text-success"
              : "text-destructive"
          )}>
            {formatCurrency(yearTotalIncome - yearTotalExpenses - yearTotalInvestments)}
          </p>
        </div>
      </div>

      {/* Monthly Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Monthly overview table">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Month</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Opening (B/D)</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Income</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Expenses</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Investments</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Closing (C/D)</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((m) => {
                const profit = m.totalIncome - m.totalExpenses - m.totalInvestments;
                const hasData = m.totalIncome > 0 || m.totalExpenses > 0 || m.totalInvestments > 0;
                const isManual = monthlyBalances.some(
                  (b) => b.month === m.month && b.year === m.year
                );

                return (
                  <tr
                    key={`${m.month}-${m.year}`}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors",
                      hasData ? "hover:bg-muted/30" : "opacity-50"
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {getMonthName(m.month)}
                        {isManual && (
                          <span className="text-[10px] rounded bg-warning/20 text-warning px-1.5 py-0.5 font-medium">
                            Manual
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {formatCurrency(m.openingBalance)}
                    </td>
                    <td className="px-4 py-3 text-right text-success font-medium">
                      {m.totalIncome > 0 ? `+${formatCurrency(m.totalIncome)}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-destructive font-medium">
                      {m.totalExpenses > 0 ? `-${formatCurrency(m.totalExpenses)}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-primary font-medium">
                      {m.totalInvestments > 0 ? `-${formatCurrency(m.totalInvestments)}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">
                      {formatCurrency(m.closingBalance)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasData ? (
                        profit >= 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Profit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                            <TrendingDown className="h-3.5 w-3.5" />
                            Loss
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance Flow Visual */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">Balance Flow</h2>
        <div className="overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max pb-2">
            {monthlyData
              .filter((m) => m.totalIncome > 0 || m.totalExpenses > 0 || m.totalInvestments > 0 || m.openingBalance !== 0)
              .map((m, index, arr) => (
                <div key={`${m.month}-${m.year}`} className="flex items-center gap-2">
                  <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-center">
                    <p className="text-xs text-muted-foreground">{getMonthName(m.month).slice(0, 3)}</p>
                    <p className={cn(
                      "text-sm font-bold whitespace-nowrap",
                      m.closingBalance >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {formatCurrency(m.closingBalance)}
                    </p>
                  </div>
                  {index < arr.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyOverviewPage;
