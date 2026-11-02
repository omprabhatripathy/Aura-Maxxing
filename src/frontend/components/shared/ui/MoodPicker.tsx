import type { Mood } from '../../../../backend/models';
import MoodIcon from '../../../icons/moodicon';
import { MOOD_META, MOOD_ORDER } from '../../../icons/moodMeta';
import './ui.css';

interface MoodPickerProps {
  value: Mood | null;
  /** Clicking the selected mood again clears it (mood is optional). */
  onChange: (mood: Mood | null) => void;
  iconSize?: number;
}

export default function MoodPicker({ value, onChange, iconSize = 28 }: MoodPickerProps) {
  return (
    <div className="ui-mood-picker" role="radiogroup" aria-label="Mood">
      {MOOD_ORDER.map((mood) => (
        <button
          key={mood}
          type="button"
          role="radio"
          aria-checked={value === mood}
          className={`ui-mood-picker__option ${value === mood ? 'ui-mood-picker__option--active' : ''}`}
          onClick={() => onChange(value === mood ? null : mood)}
        >
          <MoodIcon mood={mood} size={iconSize} />
          <span>{MOOD_META[mood].label}</span>
        </button>
      ))}
    </div>
  );
}
