import { FormEvent, useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import './Journal.css';

interface Entry {
  id: string;
  date: string;
  text: string;
}

const seed: Entry[] = [
  {
    id: '1',
    date: 'Aug 21, 2026',
    text: 'Focused morning. The 10k training is starting to feel steady rather than hard.',
  },
  {
    id: '2',
    date: 'Aug 18, 2026',
    text: 'Slower day. Reset the deep-work block for tomorrow instead of forcing it.',
  },
];

export default function Journal() {
  const [entries, setEntries] = useState(seed);
  const [draft, setDraft] = useState('');

  function addEntry(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const date = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    setEntries((prev) => [{ id: crypto.randomUUID(), date, text }, ...prev]);
    setDraft('');
  }

  return (
    <div className="journal-page">
      <header>
        <p className="text-label-sm">Feature</p>
        <h1 className="text-headline-lg">Journal</h1>
        <p className="text-body-lg text-muted">
          Long-form reflection. Generous line height, no pressure to be brief.
        </p>
      </header>

      <Card>
        <form className="journal-page__form" onSubmit={addEntry}>
          <textarea
            className="journal-page__textarea text-body-lg"
            placeholder="What's on your mind today?"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="journal-page__form-actions">
            <Button type="submit" variant="primary">
              Save entry
            </Button>
          </div>
        </form>
      </Card>

      <div className="journal-page__entries">
        {entries.map((entry) => (
          <Card key={entry.id} eyebrow={entry.date}>
            <p className="text-body-lg">{entry.text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
