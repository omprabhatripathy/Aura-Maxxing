import type { ReactNode } from 'react';
import './ui.css';

interface ToolbarProps {
  children: ReactNode;
  glass?: boolean;
  className?: string;
}

export default function Toolbar({ children, glass = true, className = '' }: ToolbarProps) {
  return <div className={`ui-toolbar ${glass ? 'ui-toolbar--glass' : ''} ${className}`}>{children}</div>;
}
