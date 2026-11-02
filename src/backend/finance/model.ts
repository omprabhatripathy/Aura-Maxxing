import type { StoredDoc } from '../db';
import { ValidationError } from '../core/errors';
import { isValidIso } from '../core/dates';
import {
  DEFAULT_FINANCE,
  EXPENSE_CATEGORIES,
  FINANCE_LIMITS,
  PAYMENT_METHODS,
  type Expense,
  type ExpenseCategory,
  type ExpenseInput,
  type FinanceSettings,
  type Income,
  type IncomeInput,
  type PaymentMethod,
  type SavingGoal,
} from './types';

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const money = (n: number) => Math.round(n * 100) / 100;

export function toExpense({ id, data }: StoredDoc): Expense | null {
  if (!isValidIso(str(data.date))) return null;
  return {
    id,
    amount: num(data.amount),
    category: (EXPENSE_CATEGORIES as readonly string[]).includes(str(data.category)) ? (data.category as ExpenseCategory) : 'other',
    description: str(data.description),
    date: str(data.date),
    paymentMethod: (PAYMENT_METHODS as readonly string[]).includes(str(data.paymentMethod)) ? (data.paymentMethod as PaymentMethod) : 'other',
    createdAt: str(data.createdAt),
    updatedAt: str(data.updatedAt, str(data.createdAt)),
  };
}

export function toIncome({ id, data }: StoredDoc): Income | null {
  if (!isValidIso(str(data.date))) return null;
  return { id, amount: num(data.amount), source: str(data.source, 'Income'), date: str(data.date), createdAt: str(data.createdAt), updatedAt: str(data.updatedAt, str(data.createdAt)) };
}

export function toFinanceSettings(doc: StoredDoc | null): FinanceSettings {
  const d = doc?.data ?? {};
  const limits = (d.categoryLimits ?? {}) as Record<string, unknown>;
  const categoryLimits: FinanceSettings['categoryLimits'] = {};
  for (const c of EXPENSE_CATEGORIES) if (num(limits[c]) > 0) categoryLimits[c] = num(limits[c]);
  const goals = Array.isArray(d.savingGoals) ? (d.savingGoals as Record<string, unknown>[]) : [];
  return {
    currency: str(d.currency, DEFAULT_FINANCE.currency).slice(0, 4) || DEFAULT_FINANCE.currency,
    monthlyBudget: num(d.monthlyBudget) > 0 ? num(d.monthlyBudget) : null,
    categoryLimits,
    savingGoals: goals
      .map((g): SavingGoal => ({ id: str(g.id), name: str(g.name), target: num(g.target), saved: num(g.saved), deadline: isValidIso(str(g.deadline)) ? str(g.deadline) : null }))
      .filter((g) => g.id && g.name && g.target > 0),
  };
}

function checkAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) throw new ValidationError('Enter an amount greater than 0.', 'amount');
  if (amount > FINANCE_LIMITS.maxAmount) throw new ValidationError('That amount is too large.', 'amount');
  return money(amount);
}

export function validateExpense(input: ExpenseInput): ExpenseInput {
  if (!EXPENSE_CATEGORIES.includes(input.category)) throw new ValidationError('Choose a category.', 'category');
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) throw new ValidationError('Choose a payment method.', 'paymentMethod');
  if (!isValidIso(input.date)) throw new ValidationError('Choose a valid date.', 'date');
  const description = input.description.trim().replace(/\s+/g, ' ');
  if (description.length > FINANCE_LIMITS.descriptionMax) throw new ValidationError(`Keep the description under ${FINANCE_LIMITS.descriptionMax} characters.`, 'description');
  return { ...input, amount: checkAmount(input.amount), description };
}

export function validateIncome(input: IncomeInput): IncomeInput {
  if (!isValidIso(input.date)) throw new ValidationError('Choose a valid date.', 'date');
  const source = input.source.trim().replace(/\s+/g, ' ');
  if (!source) throw new ValidationError('Add a source, e.g. Salary.', 'source');
  if (source.length > FINANCE_LIMITS.sourceMax) throw new ValidationError(`Keep the source under ${FINANCE_LIMITS.sourceMax} characters.`, 'source');
  return { ...input, amount: checkAmount(input.amount), source };
}

export function validateFinanceSettings(s: FinanceSettings): FinanceSettings {
  if (s.monthlyBudget !== null) checkAmount(s.monthlyBudget);
  if (s.savingGoals.length > FINANCE_LIMITS.maxGoals) throw new ValidationError(`Up to ${FINANCE_LIMITS.maxGoals} saving goals.`);
  for (const g of s.savingGoals) {
    if (!g.name.trim()) throw new ValidationError('Name your saving goal.', 'name');
    if (g.name.length > FINANCE_LIMITS.goalNameMax) throw new ValidationError(`Goal names can be up to ${FINANCE_LIMITS.goalNameMax} characters.`, 'name');
    checkAmount(g.target);
    if (g.saved < 0) throw new ValidationError('Saved amount cannot be negative.', 'saved');
  }
  return {
    ...s,
    currency: s.currency.trim().slice(0, 4) || DEFAULT_FINANCE.currency,
    savingGoals: s.savingGoals.map((g) => ({ ...g, name: g.name.trim(), target: money(g.target), saved: money(g.saved) })),
  };
}
