"use client";

import { getMonthName } from "@/lib/utils";

interface MonthFilterProps {
  years: number[];
  selectedYear: number | null;
  selectedMonth: number | null;
  onChange: (year: number | null, month: number | null) => void;
}

const SELECT_CLASS =
  "w-full sm:w-auto rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed";

const MonthFilter = ({
  years,
  selectedYear,
  selectedMonth,
  onChange,
}: MonthFilterProps) => {
  const handleYearChange = (value: string) => {
    if (value === "all") {
      onChange(null, null);
      return;
    }
    onChange(parseInt(value), selectedMonth);
  };

  const handleMonthChange = (value: string) => {
    onChange(selectedYear, value === "all" ? null : parseInt(value));
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
      <select
        value={selectedYear === null ? "all" : selectedYear}
        onChange={(e) => handleYearChange(e.target.value)}
        className={SELECT_CLASS}
        aria-label="Filter by year"
      >
        <option value="all">All Time</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <select
        value={selectedMonth === null ? "all" : selectedMonth}
        onChange={(e) => handleMonthChange(e.target.value)}
        disabled={selectedYear === null}
        className={SELECT_CLASS}
        aria-label="Filter by month"
      >
        <option value="all">All months</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>
            {getMonthName(m)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default MonthFilter;
