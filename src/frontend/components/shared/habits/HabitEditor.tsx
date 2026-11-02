import { useState } from 'react';
import type { FormEvent } from 'react';
import Modal from '../ui/Modal';
import Button from '../Button';
import ConfirmDialog from '../ConfirmDialog';
import { Input, Select } from '../ui/Field';
import { ErrorText } from '../ui/Status';
import EmojiPicker from './EmojiPicker';
import { CATEGORY_EMOJI } from '../../../lib/habitEmoji';
import './habits.css';
import { HABIT_CATEGORY_OPTIONS, HABIT_FREQUENCY_OPTIONS, HABIT_PRIORITY_OPTIONS } from '../../../lib/options';
import { withInlineErrors } from '../../../hooks/useAction';
import type { HabitInput } from '../../../../backend/validators';
import type { Habit } from '../../../../backend/models';

interface Props {
  habit: Habit;
  completions: number;
  onSave: (input: HabitInput) => Promise<boolean>;
  onArchive: (archived: boolean) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onClose: () => void;
}

export default function HabitEditor({ habit, completions, onSave, onArchive, onDelete, onClose }: Props) {
  const [input, setInput] = useState<HabitInput>({ label: habit.label, emoji: habit.emoji, category: habit.category, priority: habit.priority, frequency: habit.frequency });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function act(fn: () => Promise<boolean>) {
    setBusy(true);
    const ok = await withInlineErrors(fn, setError);
    setBusy(false);
    if (ok) onClose();
  }

  if (confirmDelete) {
    return (
      <ConfirmDialog
        title="Delete habit permanently?"
        message={`"${habit.label}" and its ${completions} completion${completions === 1 ? '' : 's'} will be removed from your history and analytics. Archive it instead to keep the history.`}
        confirmLabel="Delete"
        onConfirm={() => void act(onDelete)}
        onCancel={() => setConfirmDelete(false)}
      />
    );
  }

  return (
    <Modal title="Edit habit" onClose={onClose}>
      <form
        className="editor-form"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void act(() => onSave(input));
        }}
      >
        <div className="ui-field">
          <span className="ui-field__label">Name</span>
          <div className="habit-editor__name-row">
            <EmojiPicker value={input.emoji ?? ''} fallback={CATEGORY_EMOJI[input.category]} onChange={(emoji) => setInput({ ...input, emoji })} />
            <Input aria-label="Name" wrapperClassName="habit-editor__name" maxLength={60} value={input.label} onChange={(e) => setInput({ ...input, label: e.target.value })} />
          </div>
        </div>
        <Select label="Category" options={HABIT_CATEGORY_OPTIONS} value={input.category} onChange={(category) => setInput({ ...input, category })} />
        <Select label="Priority" options={HABIT_PRIORITY_OPTIONS} value={input.priority} onChange={(priority) => setInput({ ...input, priority })} />
        <Select
          label="Frequency"
          hint={input.frequency !== habit.frequency ? 'Changing frequency recalculates streaks from your existing completions.' : undefined}
          options={HABIT_FREQUENCY_OPTIONS}
          value={input.frequency}
          onChange={(frequency) => setInput({ ...input, frequency })}
        />
        <ErrorText>{error}</ErrorText>
        <div className="editor-form__actions">
          <Button type="button" variant="ghost" className="editor-form__danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void act(() => onArchive(!habit.archived))}>
            {habit.archived ? 'Restore' : 'Archive'}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
