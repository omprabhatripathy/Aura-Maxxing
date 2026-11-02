import { useState } from 'react';
import type { CSSProperties, DragEvent } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { isOverdue, sortTasks, taskProgress, unmetDependencies } from '../../../../backend/todo/analytics';
import { BOARD_STATUSES, STATUS_LABEL, type Task, type TaskStatus } from '../../../../backend/todo/types';
import type { TaskActions } from '../../../hooks/useTaskActions';
import { PriorityTag } from './Badges';
import { dueLabel, STATUS_COLOR } from './meta';

interface Props {
  tasks: Task[];
  now: Date;
  today: string;
  actions: TaskActions;
  onOpen: (task: Task) => void;
  onOptions: (task: Task) => void;
}

const COLUMN_ICON: Record<TaskStatus, string> = { todo: '○', 'in-progress': '◐', blocked: '⛔', done: '✓', archived: '🗄' };

export default function TaskBoard({ tasks, now, today, actions, onOpen, onOptions }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const byId = new Map(tasks.map((t) => [t.id, t]));

  const drop = (status: TaskStatus) => (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/task-id') || dragId;
    const task = id ? byId.get(id) : undefined;
    setOver(null);
    setDragId(null);
    if (task && task.status !== status) void actions.setStatus(task, status);
  };

  return (
    <LayoutGroup>
      <div className="todo-board" role="list" aria-label="Kanban board">
        {BOARD_STATUSES.map((status) => {
          const column = sortTasks(
            tasks.filter((t) => t.status === status),
            'priority'
          );
          return (
            <section
              key={status}
              role="listitem"
              aria-label={`${STATUS_LABEL[status]} column, ${column.length} tasks`}
              className={`todo-column${over === status ? ' is-over' : ''}`}
              style={{ '--c': STATUS_COLOR[status] } as CSSProperties}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (over !== status) setOver(status);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
              }}
              onDrop={drop(status)}
            >
              <header className="todo-column__head">
                <span className="todo-column__icon" aria-hidden="true">
                  {COLUMN_ICON[status]}
                </span>
                <h3>{status === 'done' ? 'Done' : STATUS_LABEL[status]}</h3>
                <span className="todo-column__count">{column.length}</span>
              </header>
              <div className="todo-column__body">
                <AnimatePresence initial={false}>
                  {column.map((task) => {
                    const due = dueLabel(task, now, today);
                    const progress = taskProgress(task);
                    const waiting = unmetDependencies(task, byId).length;
                    return (
                      <motion.div
                        key={task.id}
                        layout
                        layoutId={`board-${task.id}`}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: dragId === task.id ? 0.4 : 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        className={`todo-board-card${isOverdue(task, now) ? ' is-overdue' : ''}`}
                      >
                        <div
                          draggable
                          className="todo-board-card__drag"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/task-id', task.id);
                            e.dataTransfer.effectAllowed = 'move';
                            setDragId(task.id);
                          }}
                          onDragEnd={() => {
                            setDragId(null);
                            setOver(null);
                          }}
                        >
                          <button type="button" className="todo-board-card__title" onClick={() => onOpen(task)}>
                            {task.title}
                          </button>
                          <div className="todo-card__meta">
                            <PriorityTag priority={task.priority} compact />
                            {due && <span className={`todo-due todo-due--${due.tone}`}>⏰ {due.text}</span>}
                            {waiting > 0 && <span className="todo-meta-chip todo-meta-chip--warn">⛓ {waiting}</span>}
                            {task.tags[0] && <span className="todo-tag">🏷 {task.tags[0]}</span>}
                          </div>
                          {(task.subtasks.length > 0 || progress > 0) && (
                            <div className="todo-progress todo-progress--thin" aria-label={`Progress ${progress}%`}>
                              <motion.span initial={false} animate={{ width: `${progress}%` }} />
                            </div>
                          )}
                        </div>
                        <button type="button" className="todo-icon-btn todo-board-card__move" aria-label={`Move ${task.title}`} onClick={() => onOptions(task)}>
                          ⋯
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {column.length === 0 && <p className="todo-column__empty">Drop tasks here</p>}
              </div>
            </section>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
