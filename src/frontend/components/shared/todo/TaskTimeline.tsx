import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SegmentedControl from '../ui/SegmentedControl';
import { formatDate, isoFromTimestamp } from '../../../../backend/core/dates';
import type { TaskActivity, TaskActivityType } from '../../../../backend/todo/types';

const STYLE: Record<TaskActivityType, { icon: string; color: string; label: string }> = {
  created: { icon: '✚', color: '#a78bfa', label: 'Task created' },
  status: { icon: '⇄', color: '#60a5fa', label: 'Status changed' },
  priority: { icon: '⚑', color: '#f97316', label: 'Priority updated' },
  completed: { icon: '✓', color: '#4ade80', label: 'Task completed' },
  reopened: { icon: '↺', color: '#facc15', label: 'Task reopened' },
  edited: { icon: '✎', color: '#94a3b8', label: 'Task edited' },
  subtask: { icon: '☑', color: '#2dd4bf', label: 'Subtask' },
  focus: { icon: '◎', color: '#c084fc', label: 'Focus session' },
  deleted: { icon: '🗑', color: '#f87171', label: 'Task deleted' },
  archived: { icon: '🗄', color: '#6b7280', label: 'Archived' },
  restored: { icon: '↩', color: '#a78bfa', label: 'Restored' },
};

type Filter = 'all' | 'progress' | 'completion' | 'changes';
const FILTERS: Record<Filter, TaskActivityType[] | null> = {
  all: null,
  progress: ['status', 'subtask', 'focus'],
  completion: ['completed', 'reopened'],
  changes: ['created', 'priority', 'edited', 'deleted', 'archived', 'restored'],
};

export default function TaskTimeline({ activity, today, onOpenTask }: { activity: TaskActivity[]; today: string; onOpenTask: (taskId: string) => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const groups = useMemo(() => {
    const allowed = FILTERS[filter];
    const map = new Map<string, TaskActivity[]>();
    activity
      .filter((a) => !allowed || allowed.includes(a.type))
      .forEach((a) => {
        const day = isoFromTimestamp(a.createdAt);
        map.set(day, [...(map.get(day) ?? []), a]);
      });
    return [...map.entries()];
  }, [activity, filter]);

  return (
    <div className="todo-timeline">
      <SegmentedControl
        ariaLabel="Filter activity"
        options={[
          { value: 'all', label: 'All' },
          { value: 'progress', label: 'Progress' },
          { value: 'completion', label: 'Completed' },
          { value: 'changes', label: 'Changes' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {groups.length === 0 ? (
        <p className="todo-muted">No activity yet. Everything you do with tasks shows up here.</p>
      ) : (
        groups.map(([day, items]) => (
          <section key={day} className="todo-timeline__day">
            <h4>{day === today ? 'Today' : formatDate(day, { weekday: 'long', month: 'short', day: 'numeric' })}</h4>
            <ol>
              <AnimatePresence initial={false}>
                {items.map((a, i) => {
                  const st = STYLE[a.type];
                  return (
                    <motion.li
                      key={a.id}
                      className="todo-timeline__item"
                      style={{ '--c': st.color } as CSSProperties}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i, 10) * 0.03 }}
                    >
                      <span className="todo-timeline__icon" aria-hidden="true">
                        {st.icon}
                      </span>
                      <div className="todo-timeline__card">
                        <span className="todo-timeline__type">{st.label}</span>
                        {a.type !== 'deleted' && a.taskId ? (
                          <button type="button" className="todo-timeline__task" onClick={() => onOpenTask(a.taskId)}>
                            {a.taskTitle}
                          </button>
                        ) : (
                          <span className="todo-timeline__task">{a.taskTitle}</span>
                        )}
                        <p>{a.message}</p>
                        <time dateTime={a.createdAt}>{new Date(a.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</time>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
