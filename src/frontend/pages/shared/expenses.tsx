import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Button, Card, EmptyState, ErrorText, Grid, Input, Modal, SegmentedControl, Select, StatCard } from '../../components/shared/ui';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import TrendLine from '../../components/shared/charts/TrendLine';
import { ExpensesIcon } from '../../components/shared/icons';
import { ErrorState, PageSkeleton } from '../../components/shared/feedback/Feedback';
import { baseScale } from '../../components/shared/period/chartTheme';
import { useUserData } from '../../context/useUserData';
import { useScoreHistory } from '../../context/useScoreHistory';
import { useAction, withInlineErrors } from '../../hooks/useAction';
import { addExpense, addIncome, deleteExpense, deleteIncome, newSavingGoalId, saveFinanceSettings, updateExpense, updateIncome } from '../../../backend/finance/financeService';
import { financeAlerts, monthKey, monthSummary, monthlyTrend, shiftMonth } from '../../../backend/finance/analytics';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_META,
  PAYMENT_LABEL,
  PAYMENT_METHODS,
  type Expense,
  type ExpenseCategory,
  type ExpenseInput,
  type FinanceSettings,
  type Income,
  type IncomeInput,
  type PaymentMethod,
  type SavingGoal,
} from '../../../backend/finance/types';
import { formatDate } from '../../../backend/core/dates';
import './expenses.css';

type Tab = 'overview' | 'transactions' | 'analytics' | 'budgets';
const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'budgets', label: 'Budgets & goals' },
];

type Editor = { kind: 'expense'; item?: Expense } | { kind: 'income'; item?: Income } | null;

