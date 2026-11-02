import type { ReactNode } from 'react';
import './ui.css';

interface SectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Section({ title, action, children, className = '' }: SectionProps) {
  return (
    <section className={`ui-section ${className}`}>
      <div className="ui-section__head">
        <h3 className="ui-section__title">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
