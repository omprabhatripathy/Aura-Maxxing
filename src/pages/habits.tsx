import { FormEvent, useState } from 'react';
import Card from '../components/Card';
import HabitChip from '../components/HabitChip';
import Button from '../components/Button';
import './Habits.css';

interface Habit {
  id: string;
  label: string;
  complete: boolean;
}

const seed: Habit[] = [
  { id: '1', label: 'Morning walk', complete: true },
  { id: '2', label: 'Read 20 min', complete: true },
  { id: '3', label: 'Deep work block', complete: false },
  { id: '4', label: 'Hydrate', complete: false },
  { id: '5', label: 'No screens after 10pm', complete: false },
];

export default function Habits() {
  const [habits, setHabits] = useState(seed);
  const [draft, setDraft] = useState('');

  function toggle(id: string) {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, complete: !h.complete } : h))
    );
  }

  function addHabit(e: FormEvent) {
    e.preventDefault();
    const label = draft.trim();
    if (!label) return;
    setHabits((prev) => [...prev, { id: crypto.randomUUID(), label, complete: false }]);
    setDraft('');
  }

  return (
    <div className="habits-page">
      <header>
        <p className="text-label-sm">Feature</p>
        <h1 className="text-headline-lg">Habits</h1>
        <p className="text-body-lg text-muted">
          Small, repeatable actions. Tap a chip to mark it complete.
        </p>
      </header>

      <Card>
        <form className="habits-page__form" onSubmit={addHabit}>
          <input
            className="habits-page__input"
            placeholder="Add a new habit…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="submit" variant="primary">
            Add
          </Button>
        </form>
      </Card>

      <div className="habits-page__list">
        {habits.map((h) => (
          <HabitChip key={h.id} label={h.label} complete={h.complete} onToggle={() => toggle(h.id)} />
        ))}
      </div>
    </div>
  );
}
