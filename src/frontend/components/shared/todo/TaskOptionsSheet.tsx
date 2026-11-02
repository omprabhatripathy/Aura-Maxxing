import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { BOARD_STATUSES, STATUS_LABEL, type Task, type TaskStatus } from '../../../../backend/todo/types';
import { STATUS_COLOR } from './meta';

interface Props {
  task: Task;
  onMove: (status: TaskStatus) => void;
  onFocus: () => void;
  onEdit: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/** Long-press / overflow menu; a bottom sheet on phones. */
export default function TaskOptionsSheet({ task, onMove, onFocus, onEdit, onArchiveToggle, onDelete, onClose }: Props) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const archived = task.status === 'archived';
  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return createPortal(
    <motion.div className="todo-sheet" role="presentation" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="todo-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Options for ${task.title}`}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
      >
        <span className="todo-sheet__grip" aria-hidden="true" />
        <h3>{task.title}</h3>
        {!archived && (
          <>
            <p className="todo-tile__label">Move to</p>
            <div className="todo-status-switch">
              {BOARD_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={task.status === s}
                  className={task.status === s ? 'is-active' : ''}
                  style={{ '--c': STATUS_COLOR[s] } as CSSProperties}
                  onClick={run(() => onMove(s))}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="todo-sheet__actions">
          {!archived && task.status !== 'done' && (
            <button type="button" onClick={run(onFocus)}>
              ◎ Start focus session
            </button>
          )}
          {!archived && (
            <button type="button" onClick={run(onEdit)}>
              ✎ Edit task
            </button>
          )}
          <button type="button" onClick={run(onArchiveToggle)}>
            {archived ? '↺ Restore' : '🗄 Archive'}
          </button>
          <button type="button" className="is-danger" onClick={run(onDelete)}>
            🗑 Delete
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
