import type { InputHTMLAttributes, ReactNode } from 'react';
import './ui.css';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function Checkbox({ className = '', ...rest }: CheckboxProps) {
  return <input type="checkbox" className={`ui-checkbox ${className}`} {...rest} />;
}

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
}

export function Switch({ label, className = '', ...rest }: SwitchProps) {
  return (
    <label className={`ui-switch ${className}`}>
      <span>{label}</span>
      <input type="checkbox" role="switch" className="ui-switch__input" {...rest} />
    </label>
  );
}
