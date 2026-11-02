import { useState } from 'react';
import type { FormEvent } from 'react';
import Button from '../Button';
import IconButton from '../ui/IconButton';
import { Input, Select } from '../ui/Field';
import { ErrorText } from '../ui/Status';
import { GOAL_TERM_OPTIONS } from '../../../lib/options';
import { withInlineErrors } from '../../../hooks/useAction';
import { MILESTONE_NAME_MAX } from '../../../../backend/models';
import type { GoalInput } from '../../../../backend/validators';

interface Props {
  initial: GoalInput;
  today: string;
  submitLabel: string;
  minMilestones?: number;
  /** Milestones already completed; they can be renamed but not removed. */
  completedMilestones?: number;
  onSubmit: (input: GoalInput) => Promise<boolean>;
  onDone?: () => void;
  onCancel?: () => void;
  className?: string;
}

const MAX_MILESTONES = 50;

function initialNames(input: GoalInput): string[] {
  return input.milestoneNames ?? Array.from({ length: Math.max(1, input.milestones) }, () => '');
}

export default function GoalForm({ initial, today, submitLabel, minMilestones = 1, completedMilestones = 0, onSubmit, onDone, onCancel, className = '' }: Props) {
  const [input, setInput] = useState<GoalInput>(initial);
  const [names, setNames] = useState<string[]>(() => initialNames(initial));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const setName = (index: number, value: string) => setNames(names.map((n, i) => (i === index ? value : n)));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await withInlineErrors(() => onSubmit({ ...input, milestones: names.length, milestoneNames: names }), setError);
    setBusy(false);
    if (ok) {
      setInput(initial);
      setNames(initialNames(initial));
      onDone?.();
    }
  }

  return (
    <form className={`goal-form ${className}`} onSubmit={handleSubmit} noValidate>
      <Input label="Title" placeholder="e.g. Run a 10k" maxLength={80} value={input.title} onChange={(e) => setInput({ ...input, title: e.target.value })} />
      <Input label="Detail" placeholder="Optional" maxLength={280} value={input.detail} onChange={(e) => setInput({ ...input, detail: e.target.value })} />
      <Select label="Term" options={GOAL_TERM_OPTIONS} value={input.term} onChange={(term) => setInput({ ...input, term })} />
      <Input label="Due date" type="date" min={today} value={input.dueDate ?? ''} onChange={(e) => setInput({ ...input, dueDate: e.target.value || null })} />
      <fieldset className="goal-form__milestones">
        <legend className="ui-field__label">Milestones</legend>
        <span className="ui-field__hint">Name each step. Progress = milestones completed ÷ total.</span>
        <ol className="goal-form__milestone-list">
          {names.map((name, i) => {
            const locked = i < completedMilestones;
            return (
              <li key={i} className="goal-form__milestone">
                <span className={`goal-form__milestone-num${locked ? ' is-done' : ''}`} aria-hidden="true">
                  {locked ? '✓' : i + 1}
                </span>
                <input
                  className="ui-field__control"
                  placeholder={`Milestone ${i + 1} name`}
                  aria-label={`Milestone ${i + 1} name`}
                  maxLength={MILESTONE_NAME_MAX}
                  value={name}
                  onChange={(e) => setName(i, e.target.value)}
                />
                <IconButton
                  label={`Remove milestone ${i + 1}`}
                  size="sm"
                  plain
                  disabled={locked || names.length <= Math.max(1, minMilestones)}
                  onClick={() => setNames(names.filter((_, j) => j !== i))}
                >
                  ×
                </IconButton>
              </li>
            );
          })}
        </ol>
        <button type="button" className="goal-form__add-milestone" disabled={names.length >= MAX_MILESTONES} onClick={() => setNames([...names, ''])}>
          + Add milestone
        </button>
      </fieldset>
      <div className="goal-form__actions">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </Button>
      </div>
      <div className="form-error-inline">
        <ErrorText>{error}</ErrorText>
      </div>
    </form>
  );
}
