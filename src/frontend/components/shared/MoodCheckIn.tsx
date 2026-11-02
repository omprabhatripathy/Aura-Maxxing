import type { Mood } from '../../../backend/models';
import MoodIcon from '../../icons/moodicon';
import { MOOD_META, MOOD_ORDER } from '../../icons/moodMeta';
import './MoodCheckIn.css';

interface MoodCheckInProps {
  onSelect: (mood: Mood) => void;
  busy?: boolean;
  status?: string | null;
}

export default function MoodCheckIn({ onSelect, busy, status }: MoodCheckInProps) {
  return (
    <>
      <div className="mood-check-in">
        {MOOD_ORDER.map((mood) => (
          <button key={mood} type="button" disabled={busy} className="mood-check-in__button" onClick={() => onSelect(mood)} aria-label={`Log mood: ${MOOD_META[mood].label}`}>
            <span className="mood-check-in__icon">
              <MoodIcon mood={mood} size={32} />
            </span>
            <span>{MOOD_META[mood].label}</span>
          </button>
        ))}
      </div>
      {status && (
        <p className="mood-check-in__status" role="status">
          {status}
        </p>
      )}
    </>
  );
}
