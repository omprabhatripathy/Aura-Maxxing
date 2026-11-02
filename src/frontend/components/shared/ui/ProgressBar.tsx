import './ui.css';

interface ProgressBarProps {
  value: number;
  label?: string;
  showValue?: boolean;
  suffix?: string;
}

export default function ProgressBar({ value, label, showValue = true, suffix = '' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const bare = !label && !showValue;
  return (
    <div
      className={`ui-progress ${bare ? 'ui-progress--bare' : ''}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      {!bare && <span className="ui-progress__label">{label}</span>}
      <div className="ui-progress__track">
        <div className="ui-progress__fill" style={{ width: `${clamped}%` }} />
      </div>
      {!bare && <span className="ui-progress__value">{showValue ? `${Math.round(value)}${suffix}` : ''}</span>}
    </div>
  );
}
