import type { CSSProperties, ReactNode } from 'react';
import './ui.css';

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'primary' | 'success' | 'danger' }) {
  return <span className={`ui-badge ${tone !== 'default' ? `ui-badge--${tone}` : ''}`}>{children}</span>;
}

interface GridProps {
  children: ReactNode;
  minItemWidth?: number;
  className?: string;
}

export function Grid({ children, minItemWidth = 220, className = '' }: GridProps) {
  return (
    <div className={`ui-grid ${className}`} style={{ '--ui-grid-min': `${minItemWidth}px` } as CSSProperties}>
      {children}
    </div>
  );
}
