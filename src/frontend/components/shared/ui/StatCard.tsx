import type { ReactNode } from 'react';
import Card from '../Card';
import './ui.css';

interface StatCardProps {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  trend?: number;
  className?: string;
  glow?: boolean;
  /** Opens the score's history; shows a "View history" hint. */
  onClick?: () => void;
}

export default function StatCard({ label, value, description, trend, className = '', glow, onClick }: StatCardProps) {
  return (
    <Card eyebrow={label} className={className} glow={glow} onClick={onClick} ariaLabel={onClick ? `${label}: view history` : undefined}>
      <span className="ui-stat__value">{value}</span>
      {trend !== undefined && (
        <span className={trend >= 0 ? 'ui-stat__trend--up' : 'ui-stat__trend--down'}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}
        </span>
      )}
      {description && <p>{description}</p>}
      {onClick && <span className="score-clickable__hint">View history ›</span>}
    </Card>
  );
}
