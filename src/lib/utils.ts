import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Transaction, Investment, MonthlyBalance, ComputedMonthlyData } from "@/types";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const getMonthName = (month: number): string => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return months[month - 1];
};

export const getShortMonthName = (month: number): string => {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return months[month - 1];
};

export const computeMonthlyData = (
  transactions: Transaction[],
  investments: Investment[],
  manualBalances: MonthlyBalance[],
  startMonth: number,
  startYear: number,
  endMonth: number,
  endYear: number
): ComputedMonthlyData[] => {
  const results: ComputedMonthlyData[] = [];
  let runningBalance = 0;

  let currentMonth = startMonth;
  let currentYear = startYear;
  let isFirst = true;

  while (
    currentYear < endYear ||
    (currentYear === endYear && currentMonth <= endMonth)
  ) {
    const manualBalance = manualBalances.find(
      (b) => b.month === currentMonth && b.year === currentYear
    );

    let openingBalance: number;
    if (manualBalance) {
      openingBalance = manualBalance.opening_balance;
    } else if (isFirst) {
      openingBalance = 0;
    } else {
      openingBalance = runningBalance;
    }

    const monthTransactions = transactions.filter((t) => {
      const date = new Date(t.date);
      return (
        date.getMonth() + 1 === currentMonth &&
        date.getFullYear() === currentYear
      );
    });

    const monthInvestments = investments.filter((inv) => {
      const date = new Date(inv.date);
      return (
        date.getMonth() + 1 === currentMonth &&
        date.getFullYear() === currentYear
      );
    });

    const totalIncome = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalInvestments = monthInvestments
      .filter((inv) => inv.status === "active")
      .reduce((sum, inv) => sum + inv.amount, 0);

    const totalRecovered = monthInvestments
      .filter((inv) => inv.status === "written_off")
      .reduce((sum, inv) => sum + inv.amount, 0);

    const closingBalance = openingBalance + totalIncome - totalExpenses + totalInvestments - totalRecovered;

    results.push({
      month: currentMonth,
      year: currentYear,
      openingBalance,
      totalIncome,
      totalExpenses,
      totalInvestments,
      totalRecovered,
      closingBalance,
    });

    runningBalance = closingBalance;
    isFirst = false;

    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  return results;
};

export const getCurrentMonthData = (
  transactions: Transaction[],
  investments: Investment[],
  manualBalances: MonthlyBalance[]
): ComputedMonthlyData => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const allDates = [
    ...transactions.map((t) => new Date(t.date)),
    ...investments.map((i) => new Date(i.date)),
  ];

  let startMonth = currentMonth;
  let startYear = currentYear;

  if (allDates.length > 0) {
    const earliest = allDates.reduce((min, d) => (d < min ? d : min));
    startMonth = earliest.getMonth() + 1;
    startYear = earliest.getFullYear();
  }

  if (manualBalances.length > 0) {
    const earliestBalance = manualBalances.reduce((min, b) => {
      const bDate = new Date(b.year, b.month - 1);
      const minDate = new Date(min.year, min.month - 1);
      return bDate < minDate ? b : min;
    });
    const balDate = new Date(earliestBalance.year, earliestBalance.month - 1);
    const currentStart = new Date(startYear, startMonth - 1);
    if (balDate < currentStart) {
      startMonth = earliestBalance.month;
      startYear = earliestBalance.year;
    }
  }

  const data = computeMonthlyData(
    transactions,
    investments,
    manualBalances,
    startMonth,
    startYear,
    currentMonth,
    currentYear
  );

  const current = data.find(
    (d) => d.month === currentMonth && d.year === currentYear
  );

  return (
    current || {
      month: currentMonth,
      year: currentYear,
      openingBalance: 0,
      totalIncome: 0,
      totalExpenses: 0,
      totalInvestments: 0,
      totalRecovered: 0,
      closingBalance: 0,
    }
  );
};
