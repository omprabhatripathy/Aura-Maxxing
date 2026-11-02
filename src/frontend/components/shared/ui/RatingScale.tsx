import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './ui.css';

interface RatingScaleProps {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
}

/** Row of numeric buttons; clicking the active value clears it. */
export function RatingScale({ label, value, onChange, min = 1, max = 5 }: RatingScaleProps) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="ui-rating" role="radiogroup" aria-label={label}>
      {values.map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          className={`ui-rating__option ${value === v ? 'ui-rating__option--active' : ''}`}
          onClick={() => onChange(value === v ? undefined : v)}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

interface ChipToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  active: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function ChipToggle({ active, onToggle, children, className = '', ...rest }: ChipToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`ui-chip ${active ? 'ui-chip--active' : ''} ${className}`}
      onClick={onToggle}
      {...rest}
    >
      {children}
    </button>
  );
}
