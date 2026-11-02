import type { ReactNode } from 'react';
import './ui.css';

export function EmptyState({ icon = '✦', children, action }: { icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="ui-empty">
      <span className="ui-empty__icon" aria-hidden="true">{icon}</span>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function LoadingState({ children = 'Loading…' }: { children?: ReactNode }) {
  return (
    <div className="ui-loading" role="status" aria-live="polite">
      <span className="ui-loading__spinner" />
      <span>{children}</span>
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="ui-error" role="alert">
      {children}
    </p>
  );
}