const monthLabel = (month: string) => new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export default function Expenses() {
  const { uid, expenses, income, financeSettings, report, today, loading, error, retry } = useUserData();
  const { run, isPending } = useAction();
  const openHistory = useScoreHistory();
  const [tab, setTab] = useState<Tab>('overview');
  const [month, setMonth] = useState(() => monthKey(today));
  const [editor, setEditor] = useState<Editor>(null);
  const [deleting, setDeleting] = useState<{ kind: 'expense'; item: Expense } | { kind: 'income'; item: Income } | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | ''>('');

  const cur = financeSettings.currency;
  const money = (n: number) => `${n < 0 ? '−' : ''}${cur}${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

  const summary = useMemo(() => monthSummary(expenses, income, month, today), [expenses, income, month, today]);
  const trend = useMemo(() => monthlyTrend(expenses, income, today, 6), [expenses, income, today]);
  const alerts = useMemo(() => financeAlerts(expenses, income, financeSettings, today), [expenses, income, financeSettings, today]);
  const transactions = useMemo(() => {
    const ex = expenses.filter((e) => monthKey(e.date) === month).map((e) => ({ kind: 'expense' as const, item: e, date: e.date, createdAt: e.createdAt }));
    const inc = income.filter((i) => monthKey(i.date) === month).map((i) => ({ kind: 'income' as const, item: i, date: i.date, createdAt: i.createdAt }));
    return [...ex, ...inc]
      .filter((t) => typeFilter === 'all' || t.kind === typeFilter)
      .filter((t) => !categoryFilter || (t.kind === 'expense' && t.item.category === categoryFilter))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [expenses, income, month, typeFilter, categoryFilter]);

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (loading) return <PageSkeleton cards={4} />;

  const isCurrentMonth = month === monthKey(today);
  const budgetUse = financeSettings.monthlyBudget ? summary.spent / financeSettings.monthlyBudget : null;

  return (
    <div className="fin-page">
      <header className="fin-hero">
        <span className="fin-hero__icon" aria-hidden="true">
          <ExpensesIcon width={26} height={26} />
        </span>
        <div className="fin-hero__text">
          <h2>Expenses</h2>
          <p>Track spending and income, set budgets and grow your Financial Wellness score.</p>
        </div>
        <div className="fin-hero__actions">
          <Button onClick={() => setEditor({ kind: 'expense' })}>+ Expense</Button>
          <Button variant="ghost" onClick={() => setEditor({ kind: 'income' })}>
            + Income
          </Button>
        </div>
      </header>

      {alerts.length > 0 && (
        <ul className="fin-alerts" aria-label="Finance alerts">
          {alerts.map((a) => (
            <li key={a.id} className={`fin-alert fin-alert--${a.level}`}>
              {a.level === 'danger' ? '⚠️' : a.level === 'warning' ? '🔔' : 'ℹ️'} {a.message}
            </li>
          ))}
        </ul>
      )}

      <div className="fin-toolbar">
        <div className="fin-month" role="group" aria-label="Month">
          <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
            ‹
          </button>
          <strong>{monthLabel(month)}</strong>
          <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} disabled={isCurrentMonth} aria-label="Next month">
            ›
          </button>
        </div>
        <SegmentedControl ariaLabel="Expenses view" options={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === 'overview' && (
        <>
          <Grid minItemWidth={170}>
            <StatCard label="Spending" value={money(summary.spent)} description={budgetUse !== null ? `${Math.round(budgetUse * 100)}% of ${money(financeSettings.monthlyBudget!)} budget` : `${summary.count} expenses`} />
            <StatCard label="Income" value={money(summary.income)} />
            <StatCard label="Savings" value={money(summary.savings)} description={summary.savingsRate === null ? 'Add income to see your savings rate' : `${Math.round(summary.savingsRate * 100)}% savings rate`} />
            <StatCard label="Daily average" value={money(summary.dailyAverage)} description={isCurrentMonth ? 'So far this month' : 'For the month'} />
            <StatCard
              label="Financial wellness"
              value={report.current.coverage.finance ? `${report.current.scores.finance}/100` : '—'}
              description="Aura radar area"
              onClick={() => openHistory({ kind: 'aura-score' })}
            />
          </Grid>
          {budgetUse !== null && (
            <div className={`fin-budget${budgetUse > 1 ? ' is-over' : budgetUse >= 0.85 ? ' is-near' : ''}`}>
              <span>Monthly budget</span>
              <span className="fin-bar" role="progressbar" aria-valuenow={Math.round(budgetUse * 100)} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${Math.min(100, budgetUse * 100)}%` }} />
              </span>
              <strong>
                {money(summary.spent)} / {money(financeSettings.monthlyBudget!)}
              </strong>
            </div>
          )}
          <div className="fin-grid">
            <Card title="Expense breakdown">
              {summary.byCategory.length === 0 ? (
                <EmptyState action={<button type="button" className="fin-link" onClick={() => setEditor({ kind: 'expense' })}>Add an expense</button>}>No expenses this month.</EmptyState>
              ) : (
                <div className="fin-breakdown">
                  <div className="fin-donut">
                    <Doughnut
                      data={{
                        labels: summary.byCategory.map((c) => EXPENSE_CATEGORY_META[c.category].label),
                        datasets: [{ data: summary.byCategory.map((c) => c.amount), backgroundColor: summary.byCategory.map((c) => EXPENSE_CATEGORY_META[c.category].color), borderWidth: 0 }],
                      }}
                      options={{ plugins: { legend: { display: false } }, cutout: '68%' }}
                      aria-label="Expense breakdown by category"
                      role="img"
                    />
                  </div>
                  <CategoryBars summary={summary} money={money} limits={financeSettings.categoryLimits} />
                </div>
              )}
            </Card>
            <Card title="Recent transactions">
              <TransactionList items={transactions.slice(0, 6)} money={money} onEdit={setEditor} onDelete={setDeleting} />
            </Card>
          </div>
        </>
      )}

      {tab === 'transactions' && (
        <Card>
          <div className="fin-filters">
            <SegmentedControl
              ariaLabel="Transaction type"
              options={[
                { value: 'all', label: 'All' },
                { value: 'expense', label: 'Expenses' },
                { value: 'income', label: 'Income' },
              ]}
              value={typeFilter}
              onChange={setTypeFilter}
            />
            <Select
              aria-label="Filter by category"
              placeholder="All categories"
              options={[{ value: '' as const, label: 'All categories' }, ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: EXPENSE_CATEGORY_META[c].label }))]}
              value={categoryFilter}
              onChange={(v) => setCategoryFilter(v as ExpenseCategory | '')}
            />
          </div>
          <TransactionList items={transactions} money={money} onEdit={setEditor} onDelete={setDeleting} />
        </Card>
      )}

      {tab === 'analytics' && (
        <div className="fin-grid">
          <Card title="Monthly trends">
            <div style={{ position: 'relative', height: 240 }}>
              <Bar
                role="img"
                aria-label="Income and spending for the last six months"
                data={{
                  labels: trend.map((t) => new Date(`${t.month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'short' })),
                  datasets: [
                    { label: 'Income', data: trend.map((t) => t.income), backgroundColor: 'rgba(74, 222, 128, 0.75)', borderRadius: 6 },
                    { label: 'Spending', data: trend.map((t) => t.spent), backgroundColor: 'rgba(244, 114, 182, 0.75)', borderRadius: 6 },
                  ],
                }}
                options={{ responsive: true, maintainAspectRatio: false, scales: { x: baseScale, y: { ...baseScale, beginAtZero: true } } }}
              />
            </div>
          </Card>
          <Card title="Savings trend">
            <TrendLine
              labels={trend.map((t) => new Date(`${t.month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'short' }))}
              series={[{ label: 'Savings', values: trend.map((t) => t.savings), color: '#2dd4bf' }]}
              min={Math.min(0, ...trend.map((t) => t.savings))}
              ariaLabel="Savings per month"
              height={240}
            />
          </Card>
          <Card title={`Category distribution · ${monthLabel(month)}`}>
            {summary.byCategory.length ? <CategoryBars summary={summary} money={money} limits={financeSettings.categoryLimits} /> : <EmptyState>No expenses this month.</EmptyState>}
          </Card>
          <Card title="Expense history">
            <TransactionList items={transactions.filter((t) => t.kind === 'expense')} money={money} onEdit={setEditor} onDelete={setDeleting} />
          </Card>
        </div>
      )}

      {tab === 'budgets' && (
        <BudgetEditor
          settings={financeSettings}
          spentByCategory={new Map(monthSummary(expenses, income, monthKey(today), today).byCategory.map((c) => [c.category, c.amount]))}
          busy={isPending('finance:settings')}
          onSave={(next) => run('finance:settings', () => saveFinanceSettings(uid, next), { success: 'Budgets saved.' })}
        />
      )}

      {editor?.kind === 'expense' && (
        <ExpenseForm
          initial={editor.item}
          today={today}
          busy={isPending('finance:expense')}
          onClose={() => setEditor(null)}
          onSubmit={(input) => run('finance:expense', () => (editor.item ? updateExpense(uid, editor.item, input) : addExpense(uid, input)), { success: editor.item ? 'Expense updated.' : 'Expense added.' })}
        />
      )}
      {editor?.kind === 'income' && (
        <IncomeForm
          initial={editor.item}
          today={today}
          busy={isPending('finance:income')}
          onClose={() => setEditor(null)}
          onSubmit={(input) => run('finance:income', () => (editor.item ? updateIncome(uid, editor.item, input) : addIncome(uid, input)), { success: editor.item ? 'Income updated.' : 'Income added.' })}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.kind}?`}
          message="This can't be undone."
          confirmLabel="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            run('finance:delete', () => (deleting.kind === 'expense' ? deleteExpense(uid, deleting.item) : deleteIncome(uid, deleting.item)), { success: 'Deleted.' }).then(() => setDeleting(null))
          }
        />
      )}
    </div>
  );
}

function CategoryBars({ summary, money, limits }: { summary: ReturnType<typeof monthSummary>; money: (n: number) => string; limits: FinanceSettings['categoryLimits'] }) {
  return (
    <ul className="fin-cats">
      {summary.byCategory.map((c) => {
        const limit = limits[c.category];
        return (
          <li key={c.category} style={{ '--cat': EXPENSE_CATEGORY_META[c.category].color } as CSSProperties} className={limit && c.amount > limit ? 'is-over' : ''}>
            <span>
              {EXPENSE_CATEGORY_META[c.category].emoji} {EXPENSE_CATEGORY_META[c.category].label}
            </span>
            <span className="fin-bar">
              <span style={{ width: `${Math.round(c.share * 100)}%` }} />
            </span>
            <strong>
              {money(c.amount)}
              {limit ? <small> / {money(limit)}</small> : null}
            </strong>
          </li>
        );
      })}
    </ul>
  );
}

type Txn = { kind: 'expense'; item: Expense } | { kind: 'income'; item: Income };

function TransactionList({ items, money, onEdit, onDelete }: { items: Txn[]; money: (n: number) => string; onEdit: (e: Editor) => void; onDelete: (t: Txn) => void }) {
  if (!items.length) return <EmptyState>No transactions here yet.</EmptyState>;
  return (
    <ul className="fin-txns">
      {items.map((t) => {
        const isExpense = t.kind === 'expense';
        const meta = isExpense ? EXPENSE_CATEGORY_META[t.item.category] : { emoji: '💰', label: 'Income', color: '#4ade80' };
        return (
          <li key={`${t.kind}-${t.item.id}`} style={{ '--cat': meta.color } as CSSProperties}>
            <span className="fin-txns__icon" aria-hidden="true">
              {meta.emoji}
            </span>
            <div className="fin-txns__text">
              <strong>{isExpense ? t.item.description || meta.label : t.item.source}</strong>
              <span>
                {formatDate(t.item.date, { weekday: 'short', month: 'short', day: 'numeric' })} · {isExpense ? `${meta.label} · ${PAYMENT_LABEL[t.item.paymentMethod]}` : 'Income'}
              </span>
            </div>
            <strong className={isExpense ? 'fin-txns__amount' : 'fin-txns__amount is-income'}>
              {isExpense ? '−' : '+'}
              {money(t.item.amount)}
            </strong>
            <div className="fin-txns__actions">
              <button type="button" className="fin-link" onClick={() => onEdit(t.kind === 'expense' ? { kind: 'expense', item: t.item } : { kind: 'income', item: t.item })}>
                Edit
              </button>
              <button type="button" className="fin-link fin-link--danger" onClick={() => onDelete(t)}>
                Delete
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ExpenseForm({ initial, today, busy, onSubmit, onClose }: { initial?: Expense; today: string; busy: boolean; onSubmit: (input: ExpenseInput) => Promise<boolean>; onClose: () => void }) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [category, setCategory] = useState<ExpenseCategory>(initial?.category ?? 'food');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initial?.date ?? today);
  const [paymentMethod, setPayment] = useState<PaymentMethod>(initial?.paymentMethod ?? 'upi');
  const [formError, setFormError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await withInlineErrors(() => onSubmit({ amount: Number(amount), category, description, date, paymentMethod }), setFormError);
    if (ok) onClose();
  }

  return (
    <Modal title={initial ? 'Edit expense' : 'Add expense'} onClose={onClose}>
      <form className="fin-form" onSubmit={submit}>
        <Input label="Amount" type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
        <div className="fin-form__cats" role="group" aria-label="Category">
          {EXPENSE_CATEGORIES.map((c) => (
            <button key={c} type="button" className={`fin-chip${category === c ? ' is-active' : ''}`} style={{ '--cat': EXPENSE_CATEGORY_META[c].color } as CSSProperties} aria-pressed={category === c} onClick={() => setCategory(c)}>
              {EXPENSE_CATEGORY_META[c].emoji} {EXPENSE_CATEGORY_META[c].label}
            </button>
          ))}
        </div>
        <Input label="Description" maxLength={120} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Groceries" />
        <div className="fin-form__row">
          <Input label="Date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} required />
          <Select label="Payment method" options={PAYMENT_METHODS.map((p) => ({ value: p, label: PAYMENT_LABEL[p] }))} value={paymentMethod} onChange={setPayment} />
        </div>
        <ErrorText>{formError}</ErrorText>
        <div className="fin-form__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function IncomeForm({ initial, today, busy, onSubmit, onClose }: { initial?: Income; today: string; busy: boolean; onSubmit: (input: IncomeInput) => Promise<boolean>; onClose: () => void }) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [source, setSource] = useState(initial?.source ?? '');
  const [date, setDate] = useState(initial?.date ?? today);
  const [formError, setFormError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await withInlineErrors(() => onSubmit({ amount: Number(amount), source, date }), setFormError);
    if (ok) onClose();
  }

  return (
    <Modal title={initial ? 'Edit income' : 'Add income'} onClose={onClose}>
      <form className="fin-form" onSubmit={submit}>
        <Input label="Amount" type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
        <Input label="Source" maxLength={60} value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Salary, Freelance" required />
        <Input label="Date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} required />
        <ErrorText>{formError}</ErrorText>
        <div className="fin-form__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function BudgetEditor({ settings, spentByCategory, busy, onSave }: { settings: FinanceSettings; spentByCategory: Map<ExpenseCategory, number>; busy: boolean; onSave: (s: FinanceSettings) => Promise<boolean> }) {
  const [currency, setCurrency] = useState(settings.currency);
  const [budget, setBudget] = useState(settings.monthlyBudget ? String(settings.monthlyBudget) : '');
  const [limits, setLimits] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(settings.categoryLimits).map(([k, v]) => [k, String(v)])));
  const [goals, setGoals] = useState<SavingGoal[]>(settings.savingGoals);
  const [formError, setFormError] = useState('');

  const updateGoal = (id: string, patch: Partial<SavingGoal>) => setGoals((list) => list.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  async function save(e: FormEvent) {
    e.preventDefault();
    const categoryLimits: FinanceSettings['categoryLimits'] = {};
    for (const [k, v] of Object.entries(limits)) if (Number(v) > 0) categoryLimits[k as ExpenseCategory] = Number(v);
    await withInlineErrors(() => onSave({ currency, monthlyBudget: Number(budget) > 0 ? Number(budget) : null, categoryLimits, savingGoals: goals }), setFormError);
  }

  return (
    <form className="fin-grid" onSubmit={save}>
      <Card title="Budget & spending limits">
        <div className="fin-form__row">
          <Input label="Currency symbol" maxLength={4} value={currency} onChange={(e) => setCurrency(e.target.value)} />
          <Input label="Monthly budget" type="number" min="0" step="1" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="No budget" />
        </div>
        <p className="fin-muted">Category limits (per month) — leave empty for no limit.</p>
        <div className="fin-limits">
          {EXPENSE_CATEGORIES.map((c) => (
            <Input
              key={c}
              label={`${EXPENSE_CATEGORY_META[c].emoji} ${EXPENSE_CATEGORY_META[c].label}`}
              type="number"
              min="0"
              step="1"
              value={limits[c] ?? ''}
              hint={spentByCategory.get(c) ? `Spent this month: ${currency}${spentByCategory.get(c)!.toLocaleString('en-US')}` : undefined}
              onChange={(e) => setLimits((l) => ({ ...l, [c]: e.target.value }))}
            />
          ))}
        </div>
      </Card>
      <Card title="Saving goals">
        {goals.length === 0 && <p className="fin-muted">No saving goals yet.</p>}
        <ul className="fin-goals">
          {goals.map((g) => {
            const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
            return (
              <li key={g.id}>
                <div className="fin-form__row">
                  <Input label="Goal" value={g.name} maxLength={40} onChange={(e) => updateGoal(g.id, { name: e.target.value })} />
                  <Input label="Target" type="number" min="0" value={g.target || ''} onChange={(e) => updateGoal(g.id, { target: Number(e.target.value) })} />
                  <Input label="Saved" type="number" min="0" value={g.saved || ''} onChange={(e) => updateGoal(g.id, { saved: Number(e.target.value) })} />
                </div>
                <div className="fin-goal-progress">
                  <span className="fin-bar">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <strong>{pct}%</strong>
                  <button type="button" className="fin-link fin-link--danger" onClick={() => setGoals((list) => list.filter((x) => x.id !== g.id))}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <Button type="button" variant="ghost" onClick={() => setGoals((list) => [...list, { id: newSavingGoalId(), name: '', target: 0, saved: 0, deadline: null }])}>
          + Add saving goal
        </Button>
      </Card>
      <div className="fin-form__actions fin-form__actions--wide">
        <ErrorText>{formError}</ErrorText>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save budgets & goals'}
        </Button>
      </div>
    </form>
  );
}
