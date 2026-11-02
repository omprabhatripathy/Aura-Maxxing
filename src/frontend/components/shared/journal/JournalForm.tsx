import { useState } from 'react';
import type { FormEvent } from 'react';
import Button from '../Button';
import { Input, TextArea } from '../ui/Field';
import MoodPicker from '../ui/MoodPicker';
import { ErrorText } from '../ui/Status';
import { withInlineErrors } from '../../../hooks/useAction';
import { parseTags, wordCount, type JournalInput } from '../../../../backend/validators';
import type { Mood } from '../../../../backend/models';

interface Props {
  initial?: { text: string; mood: Mood | null; tags: string[] };
  submitLabel: string;
  onSubmit: (input: JournalInput) => Promise<boolean>;
  onDone?: () => void;
  onCancel?: () => void;
}

export default function JournalForm({ initial, submitLabel, onSubmit, onDone, onCancel }: Props) {
  const [text, setText] = useState(initial?.text ?? '');
  const [mood, setMood] = useState<Mood | null>(initial?.mood ?? null);
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await withInlineErrors(() => onSubmit({ text, mood, tags: parseTags(tags) }), setError);
    setBusy(false);
    if (ok) {
      if (!initial) {
        setText('');
        setMood(null);
        setTags('');
      }
      onDone?.();
    }
  }

  return (
    <form className="journal-page__form" onSubmit={handleSubmit} noValidate>
      <TextArea
        className="text-body-lg"
        placeholder="What's on your mind today?"
        aria-label="Journal entry"
        rows={5}
        maxLength={10000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        hint={`${wordCount(text)} words`}
      />
      <span className="ui-field__label">How do you feel? (optional — also logged to your mood tracker)</span>
      <MoodPicker value={mood} onChange={setMood} />
      <Input placeholder="Tags, comma separated (e.g. work, gratitude)" aria-label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} />
      <ErrorText>{error}</ErrorText>
      <div className="journal-page__form-actions">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
