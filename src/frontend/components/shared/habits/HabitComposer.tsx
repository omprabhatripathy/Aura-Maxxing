import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import EmojiPicker from './EmojiPicker';
import { ValidationError, toUserMessage } from '../../../../backend/core/errors';
import type { HabitCategory, HabitFrequency, HabitPriority } from '../../../../backend/models';
import type { HabitInput } from '../../../../backend/validators';
import { HABIT_CATEGORY_OPTIONS, HABIT_FREQUENCY_OPTIONS, HABIT_PRIORITY_OPTIONS } from '../../../lib/options';
import { CATEGORY_EMOJI } from '../../../lib/habitEmoji';
import './HabitComposer.css';

interface Draft {
  label: string;
  emoji: string;
  category: HabitCategory | '';
  priority: HabitPriority | '';
  frequency: HabitFrequency | '';
}

type Field = 'label' | 'category' | 'priority' | 'frequency';
type Errors = Partial<Record<Field, string>>;

const EMPTY: Draft = { label: '', emoji: '', category: '', priority: '', frequency: '' };
const EXAMPLES = ['Read 10 pages', 'Drink 3L water', 'Morning walk', 'Meditate 5 min', 'No phone after 10pm'];
const MAX_LABEL = 60;

const SELECTS = [
  { field: 'frequency', label: 'Frequency', options: HABIT_FREQUENCY_OPTIONS, required: 'Pick how often.' },
  { field: 'priority', label: 'Priority', options: HABIT_PRIORITY_OPTIONS, required: 'Pick a priority.' },
  { field: 'category', label: 'Category', options: HABIT_CATEGORY_OPTIONS, required: 'Pick a category.' },
] as const;

function validate(draft: Draft): Errors {
  const errors: Errors = {};
  if (!draft.label.trim()) errors.label = 'Give your habit a name.';
  for (const s of SELECTS) if (!draft[s.field]) errors[s.field] = s.required;
  return errors;
}

interface Props {
  /** Resolves true when saved; throws ValidationError for field-level problems. */
  onCreate: (input: HabitInput) => Promise<boolean>;
}

export default function HabitComposer({ onCreate }: Props) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [shaking, setShaking] = useState(false);
  const [example, setExample] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const selectRefs = useRef<Partial<Record<Field, HTMLSelectElement | null>>>({});
  const successTimer = useRef<number | undefined>(undefined);
  const id = useId();

  useEffect(() => {
    const timer = window.setInterval(() => setExample((i) => (i + 1) % EXAMPLES.length), 2800);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(successTimer.current);
    };
  }, []);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
    setFormError('');
  };

  const focusField = (field: Field) => (field === 'label' ? nameRef.current : selectRefs.current[field])?.focus();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === 'saving') return;
    const found = validate(draft);
    const firstInvalid = (['label', 'frequency', 'priority', 'category'] as Field[]).find((f) => found[f]);
    if (firstInvalid) {
      setErrors(found);
      setShaking(true);
      focusField(firstInvalid);
      return;
    }

    setStatus('saving');
    try {
      const ok = await onCreate({
        label: draft.label,
        emoji: draft.emoji,
        category: draft.category as HabitCategory,
        priority: draft.priority as HabitPriority,
        frequency: draft.frequency as HabitFrequency,
      });
      if (!ok) {
        setStatus('idle');
        return;
      }
      setDraft(EMPTY);
      setErrors({});
      setStatus('success');
      nameRef.current?.focus();
      successTimer.current = window.setTimeout(() => setStatus('idle'), 1800);
    } catch (error) {
      setStatus('idle');
      const field = error instanceof ValidationError ? (error.field as Field | undefined) : undefined;
      if (field && ['label', 'category', 'priority', 'frequency'].includes(field)) {
        setErrors({ [field]: (error as Error).message });
        setShaking(true);
        focusField(field);
      } else {
        setFormError(error instanceof ValidationError ? error.message : toUserMessage(error));
      }
    }
  }

  const errorId = (field: Field) => `${id}-${field}-error`;

  return (
    <section className={`habit-composer${status === 'success' ? ' is-success' : ''}`} aria-labelledby={`${id}-title`}>
      <header className="habit-composer__head">
        <div>
          <h2 id={`${id}-title`} className="habit-composer__title">
            New habit
          </h2>
          <p className="habit-composer__sub">Pick an icon, name it, and choose how it fits your routine.</p>
        </div>
      </header>

      <form className="habit-composer__form" onSubmit={handleSubmit} noValidate>
        <div className={`habit-composer__grid${shaking ? ' is-shaking' : ''}`} onAnimationEnd={(e) => e.target === e.currentTarget && setShaking(false)}>
          <div className="habit-composer__primary">
            <label htmlFor={`${id}-name`} className="sr-only">
              Habit name
            </label>
            <div className={`habit-composer__name${errors.label ? ' has-error' : ''}`}>
              <EmojiPicker
                value={draft.emoji}
                fallback={draft.category ? CATEGORY_EMOJI[draft.category] : '✨'}
                onChange={(emoji) => update('emoji', emoji)}
              />
              <input
                ref={nameRef}
                id={`${id}-name`}
                className="habit-composer__input"
                placeholder={`e.g. ${EXAMPLES[example]}`}
                autoComplete="off"
                maxLength={MAX_LABEL}
                value={draft.label}
                aria-invalid={Boolean(errors.label)}
                aria-describedby={errors.label ? errorId('label') : undefined}
                onChange={(e) => update('label', e.target.value)}
              />
              <span className="habit-composer__count" aria-hidden="true">
                {draft.label.length}/{MAX_LABEL}
              </span>
            </div>
            {errors.label && (
              <p id={errorId('label')} className="habit-composer__error">
                {errors.label}
              </p>
            )}
          </div>

          <div className="habit-composer__options">
            {SELECTS.map((s) => (
              <div key={s.field} className="habit-composer__option">
                <div className={`habit-composer__select${errors[s.field] ? ' has-error' : ''}${draft[s.field] ? '' : ' is-empty'}`}>
                  <label htmlFor={`${id}-${s.field}`}>{s.label}</label>
                  <select
                    ref={(el) => {
                      selectRefs.current[s.field] = el;
                    }}
                    id={`${id}-${s.field}`}
                    value={draft[s.field]}
                    aria-invalid={Boolean(errors[s.field])}
                    aria-describedby={errors[s.field] ? errorId(s.field) : undefined}
                    onChange={(e) => update(s.field, e.target.value as Draft[typeof s.field])}
                  >
                    <option value="" disabled>
                      Select…
                    </option>
                    {s.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors[s.field] && (
                  <p id={errorId(s.field)} className="habit-composer__error">
                    {errors[s.field]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {formError && (
          <p className="habit-composer__error habit-composer__error--form" role="alert">
            {formError}
          </p>
        )}

        <button type="submit" className={`habit-composer__cta is-${status}`} disabled={status === 'saving'} aria-live="polite">
          {status === 'saving' ? (
            <>
              <span className="habit-composer__spinner" aria-hidden="true" />
              Adding…
            </>
          ) : status === 'success' ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path className="habit-composer__check" d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              Habit added
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Habit
            </>
          )}
        </button>
      </form>
    </section>
  );
}
