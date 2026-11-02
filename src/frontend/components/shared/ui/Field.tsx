import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import './ui.css';

interface FieldWrapProps {
  id: string;
  label?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

function FieldWrap({ id, label, hint, className = '', children }: FieldWrapProps) {
  return (
    <div className={`ui-field ${className}`}>
      {label && (
        <label htmlFor={id} className="ui-field__label">
          {label}
        </label>
      )}
      {children}
      {hint && <span className="ui-field__hint">{hint}</span>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
}

export function Input({ label, hint, wrapperClassName, className = '', id, ...rest }: InputProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldWrap id={fieldId} label={label} hint={hint} className={wrapperClassName}>
      <input id={fieldId} className={`ui-field__control ${className}`} aria-label={label ? undefined : rest.placeholder} {...rest} />
    </FieldWrap>
  );
}

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  label?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
  options: SelectOption<T>[];
  /** Shown (muted, unselectable) while `value` is ''. */
  placeholder?: string;
  value: T | '';
  onChange: (value: T) => void;
}

export function Select<T extends string>({
  label,
  hint,
  wrapperClassName,
  className = '',
  id,
  options,
  placeholder,
  value,
  onChange,
  ...rest
}: SelectProps<T>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldWrap id={fieldId} label={label} hint={hint} className={wrapperClassName}>
      <select
        id={fieldId}
        className={`ui-field__control ${value === '' ? 'is-placeholder' : ''} ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
}

export function TextArea({ label, hint, wrapperClassName, className = '', id, ...rest }: TextAreaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldWrap id={fieldId} label={label} hint={hint} className={wrapperClassName}>
      <textarea id={fieldId} className={`ui-field__control ${className}`} aria-label={label ? undefined : rest.placeholder} {...rest} />
    </FieldWrap>
  );
}
