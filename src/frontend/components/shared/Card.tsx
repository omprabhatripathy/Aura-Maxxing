import type { KeyboardEvent, ReactNode } from 'react';
import './Card.css';

interface CardProps {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  glow?: boolean;
  /** Makes the whole card a button (used by scoreboards to open their history). */
  onClick?: () => void;
  ariaLabel?: string;
}

export default function Card({ title, eyebrow, children, className = '', glow = false, onClick, ariaLabel }: CardProps) {
  const interactive = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        'aria-label': ariaLabel,
        onClick,
        onKeyDown: (e: KeyboardEvent) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        },
      }
    : {};
  return (
    <div className={`aura-card surface-level-2-glass ${glow ? 'glow-primary' : ''} ${onClick ? 'score-clickable' : ''} ${className}`} {...interactive}>
      {eyebrow && <div className="aura-card__eyebrow text-label-sm">{eyebrow}</div>}
      {title && <h3 className="aura-card__title text-headline-md">{title}</h3>}
      <div className="aura-card__body">{children}</div>
    </div>
  );
}
