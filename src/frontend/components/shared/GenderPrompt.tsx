import { useState } from 'react';
import { useAuth, type Gender } from '../../context/useAuth';
import Modal from './ui/Modal';
import Button from './Button';
import { ErrorText } from './ui/Status';
import { toUserMessage } from '../../../backend/core/errors';
import './GenderPrompt.css';

const options: { value: Gender; label: string; symbol: string }[] = [
  { value: 'female', label: 'Female', symbol: '♀' },
  { value: 'male', label: 'Male', symbol: '♂' },
  { value: 'other', label: 'Other / Prefer not to say', symbol: '⚧' },
];

export default function GenderPrompt() {
  const { gender, setGender } = useAuth();
  const [selected, setSelected] = useState<Gender | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (gender) return null;

  async function save() {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      await setGender(selected);
    } catch (e) {
      setError(toUserMessage(e, 'Could not save your choice. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      eyebrow="One quick thing"
      title="Choose your gender"
      actions={
        <Button block disabled={!selected || saving} onClick={save}>
          {saving ? 'Saving…' : 'Continue'}
        </Button>
      }
    >
      <p className="text-muted gender-prompt__hint">
        This personalises your features (e.g. the Period Tracker). You can change it later in Settings.
      </p>

      <div className="gender-prompt__options" role="radiogroup">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected === o.value}
            className={`gender-prompt__option ${selected === o.value ? 'gender-prompt__option--active' : ''}`}
            onClick={() => setSelected(o.value)}
          >
            <span className="gender-prompt__symbol" aria-hidden="true">{o.symbol}</span>
            <span>{o.label}</span>
          </button>
        ))}
      </div>
      <ErrorText>{error}</ErrorText>
    </Modal>
  );
}
