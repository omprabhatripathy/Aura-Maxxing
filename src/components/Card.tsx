import { ReactNode } from 'react';
import './Card.css';

interface CardProps {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export default function Card({ title, eyebrow, children, className = '', glow = false }: CardProps) {
  return (
    <div className={`aura-card surface-level-2-glass ${glow ? 'glow-primary' : ''} ${className}`}>
      {eyebrow && <div className="aura-card__eyebrow text-label-sm">{eyebrow}</div>}
      {title && <h3 className="aura-card__title text-headline-md">{title}</h3>}
      <div className="aura-card__body">{children}</div>
    </div>
  );
}
