export const EXPENSE_CATEGORIES = ['food', 'shopping', 'travel', 'bills', 'entertainment', 'medical', 'education', 'investments', 'subscriptions', 'other'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_META: Record<ExpenseCategory, { label: string; emoji: string; color: string }> = {
  food: { label: 'Food', emoji: '🍔', color: '#f97316' },
  shopping: { label: 'Shopping', emoji: '🛍️', color: '#ec4899' },
  travel: { label: 'Travel', emoji: '✈️', color: '#38bdf8' },
  bills: { label: 'Bills', emoji: '🧾', color: '#f59e0b' },
  entertainment: { label: 'Entertainment', emoji: '🎬', color: '#a855f7' },
  medical: { label: 'Medical', emoji: '💊', color: '#ef4444' },
  education: { label: 'Education', emoji: '🎓', color: '#22d3ee' },
  investments: { label: 'Investments', emoji: '📈', color: '#4ade80' },
  subscriptions: { label: 'Subscriptions', emoji: '🔁', color: '#818cf8' },
  other: { label: 'Other', emoji: '📦', color: '#94a3b8' },
};

export const PAYMENT_METHODS = ['cash', 'card', 'upi', 'bank', 'wallet', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_LABEL: Record<PaymentMethod, string> = { cash: 'Cash', card: 'Card', upi: 'UPI', bank: 'Bank transfer', wallet: 'Wallet', other: 'Other' };

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
  updatedAt: string;
}

export interface Income {
  id: string;
  amount: number;
  source: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavingGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string | null;
}

/** Stored in users/{uid}/settings/finance. */
export interface FinanceSettings {
  currency: string;
  /** Overall monthly spending limit; null = no budget. */
  monthlyBudget: number | null;
  categoryLimits: Partial<Record<ExpenseCategory, number>>;
  savingGoals: SavingGoal[];
}

export const DEFAULT_FINANCE: FinanceSettings = { currency: '₹', monthlyBudget: null, categoryLimits: {}, savingGoals: [] };

export interface ExpenseInput {
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
}

export interface IncomeInput {
  amount: number;
  source: string;
  date: string;
}

export const FINANCE_LIMITS = { maxAmount: 100_000_000, descriptionMax: 120, sourceMax: 60, goalNameMax: 40, maxGoals: 12 } as const;
