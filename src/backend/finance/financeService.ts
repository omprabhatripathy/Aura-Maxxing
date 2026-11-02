import { paths } from '../db';
import { newId, nowIso } from '../core/ids';
import { activityOp, commit, deleteOp, setOp } from '../services/ops';
import { validateExpense, validateFinanceSettings, validateIncome } from './model';
import { EXPENSE_CATEGORY_META, type Expense, type ExpenseInput, type FinanceSettings, type Income, type IncomeInput } from './types';

export async function addExpense(uid: string, raw: ExpenseInput): Promise<void> {
  const input = validateExpense(raw);
  const now = nowIso();
  const id = newId();
  await commit([
    setOp(paths.expenses(uid), id, { ...input, createdAt: now, updatedAt: now }),
    activityOp(uid, 'expense-added', `Logged ${EXPENSE_CATEGORY_META[input.category].label} expense${input.description ? ` · ${input.description}` : ''}`, id),
  ]);
}

export async function updateExpense(uid: string, expense: Expense, raw: ExpenseInput): Promise<void> {
  const input = validateExpense(raw);
  await commit([setOp(paths.expenses(uid), expense.id, { ...input, updatedAt: nowIso() }, true)]);
}

export async function deleteExpense(uid: string, expense: Expense): Promise<void> {
  await commit([deleteOp(paths.expenses(uid), expense.id)]);
}

export async function addIncome(uid: string, raw: IncomeInput): Promise<void> {
  const input = validateIncome(raw);
  const now = nowIso();
  await commit([setOp(paths.income(uid), newId(), { ...input, createdAt: now, updatedAt: now })]);
}

export async function updateIncome(uid: string, income: Income, raw: IncomeInput): Promise<void> {
  const input = validateIncome(raw);
  await commit([setOp(paths.income(uid), income.id, { ...input, updatedAt: nowIso() }, true)]);
}

export async function deleteIncome(uid: string, income: Income): Promise<void> {
  await commit([deleteOp(paths.income(uid), income.id)]);
}

/** Budget, category limits, saving goals and currency live in one settings document. */
export async function saveFinanceSettings(uid: string, raw: FinanceSettings): Promise<void> {
  const s = validateFinanceSettings(raw);
  await commit([
    setOp(paths.settings(uid), 'finance', {
      currency: s.currency,
      monthlyBudget: s.monthlyBudget,
      categoryLimits: s.categoryLimits,
      savingGoals: s.savingGoals,
      updatedAt: nowIso(),
    }),
  ]);
}

export const newSavingGoalId = () => newId();
