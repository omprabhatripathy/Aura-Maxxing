import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './ui.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  size?: 'sm' | 'md';
  tone?: 'default' | 'danger';
  plain?: boolean;
}

export default function IconButton({ label, children, size = 'md', tone = 'default', plain, className = '', ...rest }: IconButtonProps) {
  const classes = [
    'ui-icon-btn',
    size === 'sm' && 'ui-icon-btn--sm',
    tone === 'danger' && 'ui-icon-btn--danger',
    plain && 'ui-icon-btn--plain',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" aria-label={label} title={label} className={classes} {...rest}>
      {children}
    </button>
  );
}
