import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Modal from '../ui/Modal';
import Button from '../Button';
import { Input, Select, TextArea } from '../ui/Field';
import { ValidationError } from '../../../../backend/core/errors';
import { breakdownTask, isCompleted, recommendPriority } from '../../../../backend/todo/analytics';
import { parseTaskTags, TASK_LIMITS } from '../../../../backend/todo/model';
import { newSubtask } from '../../../../backend/todo/taskService';
import { PRIORITY_DOT, PRIORITY_LABEL, TASK_PRIORITIES, type Recurrence, type Task, type TaskInput, type TaskStatus } from '../../../../backend/todo/types';
import { PRIORITY_COLOR } from './meta';

interface Props {
  title: string;
  initial: TaskInput;
  /** The task being edited (excluded from its own dependency list). */
  taskId?: string;
  tasks: Task[];
  goals: { id: string; title: string }[];
  habits: { id: string; label: string }[];
  today: string;
  submitLabel: string;
  onSubmit: (input: TaskInput) => Promise<boolean>;
  onClose: () => void;
}

const REPEAT_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
];

export default function TaskEditor({ title, initial, taskId, tasks, goals, habits, today, submitLabel, onSubmit, onClose }: Props) {
  const [input, setInput] = useState<TaskInput>(initial);
  const [tagText, setTagText] = useState(initial.tags.join(', '));
  const [newStep, setNewStep] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof TaskInput>(key: K, value: TaskInput[K]) => {
    setInput((i) => ({ ...i, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '', form: '' }));
  };

  const suggestion = recommendPriority(input.title, input.dueDate, today);
  const candidates = tasks.filter((t) => t.id !== taskId && t.status !== 'archived' && (!isCompleted(t) || input.dependsOn.includes(t.id)));

  function addStep(titleText: string) {
    const clean = titleText.trim();
    if (!clean || input.subtasks.length >= TASK_LIMITS.subtasks) return;
    set('subtasks', [...input.subtasks, newSubtask(clean)]);
  }

  function smartBreakdown() {
    const existing = new Set(input.subtasks.map((s) => s.title.toLowerCase()));
    const fresh = breakdownTask(input.title, input.description).filter((s) => !existing.has(s.toLowerCase()));
    set('subtasks', [...input.subtasks, ...fresh.map(newSubtask)].slice(0, TASK_LIMITS.subtasks));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!input.title.trim()) {
      setErrors({ title: 'Give your task a title.' });
      return;
    }
    setBusy(true);
    try {
      const ok = await onSubmit({ ...input, tags: parseTaskTags(tagText) });
      if (ok) onClose();
    } catch (error) {
      const field = error instanceof ValidationError && error.field ? error.field : 'form';
      setErrors({ [field]: error instanceof ValidationError ? error.message : 'Could not save the task.' });
    } finally {
      setBusy(false);
    }
  }

  const fieldError = (key: string) => (errors[key] ? <span className="todo-error">{errors[key]}</span> : null);

  return (
    <Modal title={title} size="lg" onClose={onClose}>
      <form className="todo-editor" onSubmit={submit} noValidate>
        <div className="todo-editor__full">
          <Input label="Title" maxLength={TASK_LIMITS.title} value={input.title} onChange={(e) => set('title', e.target.value)} aria-invalid={Boolean(errors.title)} autoFocus />
          {fieldError('title')}
        </div>
        <div className="todo-editor__full">
          <TextArea label="Description" rows={2} maxLength={TASK_LIMITS.description} value={input.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        <fieldset className="todo-editor__full todo-editor__priority">
          <legend className="ui-field__label">
            Priority
            {suggestion && suggestion !== input.priority && (
              <button type="button" className="todo-suggest-chip" onClick={() => set('priority', suggestion)}>
                ✨ Suggest {PRIORITY_LABEL[suggestion]}
              </button>
            )}
          </legend>
          <div className="todo-priority-picker">
            {TASK_PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={input.priority === p}
                className={`todo-priority-option${input.priority === p ? ' is-active' : ''}`}
                style={{ '--c': PRIORITY_COLOR[p] } as CSSProperties}
                onClick={() => set('priority', p)}
              >
                {PRIORITY_DOT[p]} {PRIORITY_LABEL[p]}
              </button>
            ))}
          </div>
        </fieldset>

        {!taskId && <Select label="Status" options={STATUS_OPTIONS} value={input.status ?? 'todo'} onChange={(status) => set('status', status)} />}
        <Select label="Repeat" options={REPEAT_OPTIONS} value={input.recurrence} onChange={(recurrence) => set('recurrence', recurrence)} />
        <div>
          <Input label="Due date" type="date" value={input.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value || null)} />
          {fieldError('dueDate')}
        </div>
        <Input label="Due time" type="time" disabled={!input.dueDate} value={input.dueTime ?? ''} onChange={(e) => set('dueTime', e.target.value || null)} />
        <div>
          <Input
            label="Estimate (minutes)"
            type="number"
            min={1}
            max={1440}
            placeholder="e.g. 45"
            value={input.estimateMinutes ?? ''}
            onChange={(e) => set('estimateMinutes', e.target.value ? Number(e.target.value) : null)}
          />
          {fieldError('estimateMinutes')}
        </div>
        <Input label="Category tags" placeholder="work, health" hint="Comma separated" value={tagText} onChange={(e) => setTagText(e.target.value)} />

        <fieldset className="todo-editor__full todo-editor__subtasks">
          <legend className="ui-field__label">
            Subtasks {input.subtasks.length > 0 && `(${input.subtasks.filter((s) => s.done).length}/${input.subtasks.length})`}
            <button type="button" className="todo-suggest-chip" onClick={smartBreakdown} disabled={!input.title.trim()}>
              ✨ Smart breakdown
            </button>
          </legend>
          <ul>
            <AnimatePresence initial={false}>
              {input.subtasks.map((s, i) => (
                <motion.li key={s.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                  <input
                    type="checkbox"
                    checked={s.done}
                    aria-label={`Mark ${s.title} done`}
                    onChange={() => set('subtasks', input.subtasks.map((x, j) => (j === i ? { ...x, done: !x.done, completedAt: x.done ? null : new Date().toISOString() } : x)))}
                  />
                  <input
                    className="todo-editor__subtask-input"
                    value={s.title}
                    maxLength={TASK_LIMITS.subtask}
                    aria-label={`Subtask ${i + 1}`}
                    onChange={(e) => set('subtasks', input.subtasks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  />
                  <button type="button" className="todo-icon-btn" aria-label={`Remove ${s.title}`} onClick={() => set('subtasks', input.subtasks.filter((_, j) => j !== i))}>
                    ×
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <div className="todo-editor__add-step">
            <input
              placeholder="Add a subtask and press Enter"
              aria-label="New subtask"
              value={newStep}
              maxLength={TASK_LIMITS.subtask}
              onChange={(e) => setNewStep(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addStep(newStep);
                  setNewStep('');
                }
              }}
            />
            <button
              type="button"
              className="todo-link"
              onClick={() => {
                addStep(newStep);
                setNewStep('');
              }}
            >
              Add
            </button>
          </div>
          {fieldError('subtasks')}
        </fieldset>

        {candidates.length > 0 && (
          <fieldset className="todo-editor__full todo-editor__deps">
            <legend className="ui-field__label">Depends on (must be finished first)</legend>
            <div className="todo-editor__dep-list">
              {candidates.map((t) => (
                <label key={t.id} className={`todo-dep-chip${input.dependsOn.includes(t.id) ? ' is-active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={input.dependsOn.includes(t.id)}
                    onChange={(e) => set('dependsOn', e.target.checked ? [...input.dependsOn, t.id] : input.dependsOn.filter((d) => d !== t.id))}
                  />
                  {PRIORITY_DOT[t.priority]} {t.title}
                </label>
              ))}
            </div>
            {fieldError('dependsOn')}
          </fieldset>
        )}

        <Select
          label="Linked goal"
          options={[{ value: '', label: 'None' }, ...goals.map((g) => ({ value: g.id, label: g.title }))]}
          value={input.goalId ?? ''}
          onChange={(v) => set('goalId', v || null)}
        />
        <Select
          label="Linked habit"
          options={[{ value: '', label: 'None' }, ...habits.map((h) => ({ value: h.id, label: h.label }))]}
          value={input.habitId ?? ''}
          onChange={(v) => set('habitId', v || null)}
        />

        <div className="todo-editor__full">
          <TextArea label="Notes" rows={3} maxLength={TASK_LIMITS.notes} value={input.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>

        {errors.form && (
          <p className="todo-error todo-editor__full" role="alert">
            {errors.form}
          </p>
        )}
        <div className="todo-editor__actions todo-editor__full">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
