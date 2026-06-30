"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Property, Transaction, Investment, MonthlyBalance } from "@/types";
import { formatCurrency, computeMonthlyData, getShortMonthName } from "@/lib/utils";
import PropertySwitcher from "@/components/property-switcher";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Package,
  PackageMinus,
  Download,
  FileText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const COLORS = ["#556b2f", "#8b9a6b", "#c68b2c", "#6b3a2a", "#7d8b5e", "#8b5e4a"];

const DashboardPage = () => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [monthlyBalances, setMonthlyBalances] = useState<MonthlyBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: propsData } = await supabase
      .from("properties")
      .select("*")
      .order("name");
    if (propsData) setProperties(propsData);

    let txQuery = supabase.from("transactions").select("*").order("date", { ascending: false });
    let invQuery = supabase.from("investments").select("*").order("date", { ascending: false });
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

  const now = new Date();
  const startMonth = now.getMonth() >= 5 ? now.getMonth() - 4 : 1;
  const startYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;

  const monthlyData = computeMonthlyData(
    transactions,
    investments,
    monthlyBalances,
    startMonth,
    startYear,
    now.getMonth() + 1,
    now.getFullYear()
  );

  const chartData = monthlyData.map((m) => ({
    name: `${getShortMonthName(m.month)} ${m.year}`,
    income: m.totalIncome,
    expenses: m.totalExpenses,
    investments: m.totalInvestments,
    balance: m.closingBalance,
  }));

  const expenseCategoryData = transactions
    .filter((t) => t.type === "expense")
    .reduce(
      (acc, t) => {
        const existing = acc.find((a) => a.name === t.category);
        if (existing) {
          existing.value += t.amount;
        } else {
          acc.push({ name: t.category, value: t.amount });
        }
        return acc;
      },
      [] as { name: string; value: number }[]
    );

  const incomeCategoryData = transactions
    .filter((t) => t.type === "income")
    .reduce(
      (acc, t) => {
        const existing = acc.find((a) => a.name === t.category);
        if (existing) {
          existing.value += t.amount;
        } else {
          acc.push({ name: t.category, value: t.amount });
        }
        return acc;
      },
      [] as { name: string; value: number }[]
    );

  const investmentCategoryData = investments.reduce(
    (acc, inv) => {
      const existing = acc.find((a) => a.name === inv.category);
      if (existing) {
        existing.value += inv.amount;
      } else {
        acc.push({ name: inv.category, value: inv.amount });
      }
      return acc;
    },
    [] as { name: string; value: number }[]
  );

  const recentTransactions = transactions.slice(0, 5);

  const totalRevenue = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalInvestment = investments
    .filter((inv) => inv.status === "active")
    .reduce((sum, inv) => sum + inv.amount, 0);
  const totalRecovered = investments
    .filter((inv) => inv.status === "written_off")
    .reduce((sum, inv) => sum + inv.amount, 0);
  const totalProfit = totalRevenue - totalExpenses;

  const formatDateForCSV = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleExportCSV = () => {
    const rows: string[][] = [];
    const selectedPropertyName = selectedPropertyId
      ? properties.find((p) => p.id === selectedPropertyId)?.name || "Unknown"
      : "All Properties";

    const today = new Date();
    const exportDate = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;

    // Summary section
    rows.push(["EVARAA Dashboard Export"]);
    rows.push(["Property", selectedPropertyName]);
    rows.push(["Export Date", exportDate]);
    rows.push([]);

    // Totals summary
    rows.push(["--- Totals Summary ---"]);
    rows.push(["Total Revenue", totalRevenue.toString()]);
    rows.push(["Total Expenses", totalExpenses.toString()]);
    rows.push(["Total Investment", totalInvestment.toString()]);
    rows.push(["Total Recovered", totalRecovered.toString()]);
    rows.push(["Profit (Revenue - Expenses)", totalProfit.toString()]);
    rows.push([]);

    // Monthly breakdown (Bar Chart data)
    rows.push(["--- Monthly Breakdown (Bar Chart) ---"]);
    rows.push(["Month", "Income", "Expenses", "Investments", "Closing Balance"]);
    chartData.forEach((d) => {
      rows.push([d.name, d.income.toString(), d.expenses.toString(), d.investments.toString(), d.balance.toString()]);
    });
    rows.push([]);

    // Balance trend (Line Chart data)
    rows.push(["--- Balance Trend (Line Chart) ---"]);
    rows.push(["Month", "Closing Balance"]);
    chartData.forEach((d) => {
      rows.push([d.name, d.balance.toString()]);
    });
    rows.push([]);

    // Expense breakdown by category (Pie Chart)
    const totalExpenseAmount = expenseCategoryData.reduce((sum, d) => sum + d.value, 0);
    rows.push(["--- Expense Breakdown - Pie Chart ---"]);
    rows.push(["Category", "Amount", "Percentage (%)"]);
    expenseCategoryData.forEach((d) => {
      const pct = totalExpenseAmount > 0 ? ((d.value / totalExpenseAmount) * 100).toFixed(1) : "0";
      rows.push([d.name, d.value.toString(), pct]);
    });
    if (totalExpenseAmount > 0) {
      rows.push(["TOTAL", totalExpenseAmount.toString(), "100"]);
    }
    rows.push([]);

    // Income breakdown by category (Pie Chart)
    const totalIncomeAmount = incomeCategoryData.reduce((sum, d) => sum + d.value, 0);
    rows.push(["--- Income Breakdown - Pie Chart ---"]);
    rows.push(["Category", "Amount", "Percentage (%)"]);
    incomeCategoryData.forEach((d) => {
      const pct = totalIncomeAmount > 0 ? ((d.value / totalIncomeAmount) * 100).toFixed(1) : "0";
      rows.push([d.name, d.value.toString(), pct]);
    });
    if (totalIncomeAmount > 0) {
      rows.push(["TOTAL", totalIncomeAmount.toString(), "100"]);
    }
    rows.push([]);

    // Investment breakdown by category (Pie Chart)
    const totalInvestmentAmount = investmentCategoryData.reduce((sum, d) => sum + d.value, 0);
    rows.push(["--- Investment Breakdown - Pie Chart ---"]);
    rows.push(["Category", "Amount", "Percentage (%)"]);
    investmentCategoryData.forEach((d) => {
      const pct = totalInvestmentAmount > 0 ? ((d.value / totalInvestmentAmount) * 100).toFixed(1) : "0";
      rows.push([d.name, d.value.toString(), pct]);
    });
    if (totalInvestmentAmount > 0) {
      rows.push(["TOTAL", totalInvestmentAmount.toString(), "100"]);
    }
    rows.push([]);

    // All transactions
    rows.push(["--- All Transactions ---"]);
    rows.push(["Date", "Type", "Category", "Property", "Amount", "Description"]);
    transactions.forEach((tx) => {
      const propName = properties.find((p) => p.id === tx.property_id)?.name || "Unknown";
      rows.push([
        formatDateForCSV(tx.date),
        tx.type,
        tx.category,
        propName,
        tx.amount.toString(),
        tx.description || "",
      ]);
    });
    rows.push([]);

    // All investments
    rows.push(["--- All Investments ---"]);
    rows.push(["Date", "Category", "Property", "Amount", "Status", "Description"]);
    investments.forEach((inv) => {
      const propName = properties.find((p) => p.id === inv.property_id)?.name || "Unknown";
      rows.push([
        formatDateForCSV(inv.date),
        inv.category,
        propName,
        inv.amount.toString(),
        inv.status === "active" ? "Active" : "Written Off",
        inv.description || "",
      ]);
    });

    const csvContent = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `evaraa-dashboard-${selectedPropertyName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    setExporting(true);

    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#faf6f0",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const pdfWidth = 297;
      const pdfPageHeight = 420;
      const ratio = pdfWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a3",
      });

      let heightLeft = scaledHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, scaledHeight);
      heightLeft -= pdfPageHeight;

      while (heightLeft > 0) {
        position -= pdfPageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, scaledHeight);
        heightLeft -= pdfPageHeight;
      }

      const selectedPropertyName = selectedPropertyId
        ? properties.find((p) => p.id === selectedPropertyId)?.name || "Unknown"
        : "All Properties";

      pdf.save(`evaraa-dashboard-${selectedPropertyName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("PDF export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-36 animate-pulse rounded bg-muted" />
            <div className="h-4 w-52 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-28 animate-pulse rounded-lg bg-muted" />
            <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                <div className="h-4 w-4 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-7 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-4">
            <div className="h-5 w-36 animate-pulse rounded bg-muted" />
            <div className="h-[250px] animate-pulse rounded-lg bg-muted/50" />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-4">
            <div className="h-5 w-36 animate-pulse rounded bg-muted" />
            <div className="h-[250px] flex items-center justify-center">
              <div className="h-36 w-36 animate-pulse rounded-full bg-muted/50" />
            </div>
          </div>
        </div>
        {/* Pie charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-4">
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
              <div className="h-[200px] flex items-center justify-center">
                <div className="h-32 w-32 animate-pulse rounded-full bg-muted/50" />
              </div>
            </div>
          ))}
        </div>
        {/* Recent transactions skeleton */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-4">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={dashboardRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your property finances
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Export to PDF with charts"
          >
            <FileText className="h-4 w-4" />
            {exporting ? "Exporting..." : "Export PDF"}
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            aria-label="Export to CSV"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <PropertySwitcher
            selectedPropertyId={selectedPropertyId}
            onPropertyChange={setSelectedPropertyId}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Revenue</p>
            <ArrowUpRight className="h-4 w-4 text-success" />
          </div>
          <p className="mt-2 text-xl font-bold text-success">
            {formatCurrency(totalRevenue)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Expenses</p>
            <ArrowDownRight className="h-4 w-4 text-destructive" />
          </div>
          <p className="mt-2 text-xl font-bold text-destructive">
            {formatCurrency(totalExpenses)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Investment</p>
            <Package className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-xl font-bold text-primary">
            {formatCurrency(totalInvestment)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Recovered</p>
            <PackageMinus className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">
            {formatCurrency(totalRecovered)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Profit</p>
            <IndianRupee className="h-4 w-4 text-foreground" />
          </div>
          <p className={`mt-2 text-xl font-bold ${totalProfit >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(totalProfit)}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs">
            {totalProfit >= 0 ? (
              <>
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="text-success">Profit</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-3 w-3 text-destructive" />
                <span className="text-destructive">Loss</span>
              </>
            )}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Revenue &minus; Expenses</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expenses vs Investments Bar Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Monthly Breakdown
          </h2>
          {chartData.length > 0 ? (
            <div className="h-[200px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9cfc2" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #d9cfc2",
                      backgroundColor: "#faf6f0",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="income" fill="#4a7c3f" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expenses" fill="#b94a3b" radius={[4, 4, 0, 0]} name="Expenses" />
                  <Bar dataKey="investments" fill="#556b2f" radius={[4, 4, 0, 0]} name="Investments" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] sm:h-[300px] text-muted-foreground">
              No data yet. Add transactions to see charts.
            </div>
          )}
        </div>

        {/* Expense Breakdown Pie Chart */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Expense Breakdown
          </h2>
          {expenseCategoryData.length > 0 ? (
            <div className="h-[200px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseCategoryData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #d9cfc2",
                      backgroundColor: "#faf6f0",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] sm:h-[300px] text-muted-foreground">
              No expenses yet.
            </div>
          )}
        </div>
      </div>

      {/* Income & Investment Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income by Category Pie Chart */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Income by Category
          </h2>
          {incomeCategoryData.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {incomeCategoryData.map((_, index) => (
                      <Cell
                        key={`income-cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #d9cfc2",
                      backgroundColor: "#faf6f0",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              No income yet.
            </div>
          )}
        </div>

        {/* Investment by Category Pie Chart */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Investment by Category
          </h2>
          {investmentCategoryData.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={investmentCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {investmentCategoryData.map((_, index) => (
                      <Cell
                        key={`inv-cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #d9cfc2",
                      backgroundColor: "#faf6f0",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              No investments yet.
            </div>
          )}
        </div>
      </div>

      {/* Balance Trend Line Chart */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Balance Trend
        </h2>
        {chartData.length > 0 ? (
          <div className="h-[180px] sm:h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9cfc2" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} />
                <YAxis fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #d9cfc2",
                    backgroundColor: "#faf6f0",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#556b2f"
                  strokeWidth={2}
                  dot={{ fill: "#556b2f" }}
                  name="Closing Balance"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[180px] sm:h-[250px] text-muted-foreground">
            No data yet.
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Recent Transactions
        </h2>
        {recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center ${
                      tx.type === "income"
                        ? "bg-success/10"
                        : "bg-destructive/10"
                    }`}
                  >
                    {tx.type === "income" ? (
                      <ArrowUpRight className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {tx.description || tx.category}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.category} &bull; {new Date(tx.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    tx.type === "income" ? "text-success" : "text-destructive"
                  }`}
                >
                  {tx.type === "income" ? "+" : "-"}
                  {formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No transactions yet. Add your first transaction to get started.
          </p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
