import type { ReactNode } from 'react';
import './ui.css';

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  aside?: ReactNode;
}

/** The visible page title lives in the app header; the h1 stays for screen readers and document outline. */
export default function PageHeader({ title, eyebrow, subtitle, action, aside }: PageHeaderProps) {
  return (
    <header className="ui-page-header">
      <h1 className="sr-only">{title}</h1>
      {(eyebrow || subtitle || action) && (
        <div className="ui-page-header__text">
          {eyebrow && <p className="text-label-sm">{eyebrow}</p>}
          {subtitle && <p className="ui-page-header__desc">{subtitle}</p>}
          {action}
        </div>
      )}
      {aside && <div className="ui-page-header__aside">{aside}</div>}
    </header>
  );
}
