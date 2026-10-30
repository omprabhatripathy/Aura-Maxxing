import { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

type ButtonVariant = 'primary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  icon,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button className={`aura-btn aura-btn--${variant} ${className}`} {...rest}>
      {icon && <span className="aura-btn__icon">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
