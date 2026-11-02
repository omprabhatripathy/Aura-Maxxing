import type { CSSProperties, ReactNode } from 'react';
import './WidgetCard.css';

interface Props {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  accent?: string;
  className?: string;
  children: ReactNode;
}

/** Dashboard widget shell for the web layouts (glass card + header row). */
export default function WidgetCard({ title, eyebrow, action, accent = '#a78bfa', className = '', children }: Props) {
  return (
    <section className={`aura-card surface-level-2-glass web-widget ${className}`} style={{ '--widget-accent': accent } as CSSProperties}>
      <header className="web-widget__head">
        <div>
          {eyebrow && <p className="web-widget__eyebrow">{eyebrow}</p>}
          <h2 className="web-widget__title">{title}</h2>
        </div>
        {action && <div className="web-widget__action">{action}</div>}
      </header>
      <div className="web-widget__body">{children}</div>
    </section>
  );
}
