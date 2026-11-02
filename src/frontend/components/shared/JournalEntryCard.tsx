import Card from './Card';
import MoodIcon from '../../icons/moodicon';
import { MOOD_META } from '../../icons/moodMeta';
import { Badge } from './ui/Layout';
import { formatDate } from '../../../backend/core/dates';
import type { JournalEntry } from '../../../backend/models';
import './JournalEntryCard.css';

interface Props {
  entry: JournalEntry;
  onEdit: () => void;
  onDelete: () => void;
  onTag: (tag: string) => void;
}

export default function JournalEntryCard({ entry, onEdit, onDelete, onTag }: Props) {
  const edited = entry.updatedAt > entry.createdAt;
  return (
    <Card eyebrow={`${formatDate(entry.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}${edited ? ' · edited' : ''}`}>
      <p className="text-body-lg journal-entry__text">{entry.text}</p>
      <div className="journal-entry__meta">
        {entry.mood && (
          <span className="journal-entry__mood">
            <MoodIcon mood={entry.mood} size={20} />
            {MOOD_META[entry.mood].label} ·
          </span>
        )}
        <span>{entry.wordCount} words</span>
        {entry.tags.map((tag) => (
          <button key={tag} type="button" className="journal-entry__tag" onClick={() => onTag(tag)} aria-label={`Show entries tagged ${tag}`}>
            <Badge tone="primary">#{tag}</Badge>
          </button>
        ))}
        <span className="journal-entry__actions">
          <button type="button" onClick={onEdit}>Edit</button>
          <button type="button" className="journal-entry__delete" onClick={onDelete}>Delete</button>
        </span>
      </div>
    </Card>
  );
}
