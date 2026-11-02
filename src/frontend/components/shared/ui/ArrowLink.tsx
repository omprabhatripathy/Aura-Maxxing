import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './ui.css';

interface ArrowLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
}

export default function ArrowLink({ to, children, className = '' }: ArrowLinkProps) {
  return (
    <Link to={to} className={`ui-arrow-link ${className}`}>
      {children}
      <span aria-hidden="true">→</span>
    </Link>
  );
}
