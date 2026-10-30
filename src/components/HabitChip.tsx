import './HabitChip.css';

interface HabitChipProps {
  label: string;
  complete: boolean;
  onToggle?: () => void;
}

export default function HabitChip({ label, complete, onToggle }: HabitChipProps) {
  return (
    <button
      type="button"
      className={`habit-chip ${complete ? 'habit-chip--complete' : ''}`}
      onClick={onToggle}
      aria-pressed={complete}
    >
      <span className="habit-chip__dot" />
      {label}
    </button>
  );
}
