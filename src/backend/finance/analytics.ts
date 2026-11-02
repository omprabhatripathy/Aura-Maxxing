import { addDays, diffDays, fromIso } from '../core/dates';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_META, type Expense, type ExpenseCategory, type FinanceSettings, type Income } from './types';
import { clamp01, weightedFactors, type RadarFactor } from '../analytics/factors';

const sum = (list: { amount: number }[]) => Math.round(list.reduce((s, x) => s + x.amount, 0) * 100) / 100;

export const monthKey = (date: string) => date.slice(0, 7);
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
const daysInMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

export interface MonthSummary {
  month: string;
  spent: number;
  income: number;
  savings: number;
  /** Share of income saved (0–1), null without income. */
  savingsRate: number | null;
  dailyAverage: number;
  byCategory: { category: ExpenseCategory; amount: number; share: number }[];
  count: number;
}

/** Spending summary for a month; the daily average only counts days elapsed so far in the current month. */
export function monthSummary(expenses: Expense[], income: Income[], month: string, today: string): MonthSummary {
  const ex = expenses.filter((e) => monthKey(e.date) === month);
  const inc = income.filter((i) => monthKey(i.date) === month);
  const spent = sum(ex);
  const earned = sum(inc);
  const elapsed = month === monthKey(today) ? fromIso(today).getDate() : daysInMonth(month);
  return {
    month,
    spent,
    income: earned,
    savings: Math.round((earned - spent) * 100) / 100,
    savingsRate: earned > 0 ? (earned - spent) / earned : null,
    dailyAverage: Math.round((spent / Math.max(1, elapsed)) * 100) / 100,
    byCategory: EXPENSE_CATEGORIES.map((category) => {
      const amount = sum(ex.filter((e) => e.category === category));
      return { category, amount, share: spent ? amount / spent : 0 };
    })
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount),
    count: ex.length,
  };
}

/** Income, spending and savings for the last `months` months (oldest first). */
export function monthlyTrend(expenses: Expense[], income: Income[], today: string, months = 6) {
  return Array.from({ length: months }, (_, i) => shiftMonth(monthKey(today), i - (months - 1))).map((month) => {
    const s = monthSummary(expenses, income, month, today);
    return { month, spent: s.spent, income: s.income, savings: s.savings };
  });
}

export interface FinanceAlert {
  id: string;
  level: 'danger' | 'warning' | 'info';
  message: string;
}

/** Budget exceeded, a dominating spend category and a low savings rate for the current month. */
export function financeAlerts(expenses: Expense[], income: Income[], settings: FinanceSettings, today: string): FinanceAlert[] {
  const month = monthKey(today);
  const s = monthSummary(expenses, income, month, today);
  const alerts: FinanceAlert[] = [];
  const fmt = (n: number) => `${settings.currency}${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (settings.monthlyBudget) {
    const share = s.spent / settings.monthlyBudget;
    if (share > 1) alerts.push({ id: `budget-over-${month}`, level: 'danger', message: `Monthly budget exceeded: ${fmt(s.spent)} of ${fmt(settings.monthlyBudget)} spent.` });
    else if (share >= 0.85) alerts.push({ id: `budget-near-${month}`, level: 'warning', message: `You've used ${Math.round(share * 100)}% of this month's budget.` });
  }
  for (const [category, limit] of Object.entries(settings.categoryLimits) as [ExpenseCategory, number][]) {
    const spent = s.byCategory.find((c) => c.category === category)?.amount ?? 0;
    if (spent > limit) alerts.push({ id: `limit-${category}-${month}`, level: 'danger', message: `${EXPENSE_CATEGORY_META[category].label} is over its limit (${fmt(spent)} / ${fmt(limit)}).` });
  }
  const top = s.byCategory[0];
  if (top && s.count >= 5 && top.share >= 0.45) {
    alerts.push({ id: `high-${top.category}-${month}`, level: 'warning', message: `${EXPENSE_CATEGORY_META[top.category].label} is ${Math.round(top.share * 100)}% of your spending this month.` });
  }
  if (s.savingsRate !== null && s.savingsRate < 0.1) {
    alerts.push({
      id: `savings-${month}`,
      level: s.savingsRate < 0 ? 'danger' : 'warning',
      message: s.savingsRate < 0 ? 'You are spending more than you earn this month.' : `Low savings rate: ${Math.round(s.savingsRate * 100)}% (aim for 20%).`,
    });
  }
  return alerts;
}

/**
 * Financial Wellness quality 0–1 over the last 30 days:
 * 40% savings rate (20%+ = full) · 25% budget adherence · 20% tracking consistency · 15% saving-goal progress.
 */
export function financialWellness(expenses: Expense[], income: Income[], settings: FinanceSettings, asOf: string): number | null {
  const factors = financeFactors(expenses, income, settings, asOf);
  return factors ? weightedFactors(factors) : null;
}

/** The individual Financial Wellness factors; null before anything is tracked. */
export function financeFactors(expenses: Expense[], income: Income[], settings: FinanceSettings, asOf: string): RadarFactor[] | null {
  const ex = expenses.filter((e) => e.date <= asOf);
  const inc = income.filter((i) => i.date <= asOf);
  if (!ex.length && !inc.length) return null;
  const from = addDays(asOf, -29);
  const ex30 = ex.filter((e) => e.date >= from);
  const inc30 = inc.filter((i) => i.date >= from);
  const spent = sum(ex30);
  const earned = sum(inc30);
  const rate = earned > 0 ? (earned - spent) / earned : null;

  const budgetChecks: number[] = [];
  if (settings.monthlyBudget) budgetChecks.push(spent <= settings.monthlyBudget ? 1 : settings.monthlyBudget / spent);
  for (const [category, limit] of Object.entries(settings.categoryLimits) as [ExpenseCategory, number][]) {
    const c = sum(ex30.filter((e) => e.category === category));
    budgetChecks.push(c <= limit ? 1 : limit / c);
  }
  const adherence = budgetChecks.length ? budgetChecks.reduce((a, b) => a + b, 0) / budgetChecks.length : null;

  const first = [...ex, ...inc].map((t) => t.date).sort()[0];
  const window = Math.min(30, diffDays(first > from ? first : from, asOf) + 1);
  const trackedDays = new Set([...ex30, ...inc30].map((t) => t.date)).size;
  const trackingTarget = Math.max(1, Math.min(15, window * 0.5));

  const goals = settings.savingGoals;
  const goalShare = goals.length ? goals.reduce((s, g) => s + clamp01(g.saved / g.target), 0) / goals.length : null;

  return [
    { key: 'savings', label: 'Savings rate', value: rate === null ? null : clamp01(rate / 0.2), weight: 0.4, current: rate === null ? undefined : Math.round(rate * 100), target: 20, detail: rate === null ? 'No income logged in 30 days' : `${Math.round(rate * 100)}% of income saved (full at 20%)` },
    { key: 'budget', label: 'Budget adherence', value: adherence, weight: 0.25, detail: adherence === null ? 'No budget or category limits set' : `${Math.round(adherence * 100)}% within budget and limits` },
    { key: 'tracking', label: 'Tracking consistency', value: clamp01(trackedDays / trackingTarget), weight: 0.2, current: trackedDays, target: Math.ceil(trackingTarget), detail: `${trackedDays} of ${Math.ceil(trackingTarget)} days with money logged` },
    { key: 'goals', label: 'Saving goals', value: goalShare, weight: 0.15, detail: goalShare === null ? 'No saving goals yet' : `${Math.round(goalShare * 100)}% funded on average` },
  ];
}
