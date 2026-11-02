import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

type ButtonVariant = 'primary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  block?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  icon,
  block = false,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button className={`aura-btn aura-btn--${variant} ${block ? 'aura-btn--block' : ''} ${className}`} {...rest}>
      {icon && <span className="aura-btn__icon">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
