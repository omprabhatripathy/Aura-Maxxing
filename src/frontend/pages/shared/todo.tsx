import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { PageHeader, SegmentedControl } from '../../components/shared/ui';
import { ErrorState, PageSkeleton } from '../../components/shared/feedback/Feedback';
import TodoSummary from '../../components/shared/todo/TodoSummary';
import TaskQuickAdd from '../../components/shared/todo/TaskQuickAdd';
import TaskCard from '../../components/shared/todo/TaskCard';
import TaskEditor from '../../components/shared/todo/TaskEditor';
import TaskBoard from '../../components/shared/todo/TaskBoard';
import TaskCalendar from '../../components/shared/todo/TaskCalendar';
import TodoAnalytics from '../../components/shared/todo/TodoAnalytics';
import TodoAchievements from '../../components/shared/todo/TodoAchievements';
import TaskTimeline from '../../components/shared/todo/TaskTimeline';
import NotificationBell from '../../components/shared/todo/NotificationBell';
import TaskOptionsSheet from '../../components/shared/todo/TaskOptionsSheet';
import { PriorityTag } from '../../components/shared/todo/Badges';
import { dueLabel, emptyTaskInput, taskToInput } from '../../components/shared/todo/meta';
import { useTodo } from '../../context/useTodo';
import { useUserData } from '../../context/useUserData';
import { useHeaderSlot } from '../../context/useHeaderSlot';
import { useTaskActions } from '../../hooks/useTaskActions';
import { savePreferences } from '../../../backend/services/profileService';
import { isOpen, matchesFilter, matchesSearch, sortTasks, suggestNextTask, type TaskFilter, type TaskSort } from '../../../backend/todo/analytics';
import { STATUS_LABEL, TASK_STATUSES, type Task, type TaskInput, type TaskStatus } from '../../../backend/todo/types';
import '../../components/shared/todo/todo.css';

type View = 'list' | 'board' | 'calendar' | 'analytics' | 'achievements' | 'activity';
type Editor = { mode: 'new'; initial: TaskInput; fromQuickAdd?: boolean } | { mode: 'edit'; task: Task } | null;

const VIEWS: { value: View; label: string }[] = [
  { value: 'list', label: 'Tasks' },
  { value: 'board', label: 'Board' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'achievements', label: 'Achievements' },
  { value: 'activity', label: 'Activity' },
];

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Due today' },
  { value: 'week', label: 'This week' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'high', label: 'High priority' },
  { value: 'completed', label: 'Completed' },
];

const SORTS: { value: TaskSort; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'due', label: 'Due date' },
  { value: 'created', label: 'Newest' },
  { value: 'progress', label: 'Completion' },
];

