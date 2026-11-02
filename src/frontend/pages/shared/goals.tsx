import { useMemo, useState } from 'react';
import GoalCard from '../../components/shared/GoalCard';
import GoalForm from '../../components/shared/goals/GoalForm';
import GoalHistory from '../../components/shared/goals/GoalHistory';
import { ArrowLink, Card, ConfirmDialog, EmptyState, Grid, Modal, PageHeader, SegmentedControl, StatCard } from '../../components/shared/ui';
import { ErrorState, PageSkeleton } from '../../components/shared/feedback/Feedback';
import { useUserData } from '../../context/useUserData';
import { useAction } from '../../hooks/useAction';
import { changeMilestone, createGoal, deleteGoal, updateGoal } from '../../../backend/services/goalService';
import { goalStats } from '../../../backend/analytics/metrics';
import type { GoalInput } from '../../../backend/validators';
import './goals.css';

type Filter = 'active' | 'complete' | 'overdue' | 'all';
const EMPTY_GOAL: GoalInput = { title: '', detail: '', term: 'short', dueDate: null, milestones: 3, milestoneNames: ['', '', ''] };

export default function Goals() {
  const { uid, goals, goalProgress, today, loading, error, retry } = useUserData();
  const { run, isPending } = useAction();
  const [filter, setFilter] = useState<Filter>('active');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const stats = useMemo(() => goalStats(goals, goalProgress, today), [goals, goalProgress, today]);
  const visible = useMemo(() => {
    const list = goals.filter((g) => {
      if (filter === 'active') return g.status !== 'complete';
      if (filter === 'complete') return g.status === 'complete';
      if (filter === 'overdue') return g.status !== 'complete' && g.dueDate !== null && g.dueDate < today;
      return true;
    });
    // Nearest due date first; undated goals last.
    return list.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || b.createdAt.localeCompare(a.createdAt));
  }, [goals, filter, today]);

  const editing = goals.find((g) => g.id === editingId);
  const history = goals.find((g) => g.id === historyId);
  const deleting = goals.find((g) => g.id === deletingId);

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (loading) return <PageSkeleton />;

  return (
    <div className="goals-page">
      <PageHeader
        title="Goals"
        subtitle="Longer arcs, broken into milestones you can actually tick off."
        action={<ArrowLink to="/trackers?tab=goals">View Goal History</ArrowLink>}
      />

      <Grid minItemWidth={150}>
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Completed" value={stats.completed} />
        <StatCard label="Overdue" value={stats.overdue} />
        <StatCard label="Milestones (30d)" value={stats.milestonesLast30} />
      </Grid>

      <Card eyebrow="New goal">
        <GoalForm
          className="goals-page__form"
          initial={EMPTY_GOAL}
          today={today}
          submitLabel="Add goal"
          onSubmit={(input) => run('create', () => createGoal(uid, input, today), { success: 'Goal created.' })}
        />
      </Card>

      <SegmentedControl
        ariaLabel="Goal filter"
        options={[
          { value: 'active', label: 'Active' },
          { value: 'overdue', label: `Overdue (${stats.overdue})` },
          { value: 'complete', label: 'Completed' },
          { value: 'all', label: 'All' },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {visible.length === 0 ? (
        <EmptyState>{goals.length === 0 ? 'No goals yet. Add one above.' : 'No goals in this view.'}</EmptyState>
      ) : (
        <div className="goals-page__list">
          {visible.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              today={today}
              busy={isPending(`milestone:${g.id}`)}
              onMilestone={(delta) =>
                void run(`milestone:${g.id}`, () => changeMilestone(uid, g, delta), {
                  success: delta > 0 && g.milestonesComplete + 1 === g.milestones ? `Goal completed: ${g.title}` : undefined,
                })
              }
              onEdit={() => setEditingId(g.id)}
              onHistory={() => setHistoryId(g.id)}
              onDelete={() => setDeletingId(g.id)}
            />
          ))}
        </div>
      )}

      {editing && (
        <Modal title="Edit goal" onClose={() => setEditingId(null)}>
          <GoalForm
            initial={{ title: editing.title, detail: editing.detail, term: editing.term, dueDate: editing.dueDate, milestones: editing.milestones, milestoneNames: editing.milestoneNames }}
            today={today}
            minMilestones={Math.max(1, editing.milestonesComplete)}
            completedMilestones={editing.milestonesComplete}
            submitLabel="Save"
            onSubmit={(input) => run('edit', () => updateGoal(uid, editing, input, today), { success: 'Goal updated.' })}
            onDone={() => setEditingId(null)}
            onCancel={() => setEditingId(null)}
          />
        </Modal>
      )}

      {history && <GoalHistory goal={history} history={goalProgress} onClose={() => setHistoryId(null)} />}

      {deleting && (
        <ConfirmDialog
          title="Delete goal?"
          message={`"${deleting.title}" and its progress history will be permanently removed.`}
          confirmLabel="Delete"
          onConfirm={() => {
            setDeletingId(null);
            void run('delete', () => deleteGoal(uid, deleting, goalProgress), { success: 'Goal deleted.' });
          }}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
