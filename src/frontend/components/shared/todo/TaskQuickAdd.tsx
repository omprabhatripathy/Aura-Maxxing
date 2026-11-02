import { useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { recommendPriority } from '../../../../backend/todo/analytics';
import { PRIORITY_DOT, PRIORITY_LABEL, TASK_PRIORITIES, type TaskInput, type TaskPriority } from '../../../../backend/todo/types';
import { ValidationError } from '../../../../backend/core/errors';
import { emptyTaskInput } from './meta';

/** "Write report #work #q3" → title "Write report", tags ["work", "q3"]. */
function parseTitle(raw: string): { title: string; tags: string[] } {
  const tags = [...raw.matchAll(/(^|\s)#([\w-]{1,24})/g)].map((m) => m[2].toLowerCase());
  return { title: raw.replace(/(^|\s)#[\w-]{1,24}/g, ' ').replace(/\s+/g, ' ').trim(), tags: [...new Set(tags)].slice(0, 8) };
}

interface Props {
  today: string;
  onCreate: (input: TaskInput) => Promise<boolean>;
  onMore: (draft: TaskInput) => void;
}

export default function TaskQuickAdd({ today, onCreate, onMore }: Props) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  const { title, tags } = parseTitle(text);
  const suggested = title ? recommendPriority(title, dueDate || null, today) : null;
  const effectivePriority: TaskPriority = priority || suggested || 'medium';

  const draft = (): TaskInput => emptyTaskInput({ title, tags, priority: effectivePriority, dueDate: dueDate || null, dueTime: dueDate && dueTime ? dueTime : null });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title) {
      setError('Give your task a title.');
      return;
    }
    setStatus('saving');
    try {
      const ok = await onCreate(draft());
      if (!ok) return setStatus('idle');
      setText('');
      setPriority('');
      setDueDate('');
      setDueTime('');
      setError('');
      setStatus('success');
      window.setTimeout(() => setStatus('idle'), 1400);
    } catch (err) {
      setStatus('idle');
      setError(err instanceof ValidationError ? err.message : 'Could not add the task.');
    }
  }

  return (
    <section className="todo-quick" aria-label="Quick add task">
      <form onSubmit={submit} noValidate>
        <div className={`todo-quick__main${error ? ' has-error' : ''}`}>
          <span className="todo-quick__icon" aria-hidden="true">
            ＋
          </span>
          <input
            className="todo-quick__input"
            placeholder="Add a task… use #tags, e.g. Finish report #work"
            aria-label="Task title"
            maxLength={160}
            value={text}
            aria-invalid={Boolean(error)}
            onChange={(e) => {
              setText(e.target.value);
              setError('');
            }}
          />
          <button type="submit" className={`todo-quick__submit is-${status}`} disabled={status === 'saving'}>
            {status === 'saving' ? <span className="todo-spinner" aria-hidden="true" /> : status === 'success' ? '✓ Added' : 'Add task'}
          </button>
        </div>

        <div className="todo-quick__row">
          <label className="todo-chip-field">
            <span>Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority | '')}>
              <option value="">{suggested ? `Auto (${PRIORITY_LABEL[suggested]})` : 'Auto'}</option>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_DOT[p]} {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="todo-chip-field">
            <span>Due</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <AnimatePresence initial={false}>
            {dueDate && (
              <motion.label className="todo-chip-field" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}>
                <span>Time</span>
                <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
              </motion.label>
            )}
          </AnimatePresence>
          <button type="button" className="todo-link" onClick={() => onMore(draft())}>
            More options →
          </button>
        </div>

        <AnimatePresence>
          {(tags.length > 0 || (suggested && !priority)) && (
            <motion.div className="todo-quick__hints" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {tags.map((t) => (
                <span key={t} className="todo-tag">
                  #{t}
                </span>
              ))}
              {suggested && !priority && (
                <button type="button" className="todo-suggest-chip" onClick={() => setPriority(suggested)}>
                  ✨ Suggested priority: {PRIORITY_DOT[suggested]} {PRIORITY_LABEL[suggested]}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {error && (
          <p className="todo-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