export default function Todo() {
  const { uid, tasks, activity, sessions, notifications, dayStats, today, now, loading, error, retry } = useTodo();
  const { goals, habits, preferences } = useUserData();
  const actions = useTaskActions();
  const headerSlot = useHeaderSlot();

  const [view, setView] = useState<View>('list');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'any'>('any');
  const [sort, setSort] = useState<TaskSort>('priority');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const navigate = useNavigate();
  // Focus lives on the Pomodoro page; a task-linked session completes the task when the timer ends.
  const startFocus = (taskId: string | null) => navigate(taskId ? `/pomodoro?task=${encodeURIComponent(taskId)}` : '/pomodoro');
  const [optionsId, setOptionsId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [quickAddKey, setQuickAddKey] = useState(0);

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const activityByTask = useMemo(() => {
    const map = new Map<string, typeof activity>();
    activity.forEach((a) => map.set(a.taskId, [...(map.get(a.taskId) ?? []), a]));
    return map;
  }, [activity]);
  const goalNames = useMemo(() => new Map(goals.map((g) => [g.id, g.title])), [goals]);
  const habitNames = useMemo(() => new Map(habits.map((h) => [h.id, h.label])), [habits]);

  const visible = useMemo(() => {
    const list = tasks.filter(
      (t) => (statusFilter === 'any' ? matchesFilter(t, filter, today, now) : t.status === statusFilter && (filter === 'all' || matchesFilter(t, filter, today, now))) && matchesSearch(t, search)
    );
    const sorted = sortTasks(list, sort);
    return { open: sorted.filter(isOpen), closed: sorted.filter((t) => !isOpen(t)) };
  }, [tasks, filter, statusFilter, search, sort, today, now]);

  const suggestion = useMemo(() => suggestNextTask(tasks, now, today), [tasks, now, today]);

  const optionsTask = optionsId ? byId.get(optionsId) : undefined;
  const deleting = deletingId ? byId.get(deletingId) : undefined;

  function openTask(taskId: string) {
    const task = byId.get(taskId);
    if (!task) return;
    setView('list');
    setSearch('');
    setFilter('all');
    setStatusFilter(task.status === 'archived' ? 'archived' : 'any');
    setExpandedId(taskId);
    window.setTimeout(() => document.getElementById(`task-${taskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
  }

  async function enableBrowserAlerts() {
    if (typeof Notification === 'undefined') return;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') await savePreferences(uid, { browserNotifications: true });
  }

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (loading) return <PageSkeleton cards={4} />;

  const renderCard = (task: Task) => (
    <TaskCard
      key={task.id}
      task={task}
        byId={byId}
        now={now}
        today={today}
        expanded={expandedId === task.id}
        activity={activityByTask.get(task.id) ?? []}
        links={{ goal: task.goalId ? goalNames.get(task.goalId) : undefined, habit: task.habitId ? habitNames.get(task.habitId) : undefined }}
        actions={actions}
        onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
        onEdit={() => setEditor({ mode: 'edit', task })}
        onFocus={() => startFocus(task.id)}
        onOptions={() => setOptionsId(task.id)}
        onDelete={() => setDeletingId(task.id)}
      />
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="todo-page">
        <PageHeader
          title="Todo"
          subtitle="Capture, prioritise and finish what matters — with focus sessions, streaks and XP."
          aside={
            <button type="button" className="todo-cta todo-cta--inline" onClick={() => startFocus(suggestion?.task.id ?? null)}>
              ◎ Start Focus Session
            </button>
          }
        />
        {headerSlot &&
          createPortal(
            <NotificationBell
              notifications={notifications}
              browserEnabled={preferences.browserNotifications && typeof Notification !== 'undefined' && Notification.permission === 'granted'}
              onEnableBrowser={() => void enableBrowserAlerts()}
              onOpenTask={openTask}
              onMarkRead={(ids) => void actions.markRead(ids)}
              onClear={(ids) => void actions.clearNotifications(ids)}
            />,
            headerSlot
          )}

        <TodoSummary tasks={tasks} sessions={sessions} today={today} now={now} />

        <AnimatePresence>
          {suggestion && (
            <motion.section className="todo-next" aria-label="Suggested next task" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div>
                <p className="todo-tile__label">✨ Suggested next · {suggestion.reason}</p>
                <button type="button" className="todo-next__title" onClick={() => openTask(suggestion.task.id)}>
                  {suggestion.task.title}
                </button>
                <div className="todo-card__meta">
                  <PriorityTag priority={suggestion.task.priority} />
                  {(() => {
                    const due = dueLabel(suggestion.task, now, today);
                    return due ? <span className={`todo-due todo-due--${due.tone}`}>⏰ {due.text}</span> : null;
                  })()}
                </div>
              </div>
              <button type="button" className="todo-btn todo-btn--primary" onClick={() => startFocus(suggestion.task.id)}>
                ◎ Focus on this
              </button>
            </motion.section>
          )}
        </AnimatePresence>

        <TaskQuickAdd key={quickAddKey} today={today} onCreate={actions.create} onMore={(draft) => setEditor({ mode: 'new', initial: draft, fromQuickAdd: true })} />

        <div className="todo-page__views">
          <SegmentedControl ariaLabel="Todo views" options={VIEWS} value={view} onChange={setView} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
            {view === 'list' && (
              <section className="todo-list-view" aria-label="Active tasks">
                <div className="todo-filters">
                  <div className="todo-search-wrap">
                    <svg className="todo-search-wrap__icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M20 20l-3.5-3.5" />
                    </svg>
                    <input className="todo-search" type="search" placeholder="Search title, #tag, priority, status…" aria-label="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'any')}>
                    <option value="any">Any status</option>
                    {TASK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <select aria-label="Sort tasks" value={sort} onChange={(e) => setSort(e.target.value as TaskSort)}>
                    {SORTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        Sort: {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="todo-chips" role="group" aria-label="Quick filters">
                  {FILTERS.map((f) => (
                    <button key={f.value} type="button" aria-pressed={filter === f.value} className={filter === f.value ? 'is-active' : ''} onClick={() => setFilter(f.value)}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <p className="todo-muted todo-swipe-hint">Tip: swipe a task right to complete, left to delete, or long-press for options.</p>

                {visible.open.length + visible.closed.length === 0 ? (
                  <div className="todo-empty">
                    <svg className="todo-empty__planet" viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
                      <defs>
                        <linearGradient id="todo-planet-body" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" style={{ stopColor: 'var(--color-tertiary, #f3aeff)' }} />
                          <stop offset="100%" style={{ stopColor: 'var(--color-primary, #8b5cf6)' }} />
                        </linearGradient>
                      </defs>
                      <path d="M8 40c-4 6-2 9 6 8 8-1 22-7 32-14s16-14 12-18c-2-2-6-2-11 0" fill="none" style={{ stroke: 'var(--color-primary, #8b5cf6)' }} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
                      <circle cx="32" cy="32" r="16" fill="url(#todo-planet-body)" />
                      <path d="M17 38c6 1 20-3 30-12" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" />
                      <path d="M47 18c3-1 5-1 6 0 3 3-4 11-14 18S16 46 9 47" fill="none" style={{ stroke: 'var(--color-secondary, #cebdff)' }} strokeWidth="3" strokeLinecap="round" />
                      <circle cx="52" cy="10" r="1.6" style={{ fill: 'var(--color-tertiary, #f3aeff)' }} />
                      <circle cx="10" cy="18" r="1.2" style={{ fill: 'var(--color-secondary, #cebdff)' }} />
                    </svg>
                    <p>{tasks.length === 0 ? 'No tasks yet. Add your first one above.' : 'No tasks match these filters.'}</p>
                  </div>
                ) : (
                  <div className="todo-list">
                    <AnimatePresence initial={false}>{visible.open.map(renderCard)}</AnimatePresence>
                    {visible.closed.length > 0 && (
                      <>
                        <h3 className="todo-list__divider">
                          {statusFilter === 'archived' ? 'Archived' : 'Completed'} · {visible.closed.length}
                        </h3>
                        <AnimatePresence initial={false}>{visible.closed.map(renderCard)}</AnimatePresence>
                      </>
                    )}
                  </div>
                )}
              </section>
            )}

            {view === 'board' && <TaskBoard tasks={tasks} now={now} today={today} actions={actions} onOpen={(t) => openTask(t.id)} onOptions={(t) => setOptionsId(t.id)} />}

            {view === 'calendar' && (
              <TaskCalendar tasks={tasks} sessions={sessions} now={now} today={today} onOpen={(t) => openTask(t.id)} onAdd={(date) => setEditor({ mode: 'new', initial: emptyTaskInput({ dueDate: date }) })} />
            )}

            {view === 'analytics' && <TodoAnalytics tasks={tasks} sessions={sessions} dayStats={dayStats} today={today} now={now} />}
            {view === 'achievements' && <TodoAchievements tasks={tasks} sessions={sessions} today={today} now={now} />}
            {view === 'activity' && <TaskTimeline activity={activity} today={today} onOpenTask={openTask} />}
          </motion.div>
        </AnimatePresence>

        {editor && (
          <TaskEditor
            title={editor.mode === 'new' ? 'New task' : 'Edit task'}
            initial={editor.mode === 'new' ? editor.initial : taskToInput(editor.task)}
            taskId={editor.mode === 'edit' ? editor.task.id : undefined}
            tasks={tasks}
            goals={goals}
            habits={habits.filter((h) => !h.archived)}
            today={today}
            submitLabel={editor.mode === 'new' ? 'Create task' : 'Save changes'}
            onSubmit={async (input) => {
              if (editor.mode === 'edit') return actions.update(editor.task, input);
              const ok = await actions.create(input);
              if (ok && editor.fromQuickAdd) setQuickAddKey((k) => k + 1);
              return ok;
            }}
            onClose={() => setEditor(null)}
          />
        )}

        <AnimatePresence>
          {optionsTask && (
            <TaskOptionsSheet
              task={optionsTask}
              onMove={(s) => void actions.setStatus(optionsTask, s)}
              onFocus={() => startFocus(optionsTask.id)}
              onEdit={() => setEditor({ mode: 'edit', task: optionsTask })}
              onArchiveToggle={() => void (optionsTask.status === 'archived' ? actions.restore(optionsTask) : actions.setStatus(optionsTask, 'archived'))}
              onDelete={() => setDeletingId(optionsTask.id)}
              onClose={() => setOptionsId(null)}
            />
          )}
        </AnimatePresence>

        {deleting && (
          <ConfirmDialog
            title="Delete task?"
            message={`“${deleting.title}” and its attachments will be removed permanently. Archive it instead to keep it in your history.`}
            confirmLabel="Delete"
            onConfirm={async () => {
              setDeletingId(null);
              if (expandedId === deleting.id) setExpandedId(null);
              await actions.remove(deleting);
            }}
            onCancel={() => setDeletingId(null)}
          />
        )}

        <AnimatePresence>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
