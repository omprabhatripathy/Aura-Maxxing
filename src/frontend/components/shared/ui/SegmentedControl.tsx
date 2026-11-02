import './ui.css';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  ariaLabel: string;
  block?: boolean;
}

export default function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel, block }: SegmentedControlProps<T>) {
  return (
    <div className={`ui-segmented ${block ? 'ui-segmented--block' : ''}`} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={`ui-segmented__option ${value === o.value ? 'ui-segmented__option--active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
