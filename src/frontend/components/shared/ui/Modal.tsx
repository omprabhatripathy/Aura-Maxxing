import { useEffect, useId } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './ui.css';

interface ModalProps {
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  size?: 'sm' | 'md' | 'lg';
  role?: 'dialog' | 'alertdialog';
  onClose?: () => void;
}

export default function Modal({ title, children, actions, eyebrow, size = 'md', role = 'dialog', onClose }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!onClose) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Portalled so ancestors with transform/backdrop-filter can't trap position: fixed off-centre.
  return createPortal(
    <div className="ui-modal" role="presentation" onClick={onClose}>
      <div
        className={`ui-modal__panel surface-level-2-glass ${size !== 'md' ? `ui-modal__panel--${size}` : ''}`}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {eyebrow && <p className="text-label-sm">{eyebrow}</p>}
        <h2 id={titleId} className="ui-modal__title text-headline-md">
          {title}
        </h2>
        {children}
        {actions && <div className="ui-modal__actions">{actions}</div>}
      </div>
    </div>,
    document.body
  );
}
