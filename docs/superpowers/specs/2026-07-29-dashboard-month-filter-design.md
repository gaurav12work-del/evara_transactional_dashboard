# Dashboard month filter — design

**Date:** 2026-07-29
**Status:** Approved

## Problem

The dashboard's three pie charts — Expense Breakdown, Income by Category, Investment by
Category — aggregate every transaction and investment ever recorded. There is no way to see
a single month's category mix. The five stat cards have the same limitation.

## Goal

Let the user narrow the dashboard's categorical and summary views to one year, or to one
month within a year, while leaving the time-series charts alone.

## Scope

Follows the selected period:

- The five stat cards: Total Revenue, Total Expenses, Total Investment, Active Investment,
  Total Recovered
- The three pie charts: `expenseCategoryData`, `incomeCategoryData`, `investmentCategoryData`
- The CSV export

Does not follow the selected period:

- Monthly Breakdown (bar) and Balance Trend (line). These plot a trend across months; a
  single month would collapse them to one bar and one dot. They keep their existing
  six-month window and keep reading the unfiltered arrays, so `computeMonthlyData`'s
  rolling balances stay correct.
- Recent Transactions. It is a "latest activity" widget, not a summary. Accepted
  consequence: it can list July rows while the cards read June.

Out of scope: the hardcoded year floor on the Monthly Overview page
(`src/app/(dashboard)/monthly-overview/page.tsx:134`). It is a real defect — past years are
unreachable there — but it is not touched by this work. This design avoids repeating the
pattern rather than fixing it.

## Control

A new component, `src/components/month-filter.tsx`, modelled on the existing
`src/components/property-switcher.tsx`. It renders in the dashboard header next to the
Property switcher and holds two `<select>` elements styled to match the selects already used
on the transactions and monthly-overview pages.

- **Year** — `All Time` (the default) followed by every year present in the fetched data,
  newest first.
- **Month** — `All months` followed by the twelve months. Disabled while Year is `All Time`,
  mirroring the disabled-until-prerequisite pattern the transactions form already uses for
  its Category select.

Three reachable states:

| Year | Month | Period |
| --- | --- | --- |
| `All Time` | (disabled) | everything |
| `2026` | `All months` | calendar year 2026 |
| `2026` | `June` | June 2026 |

Props: the list of years, the current year and month, and a single `onChange(year, month)`.
The component holds no data-fetching logic of its own — the dashboard already has the rows.

## Filtering

One pure helper in `src/lib/utils.ts`, parsing dates the same way `computeMonthlyData`
already does (`new Date(dateStr)`, `getMonth() + 1`):

```ts
export const isInPeriod = (
  dateStr: string,
  year: number | null,
  month: number | null
): boolean => {
  if (year === null) return true;
  const d = new Date(dateStr);
  if (d.getFullYear() !== year) return false;
  return month === null || d.getMonth() + 1 === month;
};
```

The dashboard derives two arrays from it and repoints the in-scope computations at them:

```ts
const periodTransactions = transactions.filter((t) => isInPeriod(t.date, selectedYear, selectedMonth));
const periodInvestments  = investments.filter((i) => isInPeriod(i.date, selectedYear, selectedMonth));
```

Filtering happens in memory on rows the page has already fetched. Re-querying Supabase per
month was rejected: it adds a round-trip and a second loading state for data the browser is
already holding, and the page already does in-memory month bucketing in `computeMonthlyData`.

The year options are derived from the fetched rows, unioned with the currently selected year
so that a selection never disappears when the user switches to a property with no data for
that year.

## Export

`handleExportCSV` reads `periodTransactions` / `periodInvestments` for the totals summary,
the three pie-chart sections, and the All Transactions / All Investments lists. The bar-chart
and line-chart sections keep using the unfiltered `chartData`, matching what is on screen.

Two additions:

- A `Period` row in the header block: `All Time`, `2026`, or `June 2026`.
- A filename suffix: none, `-2026`, or `-jun-2026`.

`handleExportPDF` screenshots the live DOM, so it follows the filter with no change.

## Edge cases

- **Empty period.** The pie charts fall back to their existing empty states ("No expenses
  yet.", "No income yet.", "No investments yet."); the stat cards render ₹0 through the
  existing `formatCurrency`.
- **No data at all.** The years list is empty, so the Year select offers only `All Time` and
  the Month select stays disabled.
- **Property switch.** Changing the property refetches and re-derives the years list. The
  selected period is preserved rather than reset; because the selected year is unioned into
  the options, the dropdown stays consistent and the figures simply go to zero if that
  property has no data for the period.

## Verification

The repository has no test infrastructure, so verification is:

1. `npm run lint` — clean.
2. `npm run build` — clean.
3. Manual check in the running app: all-time, a full year, and a single month; confirm the
   bar and line charts do not move; confirm the CSV `Period` row, filename, and filtered
   sections; confirm the PDF matches the screen.
