import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SegmentedControl from '../ui/SegmentedControl';
import { addDays, formatDate, fromIso, toIso, weekStart } from '../../../../backend/core/dates';
import { completedOn, isOverdue, sortTasks } from '../../../../backend/todo/analytics';
import type { FocusSession, Task } from '../../../../backend/todo/types';
import { PriorityTag, StatusPill } from './Badges';
import { formatMinutes, PRIORITY_COLOR } from './meta';

interface Props {
  tasks: Task[];
  sessions: FocusSession[];
  now: Date;
  today: string;
  onOpen: (task: Task) => void;
  onAdd: (date: string) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TaskCalendar({ tasks, sessions, now, today, onOpen, onAdd }: Props) {
  const [mode, setMode] = useState<'month' | 'week'>('month');
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState(today);

  const { days, title } = useMemo(() => {
    if (mode === 'week') {
      const start = weekStart(anchor);
      return {
        days: Array.from({ length: 7 }, (_, i) => addDays(start, i)),
        title: `${formatDate(start, { month: 'short', day: 'numeric' })} – ${formatDate(addDays(start, 6), { month: 'short', day: 'numeric', year: 'numeric' })}`,
      };
    }
    const first = fromIso(anchor);
    first.setDate(1);
    const start = weekStart(toIso(first));
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    const weeks = Math.ceil((Math.round((last.getTime() - fromIso(start).getTime()) / 86_400_000) + 1) / 7);
    return {
      days: Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i)),
      title: first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };
  }, [mode, anchor]);

  const byDay = useMemo(() => {
    const map = new Map<string, { due: Task[]; done: number; focus: number }>();
    const entry = (d: string) => map.get(d) ?? map.set(d, { due: [], done: 0, focus: 0 }).get(d)!;
    tasks.forEach((t) => {
      if (t.status === 'archived') return;
      if (t.dueDate) entry(t.dueDate).due.push(t);
      const c = completedOn(t);
      if (c) entry(c).done++;
    });
    sessions.forEach((s) => (entry(s.date).focus += s.minutes));
    return map;
  }, [tasks, sessions]);

  const month = fromIso(anchor).getMonth();
  const shift = (dir: 1 | -1) => {
    if (mode === 'week') return setAnchor(addDays(anchor, 7 * dir));
    const d = fromIso(anchor);
    setAnchor(toIso(new Date(d.getFullYear(), d.getMonth() + dir, 1)));
  };
  const selectedInfo = byDay.get(selected);
  const selectedTasks = sortTasks(selectedInfo?.due ?? [], 'priority');

  return (
    <div className="todo-calendar">
      <div className="todo-calendar__toolbar">
        <div className="todo-calendar__nav">
          <button type="button" className="todo-icon-btn" aria-label="Previous" onClick={() => shift(-1)}>
            ‹
          </button>
          <h3>{title}</h3>
          <button type="button" className="todo-icon-btn" aria-label="Next" onClick={() => shift(1)}>
            ›
          </button>
          <button
            type="button"
            className="todo-link"
            onClick={() => {
              setAnchor(today);
              setSelected(today);
            }}
          >
            Today
          </button>
        </div>
        <SegmentedControl
          ariaLabel="Calendar mode"
          options={[
            { value: 'month', label: 'Month' },
            { value: 'week', label: 'Week' },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>

      <div className={`todo-calendar__grid todo-calendar__grid--${mode}`} role="grid" aria-label={title}>
        {WEEKDAYS.map((d) => (
          <div key={d} className="todo-calendar__weekday" role="columnheader">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const info = byDay.get(day);
          const due = sortTasks(info?.due ?? [], 'priority');
          const limit = mode === 'week' ? 8 : 3;
          const outside = mode === 'month' && fromIso(day).getMonth() !== month;
          const hasOverdue = due.some((t) => isOverdue(t, now));
          return (
            <button
              key={day}
              type="button"
              role="gridcell"
              aria-selected={selected === day}
              aria-label={`${formatDate(day, { weekday: 'long', month: 'long', day: 'numeric' })}: ${due.length} due`}
              className={`todo-day${outside ? ' is-outside' : ''}${day === today ? ' is-today' : ''}${selected === day ? ' is-selected' : ''}${hasOverdue ? ' has-overdue' : ''}`}
              onClick={() => setSelected(day)}
            >
              <span className="todo-day__num">{fromIso(day).getDate()}</span>
              <span className="todo-day__chips">
                {due.slice(0, limit).map((t) => (
                  <span
                    key={t.id}
                    className={`todo-day__chip${t.status === 'done' ? ' is-done' : ''}${isOverdue(t, now) ? ' is-overdue' : ''}`}
                    style={{ '--c': PRIORITY_COLOR[t.priority] } as CSSProperties}
                  >
                    {t.title}
                  </span>
                ))}
                {due.length > limit && <span className="todo-day__more">+{due.length - limit} more</span>}
              </span>
              {info && (info.focus > 0 || info.done > 0) && (
                <span className="todo-day__foot">
                  {info.done > 0 && <span>✓{info.done}</span>}
                  {info.focus > 0 && <span>⏱{formatMinutes(info.focus)}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={selected} className="todo-calendar__day" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          <div className="todo-calendar__day-head">
            <h4>{formatDate(selected, { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
            <button type="button" className="todo-btn todo-btn--primary" onClick={() => onAdd(selected)}>
              + Add task
            </button>
          </div>
          {selectedInfo && (selectedInfo.focus > 0 || selectedInfo.done > 0) && (
            <p className="todo-muted">
              {selectedInfo.done} completed · {formatMinutes(selectedInfo.focus)} of focused work
            </p>
          )}
          {selectedTasks.length === 0 ? (
            <p className="todo-muted">Nothing due this day.</p>
          ) : (
            <ul className="todo-calendar__list">
              {selectedTasks.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => onOpen(t)}>
                    <span className={t.status === 'done' ? 'is-done' : ''}>{t.title}</span>
                    <span className="todo-card__meta">
                      <StatusPill status={t.status} />
                      <PriorityTag priority={t.priority} compact />
                      {t.dueTime && <span className="todo-meta-chip">{t.dueTime}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
