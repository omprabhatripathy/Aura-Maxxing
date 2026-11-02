import { useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import { formatDateTime } from '../../../../backend/core/dates';
import { breakdownTask, isOverdue, taskProgress, unmetDependencies } from '../../../../backend/todo/analytics';
import { BOARD_STATUSES, STATUS_LABEL, type Task, type TaskActivity } from '../../../../backend/todo/types';
import type { TaskActions } from '../../../hooks/useTaskActions';
import { PriorityTag, StatusPill } from './Badges';
import { dueLabel, formatBytes, formatMinutes, STATUS_COLOR } from './meta';

interface Props {
  task: Task;
  byId: Map<string, Task>;
  now: Date;
  today: string;
  expanded: boolean;
  activity: TaskActivity[];
  links: { goal?: string; habit?: string };
  actions: TaskActions;
  onToggle: () => void;
  onEdit: () => void;
  onFocus: () => void;
  onOptions: () => void;
  onDelete: () => void;
}

const SWIPE = 110;
const isCoarse = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

export default function TaskCard({ task, byId, now, today, expanded, activity, links, actions, onToggle, onEdit, onFocus, onOptions, onDelete }: Props) {
  const [touch] = useState(isCoarse);
  const [step, setStep] = useState('');
  const x = useMotionValue(0);
  const completeOpacity = useTransform(x, [20, SWIPE], [0, 1]);
  const deleteOpacity = useTransform(x, [-SWIPE, -20], [1, 0]);
  const pressTimer = useRef<number | undefined>(undefined);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const longPressed = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const progress = taskProgress(task);
  const due = dueLabel(task, now, today);
  const waiting = unmetDependencies(task, byId);
  const done = task.status === 'done';
  const archived = task.status === 'archived';
  const doneSteps = task.subtasks.filter((s) => s.done).length;

  const toggleDone = () => void actions.setStatus(task, done ? 'todo' : 'done');

  const cancelPress = () => {
    window.clearTimeout(pressTimer.current);
    pressStart.current = null;
  };
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    longPressed.current = false;
    pressStart.current = { x: e.clientX, y: e.clientY };
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      navigator.vibrate?.(15);
      onOptions();
    }, 550);
  };
  const onPointerMove = (e: PointerEvent) => {
    const start = pressStart.current;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) cancelPress();
  };
  const onHeaderClick = () => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    onToggle();
  };
  const onHeaderKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <motion.article
      id={`task-${task.id}`}
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className={`todo-card todo-card--${task.status}${expanded ? ' is-expanded' : ''}${isOverdue(task, now) ? ' is-overdue' : ''}`}
      style={{ '--status': STATUS_COLOR[task.status] } as CSSProperties}
    >
      {touch && !archived && (
        <div className="todo-card__swipe" aria-hidden="true">
          <motion.span className="todo-card__swipe-complete" style={{ opacity: completeOpacity }}>
            ✓ {done ? 'Reopen' : 'Complete'}
          </motion.span>
          <motion.span className="todo-card__swipe-delete" style={{ opacity: deleteOpacity }}>
            Delete 🗑
          </motion.span>
        </div>
      )}
      <motion.div
        className="todo-card__inner"
        style={{ x }}
        drag={touch && !archived && !expanded ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        dragSnapToOrigin
        onDragStart={cancelPress}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE) toggleDone();
          else if (info.offset.x < -SWIPE) onDelete();
        }}
      >
        <div className="todo-card__head">
          {!archived && (
            <button
              type="button"
              className={`todo-check${done ? ' is-done' : ''}`}
              aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
              aria-pressed={done}
              disabled={actions.isPending(`task:status:${task.id}`)}
              onClick={toggleDone}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </button>
          )}
          <div
            className="todo-card__summary"
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            onClick={onHeaderClick}
            onKeyDown={onHeaderKey}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
            onPointerCancel={cancelPress}
            onContextMenu={(e) => touch && e.preventDefault()}
          >
            <h3 className="todo-card__title">{task.title}</h3>
            <div className="todo-card__meta">
              <StatusPill status={task.status} />
              <PriorityTag priority={task.priority} />
              {due && <span className={`todo-due todo-due--${due.tone}`}>⏰ {due.text}</span>}
              {task.recurrence !== 'none' && <span className="todo-meta-chip">🔁 {task.recurrence}</span>}
              {task.tags.slice(0, 3).map((t) => (
                <span key={t} className="todo-tag">
                  🏷 {t}
                </span>
              ))}
              {waiting.length > 0 && <span className="todo-meta-chip todo-meta-chip--warn">⛓ Waiting on {waiting.length}</span>}
            </div>
            <div className="todo-card__progress" aria-label={`Progress ${progress}%`}>
              <div className="todo-progress">
                <motion.span initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
              </div>
              <span>
                📈 {progress}%{task.subtasks.length ? ` · ${doneSteps}/${task.subtasks.length}` : ''}
              </span>
            </div>
          </div>
          <button type="button" className="todo-icon-btn todo-card__more" aria-label={`Options for ${task.title}`} onClick={onOptions}>
            ⋯
          </button>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              className="todo-card__details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="todo-card__details-inner">
                {task.description && <p className="todo-card__desc">{task.description}</p>}

                {!archived && (
                  <div className="todo-status-switch" role="group" aria-label="Change status">
                    {BOARD_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={task.status === s}
                        className={task.status === s ? 'is-active' : ''}
                        style={{ '--c': STATUS_COLOR[s] } as CSSProperties}
                        onClick={() => void actions.setStatus(task, s)}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                )}

                <section className="todo-detail">
                  <h4>
                    Subtasks {task.subtasks.length > 0 && <span>{doneSteps}/{task.subtasks.length}</span>}
                  </h4>
                  {task.subtasks.length === 0 && (
                    <button type="button" className="todo-suggest-chip" onClick={() => void actions.addSubtasks(task, breakdownTask(task.title, task.description))}>
                      ✨ Smart breakdown into steps
                    </button>
                  )}
                  <ul className="todo-subtasks">
                    {task.subtasks.map((s) => (
                      <li key={s.id}>
                        <label className={s.done ? 'is-done' : ''}>
                          <input type="checkbox" checked={s.done} disabled={archived} onChange={() => void actions.toggleSubtask(task, s.id)} />
                          <span>{s.title}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  {!archived && (
                    <form
                      className="todo-inline-add"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!step.trim()) return;
                        void actions.addSubtasks(task, [step]);
                        setStep('');
                      }}
                    >
                      <input placeholder="Add a subtask…" aria-label="New subtask" maxLength={120} value={step} onChange={(e) => setStep(e.target.value)} />
                      <button type="submit" className="todo-link">
                        Add
                      </button>
                    </form>
                  )}
                </section>

                <dl className="todo-facts">
                  {task.estimateMinutes && (
                    <div>
                      <dt>Estimate</dt>
                      <dd>{formatMinutes(task.estimateMinutes)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Focused</dt>
                    <dd>{formatMinutes(task.focusMinutes)}</dd>
                  </div>
                  {task.dependsOn.length > 0 && (
                    <div>
                      <dt>Depends on</dt>
                      <dd>{task.dependsOn.map((id) => byId.get(id)?.title ?? 'Deleted task').join(', ')}</dd>
                    </div>
                  )}
                  {links.goal && (
                    <div>
                      <dt>Goal</dt>
                      <dd>🎯 {links.goal}</dd>
                    </div>
                  )}
                  {links.habit && (
                    <div>
                      <dt>Habit</dt>
                      <dd>🔁 {links.habit}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Created</dt>
                    <dd>{formatDateTime(task.createdAt)}</dd>
                  </div>
                  {task.completedAt && (
                    <div>
                      <dt>Completed</dt>
                      <dd>{formatDateTime(task.completedAt)}</dd>
                    </div>
                  )}
                </dl>

                {task.notes && (
                  <section className="todo-detail">
                    <h4>Notes</h4>
                    <p className="todo-card__notes">{task.notes}</p>
                  </section>
                )}

                <section className="todo-detail">
                  <h4>Attachments</h4>
                  {task.attachments.length > 0 && (
                    <ul className="todo-attachments">
                      {task.attachments.map((a) => (
                        <li key={a.id}>
                          <a href={a.url} target="_blank" rel="noopener noreferrer" download={a.name}>
                            📎 {a.name}
                          </a>
                          <span>{formatBytes(a.size)}</span>
                          <button type="button" className="todo-icon-btn" aria-label={`Remove ${a.name}`} onClick={() => void actions.removeAttachment(task, a)}>
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void actions.addAttachment(task, file);
                      e.target.value = '';
                    }}
                  />
                  <button type="button" className="todo-link" disabled={actions.isPending(`task:attach:${task.id}`)} onClick={() => fileRef.current?.click()}>
                    {actions.isPending(`task:attach:${task.id}`) ? 'Uploading…' : '+ Attach file'}
                  </button>
                </section>

                {activity.length > 0 && (
                  <section className="todo-detail">
                    <h4>Activity</h4>
                    <ol className="todo-mini-timeline">
                      {activity.slice(0, 8).map((a) => (
                        <li key={a.id}>
                          <span>{a.message}</span>
                          <time dateTime={a.createdAt}>{formatDateTime(a.createdAt)}</time>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                <div className="todo-card__actions">
                  {!archived && !done && (
                    <button type="button" className="todo-btn todo-btn--primary" onClick={onFocus}>
                      ◎ Focus
                    </button>
                  )}
                  {!archived && (
                    <button type="button" className="todo-btn" onClick={onEdit}>
                      ✎ Edit
                    </button>
                  )}
                  {archived ? (
                    <button type="button" className="todo-btn" onClick={() => void actions.restore(task)}>
                      ↺ Restore
                    </button>
                  ) : (
                    <button type="button" className="todo-btn" onClick={() => void actions.setStatus(task, 'archived')}>
                      🗄 Archive
                    </button>
                  )}
                  <button type="button" className="todo-btn todo-btn--danger" onClick={onDelete}>
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.article>
  );
}
