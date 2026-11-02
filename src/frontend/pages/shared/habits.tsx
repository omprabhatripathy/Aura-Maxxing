import { useMemo, useState } from 'react';
import HabitCard from '../../components/shared/HabitCard';
import HabitEditor from '../../components/shared/habits/HabitEditor';
import HabitHistory from '../../components/shared/habits/HabitHistory';
import HabitComposer from '../../components/shared/habits/HabitComposer';
import { ArrowLink, EmptyState, Grid, Input, PageHeader, SegmentedControl, Select, Toolbar } from '../../components/shared/ui';
import { ErrorState, PageSkeleton } from '../../components/shared/feedback/Feedback';
import { useUserData } from '../../context/useUserData';
import { useAction } from '../../hooks/useAction';
import { createHabit, deleteHabit, setHabitArchived, setHabitCompletion, updateHabit } from '../../../backend/services/habitService';
import { completionRate, habitStreak, isDone } from '../../../backend/analytics/habits';
import { addDays } from '../../../backend/core/dates';
import { PRIORITY_WEIGHT, type HabitCategory } from '../../../backend/models';
import { HABIT_CATEGORY_OPTIONS } from '../../lib/options';
import './habits.css';

type SortKey = 'name' | 'priority' | 'streak' | 'completion';
type View = 'active' | 'archived';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'priority', label: 'Sort: Priority' },
  { value: 'streak', label: 'Sort: Streak' },
  { value: 'completion', label: 'Sort: 30-day rate' },
  { value: 'name', label: 'Sort: Name' },
];

const FILTER_OPTIONS: { value: HabitCategory | 'all'; label: string }[] = [{ value: 'all', label: 'All categories' }, ...HABIT_CATEGORY_OPTIONS];

export default function Habits() {
  const { uid, habits, habitLogs, logsByHabit, today, loading, error, retry } = useUserData();
  const { run, isPending } = useAction();

  const [view, setView] = useState<View>('active');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<HabitCategory | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const from = addDays(today, -29);
    return new Map(habits.map((h) => [h.id, { done: isDone(h, logsByHabit, today), streak: habitStreak(h, logsByHabit, today), rate: completionRate([h], logsByHabit, from, today) }]));
  }, [habits, logsByHabit, today]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return habits
      .filter((h) => (view === 'archived' ? h.archived : !h.archived))
      .filter((h) => !q || h.label.toLowerCase().includes(q))
      .filter((h) => filterCategory === 'all' || h.category === filterCategory)
      .sort((a, b) => {
        const sa = stats.get(a.id)!;
        const sb = stats.get(b.id)!;
        if (sortKey === 'priority') return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || a.label.localeCompare(b.label);
        if (sortKey === 'streak') return sb.streak - sa.streak;
        if (sortKey === 'completion') return (sb.rate ?? -1) - (sa.rate ?? -1);
        return a.label.localeCompare(b.label);
      });
  }, [habits, view, search, filterCategory, sortKey, stats]);

  const activeCount = habits.filter((h) => !h.archived).length;
  const doneToday = habits.filter((h) => !h.archived && stats.get(h.id)?.done).length;

  const toggle = (habitId: string, date: string, done: boolean) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    void run(`toggle:${habitId}:${date}`, () => setHabitCompletion(uid, habit, date, done), { error: 'Could not update this habit.' });
  };

  const editing = habits.find((h) => h.id === editingId);
  const history = habits.find((h) => h.id === historyId);

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (loading) return <PageSkeleton />;

  return (
    <div className="habits-page">
      <PageHeader
        title="Habits"
        subtitle={activeCount ? `${doneToday} of ${activeCount} done for today. Tick a card to log it.` : 'Small, repeatable actions. Create your first habit below.'}
        action={<ArrowLink to="/trackers?tab=habits">View Habit Tracker</ArrowLink>}
      />

      <HabitComposer onCreate={(input) => run('create', () => createHabit(uid, input, habits), { success: 'Habit created.' })} />

      <SegmentedControl
        ariaLabel="Habit list"
        options={[
          { value: 'active', label: `Active (${activeCount})` },
          { value: 'archived', label: `Archived (${habits.length - activeCount})` },
        ]}
        value={view}
        onChange={setView}
      />

      <Toolbar>
        <Input placeholder="Search habits…" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select aria-label="Filter by category" options={FILTER_OPTIONS} value={filterCategory} onChange={setFilterCategory} />
        <Select aria-label="Sort habits" options={SORT_OPTIONS} value={sortKey} onChange={setSortKey} />
      </Toolbar>

      {visible.length === 0 ? (
        <EmptyState>
          {habits.length === 0 ? 'No habits yet — add one above to start building streaks.' : view === 'archived' ? 'No archived habits.' : 'No habits match your filters.'}
        </EmptyState>
      ) : (
        <Grid minItemWidth={260}>
          {visible.map((h) => {
            const s = stats.get(h.id)!;
            return (
              <HabitCard
                key={h.id}
                habit={h}
                done={s.done}
                streak={s.streak}
                rate30={s.rate}
                busy={isPending(`toggle:${h.id}:${today}`)}
                onToggle={() => toggle(h.id, today, !s.done)}
                onEdit={() => setEditingId(h.id)}
                onHistory={() => setHistoryId(h.id)}
              />
            );
          })}
        </Grid>
      )}

      {editing && (
        <HabitEditor
          habit={editing}
          completions={habitLogs.filter((l) => l.habitId === editing.id).length}
          onSave={(next) => run('edit', () => updateHabit(uid, editing, next, habits), { success: 'Habit updated.' })}
          onArchive={(archived) => run('archive', () => setHabitArchived(uid, editing, archived), { success: archived ? 'Habit archived. Its history is kept.' : 'Habit restored.' })}
          onDelete={() => run('delete', () => deleteHabit(uid, editing, habitLogs), { success: 'Habit deleted.' })}
          onClose={() => setEditingId(null)}
        />
      )}

      {history && (
        <HabitHistory
          habit={history}
          logs={habitLogs}
          logsByHabit={logsByHabit}
          today={today}
          busyDate={null}
          onToggleDate={(date, done) => toggle(history.id, date, done)}
          onClose={() => setHistoryId(null)}
        />
      )}
    </div>
  );
}
