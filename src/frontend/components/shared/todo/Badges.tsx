import type { CSSProperties } from 'react';
import { PRIORITY_DOT, PRIORITY_LABEL, STATUS_LABEL, type TaskPriority, type TaskStatus } from '../../../../backend/todo/types';
import { PRIORITY_COLOR, STATUS_COLOR } from './meta';

export function StatusPill({ status }: { status: TaskStatus }) {
  return (
    <span className={`todo-status todo-status--${status}`} style={{ '--c': STATUS_COLOR[status] } as CSSProperties}>
      <span className="todo-status__dot" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityTag({ priority, compact }: { priority: TaskPriority; compact?: boolean }) {
  return (
    <span className="todo-priority" style={{ '--c': PRIORITY_COLOR[priority] } as CSSProperties} title={`${PRIORITY_LABEL[priority]} priority`}>
      <span aria-hidden="true">{PRIORITY_DOT[priority]}</span>
      {compact ? <span className="sr-only">{PRIORITY_LABEL[priority]} priority</span> : PRIORITY_LABEL[priority]}
    </span>
  );
}
