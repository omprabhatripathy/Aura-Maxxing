import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDateTime } from '../../../../backend/core/dates';
import type { TaskNotification } from '../../../../backend/todo/types';

const KIND_ICON: Record<TaskNotification['kind'], string> = { 'due-1d': '📅', 'due-1h': '⏳', overdue: '⚠️', focus: '◎' };

interface Props {
  notifications: TaskNotification[];
  browserEnabled: boolean;
  onEnableBrowser: () => void;
  onOpenTask: (taskId: string) => void;
  onMarkRead: (ids: string[]) => void;
  onClear: (ids: string[]) => void;
}

export default function NotificationBell({ notifications, browserEnabled, onEnableBrowser, onOpenTask, onMarkRead, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="todo-bell" ref={rootRef}>
      <button
        type="button"
        className={`todo-bell__btn${unread.length ? ' has-unread' : ''}`}
        aria-label={`Task notifications, ${unread.length} unread`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        <AnimatePresence>
          {unread.length > 0 && (
            <motion.span className="todo-bell__count" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              {unread.length > 9 ? '9+' : unread.length}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="todo-bell__panel"
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
          >
            <header>
              <strong>Reminders</strong>
              {unread.length > 0 && (
                <button type="button" className="todo-link" onClick={() => onMarkRead(unread.map((n) => n.id))}>
                  Mark all read
                </button>
              )}
            </header>
            {!browserEnabled && (
              <button type="button" className="todo-suggest-chip todo-bell__enable" onClick={onEnableBrowser}>
                🔔 Enable desktop alerts
              </button>
            )}
            {notifications.length === 0 ? (
              <p className="todo-muted">You're all caught up.</p>
            ) : (
              <ul>
                {notifications.slice(0, 30).map((n) => (
                  <li key={n.id} className={n.read ? '' : 'is-unread'}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!n.read) onMarkRead([n.id]);
                        if (n.taskId) onOpenTask(n.taskId);
                        setOpen(false);
                      }}
                    >
                      <span className="todo-bell__icon" aria-hidden="true">
                        {KIND_ICON[n.kind]}
                      </span>
                      <span>
                        <strong>{n.title}</strong>
                        <span>{n.body}</span>
                        <time dateTime={n.createdAt}>{formatDateTime(n.createdAt)}</time>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {notifications.length > 0 && (
              <footer>
                <button type="button" className="todo-link" onClick={() => onClear(notifications.filter((n) => n.read).map((n) => n.id))}>
                  Clear read
                </button>
              </footer>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
