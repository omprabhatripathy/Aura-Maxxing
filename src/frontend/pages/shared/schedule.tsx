import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState, ErrorText, Grid, Input, Modal, SegmentedControl, Select, StatCard, TextArea } from '../../components/shared/ui';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { ScheduleIcon } from '../../components/shared/icons';
import { ErrorState, PageSkeleton } from '../../components/shared/feedback/Feedback';
import { useUserData } from '../../context/useUserData';
import { useAction, withInlineErrors } from '../../hooks/useAction';
import { createScheduleItem, deleteScheduleItem, moveScheduleItem, setScheduleDone, updateScheduleItem } from '../../../backend/schedule/scheduleService';
import { layoutDay, occurrencesOn, planningScore, planningStats } from '../../../backend/schedule/analytics';
import { fromMinutes, toMinutes } from '../../../backend/schedule/model';
import {
  RECURRENCE_LABEL,
  SCHEDULE_CATEGORIES,
  SCHEDULE_CATEGORY_META,
  SCHEDULE_LIMITS,
  type ScheduleCategory,
  type ScheduleInput,
  type ScheduleItem,
  type ScheduleOccurrence,
  type SchedulePriority,
  type ScheduleRecurrence,
} from '../../../backend/schedule/types';
import { setTaskStatus } from '../../../backend/todo/taskService';
import { isOpen } from '../../../backend/todo/analytics';
import { addDays, dateRange, formatDate, fromIso, weekStart } from '../../../backend/core/dates';
import { formatMinutes } from '../../../backend/pomodoro/analytics';
import './schedule.css';

type View = 'day' | 'week' | 'month';
const VIEWS: { value: View; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const DAY_START = 6 * 60;
const DAY_END = 24 * 60;
const PX_PER_MIN = 1.1;
const SNAP = SCHEDULE_LIMITS.snapMinutes;

type Editor = { item?: ScheduleItem; occurrenceDate?: string; initial: ScheduleInput } | null;

const blankInput = (date: string, start = '09:00', minutes = 60): ScheduleInput => ({
  title: '',
  description: '',
  date,
  start,
  end: fromMinutes(Math.min(DAY_END - 1, toMinutes(start) + minutes)),
  category: 'work',
  priority: 'medium',
  recurrence: 'none',
  reminderMinutes: 10,
  linkedTaskId: null,
  linkedGoalId: null,
});

export default function Schedule() {
  const { uid, schedule, tasks, goals, today, loading, error, retry } = useUserData();
  const { run, isPending } = useAction();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('day');
  const [anchor, setAnchor] = useState(today);
  const [editor, setEditor] = useState<Editor>(null);
  const [deleting, setDeleting] = useState<{ item: ScheduleItem; date: string } | null>(null);

  const days = useMemo(() => {
    if (view === 'day') return [anchor];
    if (view === 'week') return dateRange(weekStart(anchor), addDays(weekStart(anchor), 6));
    const d = fromIso(anchor);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return dateRange(`${anchor.slice(0, 8)}01`, `${anchor.slice(0, 8)}${String(lastDay).padStart(2, '0')}`);
  }, [view, anchor]);

  const range = { from: days[0], to: days[days.length - 1] };
  const statsTo = range.to > today ? today : range.to;
  const stats = useMemo(() => (range.from <= today ? planningStats(schedule, range.from, statsTo) : null), [schedule, range.from, statsTo, today]);
  const score = useMemo(() => planningScore(schedule, today), [schedule, today]);
  const unscheduled = useMemo(() => {
    const linked = new Set(schedule.filter((i) => i.linkedTaskId).map((i) => i.linkedTaskId));
    return tasks.filter((t) => isOpen(t) && !linked.has(t.id) && (!t.dueDate || t.dueDate <= addDays(today, 2))).slice(0, 6);
  }, [schedule, tasks, today]);

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (loading) return <PageSkeleton cards={4} />;

  const step = (dir: number) => setAnchor((a) => (view === 'day' ? addDays(a, dir) : view === 'week' ? addDays(a, 7 * dir) : shiftMonthDate(a, dir)));
  const title =
    view === 'day'
      ? formatDate(anchor, { weekday: 'long', month: 'long', day: 'numeric' })
      : view === 'week'
        ? `${formatDate(days[0])} – ${formatDate(days[6])}`
        : fromIso(anchor).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const toggleDone = (o: ScheduleOccurrence) =>
    run(
      `schedule:done:${o.item.id}:${o.date}`,
      async () => {
        await setScheduleDone(uid, o.item, o.date, !o.done);
        const task = !o.done && o.item.linkedTaskId ? tasks.find((t) => t.id === o.item.linkedTaskId) : undefined;
        if (task && isOpen(task)) await setTaskStatus(uid, task, 'done', tasks);
      },
      { success: o.done ? 'Marked as not done.' : 'Block completed.' }
    );

  return (
    <div className="sch-page">
      <header className="sch-hero">
        <span className="sch-hero__icon" aria-hidden="true">
          <ScheduleIcon width={26} height={26} />
        </span>
        <div className="sch-hero__text">
          <h2>Daily Schedule</h2>
          <p>Time-block your day, link blocks to tasks and goals, and see how much of your plan you complete.</p>
        </div>
        <Button onClick={() => setEditor({ initial: blankInput(view === 'day' ? anchor : today) })}>+ Block</Button>
      </header>

      <Grid minItemWidth={150}>
        <StatCard label="Planned" value={stats ? formatMinutes(stats.plannedMinutes) : '—'} description={`${view === 'day' ? 'This day' : view === 'week' ? 'This week' : 'This month'} (so far)`} />
        <StatCard label="Completed" value={stats ? formatMinutes(stats.completedMinutes) : '—'} description={stats ? `${stats.doneBlocks}/${stats.blocks} blocks` : undefined} />
        <StatCard label="Completion rate" value={stats?.completionRate == null ? '—' : `${Math.round(stats.completionRate * 100)}%`} />
        <StatCard label="Planning score" value={score === null ? '—' : `${score}/100`} description="Last 7 days · feeds productivity" />
      </Grid>

      <div className="sch-toolbar">
        <div className="sch-nav">
          <button type="button" onClick={() => step(-1)} aria-label="Previous">
            ‹
          </button>
          <button type="button" className="sch-nav__today" onClick={() => setAnchor(today)}>
            Today
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next">
            ›
          </button>
          <strong>{title}</strong>
        </div>
        <SegmentedControl ariaLabel="Schedule view" options={VIEWS} value={view} onChange={setView} />
      </div>

      <div className="sch-layout">
        <Card className="sch-calendar">
          {view === 'month' ? (
            <MonthGrid
              days={days}
              items={schedule}
              today={today}
              onPick={(d) => {
                setAnchor(d);
                setView('day');
              }}
            />
          ) : (
            <TimeGrid
              days={days}
              items={schedule}
              today={today}
              busy={isPending}
              onCreate={(date, start) => setEditor({ initial: blankInput(date, start) })}
              onOpen={(o) => setEditor({ item: o.item, occurrenceDate: o.date, initial: { ...o.item } })}
              onToggle={toggleDone}
              onMove={(o, date, start) => {
                const length = o.minutes;
                const end = fromMinutes(Math.min(DAY_END - 1, toMinutes(start) + length));
                void run(`schedule:move:${o.item.id}`, () => moveScheduleItem(uid, o.item, o.date, date, start, end), { success: `Moved to ${formatDate(date, { weekday: 'short' })} ${start}.` });
              }}
            />
          )}
        </Card>

        <div className="sch-side">
          <Card title="Agenda">
            <Agenda date={view === 'day' ? anchor : today} items={schedule} onToggle={toggleDone} onOpen={(o) => setEditor({ item: o.item, occurrenceDate: o.date, initial: { ...o.item } })} />
          </Card>
          <Card title="Tasks to schedule">
            {unscheduled.length === 0 ? (
              <EmptyState>All upcoming tasks have a time block.</EmptyState>
            ) : (
              <ul className="sch-tasks">
                {unscheduled.map((t) => (
                  <li key={t.id}>
                    <span>
                      <strong>{t.title}</strong>
                      <small>
                        {t.dueDate ? `Due ${formatDate(t.dueDate)}` : 'No due date'} · {t.estimateMinutes ?? 60} min
                      </small>
                    </span>
                    <button
                      type="button"
                      className="sch-link"
                      onClick={() =>
                        setEditor({
                          initial: { ...blankInput(view === 'day' ? anchor : today, '09:00', t.estimateMinutes ?? 60), title: t.title, linkedTaskId: t.id, linkedGoalId: t.goalId },
                        })
                      }
                    >
                      + Block
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {editor && (
        <ScheduleEditor
          editor={editor}
          tasks={tasks.filter(isOpen)}
          goals={goals.filter((g) => g.status !== 'complete')}
          busy={isPending('schedule:save')}
          onClose={() => setEditor(null)}
          onSave={(input) =>
            run('schedule:save', () => (editor.item ? updateScheduleItem(uid, editor.item, input) : createScheduleItem(uid, input)), { success: editor.item ? 'Block updated.' : 'Block added.' })
          }
          onFocus={(taskId) => navigate(taskId ? `/pomodoro?task=${encodeURIComponent(taskId)}` : '/pomodoro')}
          onDelete={() => editor.item && setDeleting({ item: editor.item, date: editor.occurrenceDate ?? editor.item.date })}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete block?"
          message={deleting.item.recurrence === 'none' ? 'This removes the block from your schedule.' : 'Remove just this occurrence, or the whole repeating series?'}
          confirmLabel={deleting.item.recurrence === 'none' ? 'Delete' : 'Only this one'}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            run('schedule:delete', () => deleteScheduleItem(uid, deleting.item, deleting.date), { success: 'Block removed.' }).then(() => {
              setDeleting(null);
              setEditor(null);
            })
          }
        >
          {deleting.item.recurrence !== 'none' && (
            <Button
              variant="danger"
              onClick={() =>
                void run('schedule:delete', () => deleteScheduleItem(uid, deleting.item), { success: 'Series deleted.' }).then(() => {
                  setDeleting(null);
                  setEditor(null);
                })
              }
            >
              Delete whole series
            </Button>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}

function shiftMonthDate(date: string, dir: number): string {
  const d = fromIso(date);
  const next = new Date(d.getFullYear(), d.getMonth() + dir, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
}

interface DragState {
  occ: ScheduleOccurrence;
  pointerId: number;
  startY: number;
  startX: number;
  dayIndex: number;
  colWidth: number;
  dy: number;
  dx: number;
  moved: boolean;
}

function TimeGrid({
  days,
  items,
  today,
  busy,
  onCreate,
  onOpen,
  onToggle,
  onMove,
}: {
  days: string[];
  items: ScheduleItem[];
  today: string;
  busy: (key: string) => boolean;
  onCreate: (date: string, start: string) => void;
  onOpen: (o: ScheduleOccurrence) => void;
  onToggle: (o: ScheduleOccurrence) => void;
  onMove: (o: ScheduleOccurrence, date: string, start: string) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => DAY_START / 60 + i);
  const height = (DAY_END - DAY_START) * PX_PER_MIN;

  const target = (d: DragState) => {
    const shift = Math.round(d.dx / d.colWidth);
    const dayIndex = Math.max(0, Math.min(days.length - 1, d.dayIndex + shift));
    const start = Math.max(DAY_START, Math.min(DAY_END - d.occ.minutes, Math.round((toMinutes(d.occ.start) + d.dy / PX_PER_MIN) / SNAP) * SNAP));
    return { date: days[dayIndex], start: fromMinutes(start), dayIndex };
  };

  const onPointerDown = (e: ReactPointerEvent, occ: ScheduleOccurrence, dayIndex: number) => {
    if ((e.target as HTMLElement).closest('button, input')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const colWidth = columnsRef.current ? columnsRef.current.getBoundingClientRect().width / days.length : 1;
    setDrag({ occ, pointerId: e.pointerId, startY: e.clientY, startX: e.clientX, dayIndex, colWidth, dy: 0, dx: 0, moved: false });
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dy = e.clientY - drag.startY;
    const dx = e.clientX - drag.startX;
    setDrag({ ...drag, dy, dx, moved: drag.moved || Math.abs(dy) > 6 || Math.abs(dx) > 6 });
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    setDrag(null);
    if (!d.moved) {
      onOpen(d.occ);
      return;
    }
    const t = target(d);
    if (t.date !== d.occ.date || t.start !== d.occ.start) onMove(d.occ, t.date, t.start);
  };

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    <div className={`sch-grid sch-grid--${days.length === 1 ? 'day' : 'week'}`}>
      {days.length > 1 && (
        <div className="sch-grid__heads" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((d) => (
            <span key={d} className={d === today ? 'is-today' : ''}>
              {formatDate(d, { weekday: 'short' })} <strong>{fromIso(d).getDate()}</strong>
            </span>
          ))}
        </div>
      )}
      <div className="sch-grid__body">
        <div className="sch-grid__hours" style={{ height }}>
          {hours.map((h) => (
            <span key={h} style={{ top: (h * 60 - DAY_START) * PX_PER_MIN }}>
              {String(h).padStart(2, '0')}:00
            </span>
          ))}
        </div>
        <div className="sch-grid__columns" ref={columnsRef} style={{ height, gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((date, dayIndex) => (
            <div
              key={date}
              className={`sch-col${date === today ? ' is-today' : ''}`}
              onDoubleClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const minutes = DAY_START + Math.floor((e.clientY - rect.top) / PX_PER_MIN / 30) * 30;
                onCreate(date, fromMinutes(minutes));
              }}
            >
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  className="sch-slot"
                  style={{ top: (h * 60 - DAY_START) * PX_PER_MIN, height: 60 * PX_PER_MIN }}
                  aria-label={`Add block on ${formatDate(date)} at ${String(h).padStart(2, '0')}:00`}
                  onClick={() => onCreate(date, fromMinutes(h * 60))}
                />
              ))}
              {date === today && nowMinutes >= DAY_START && <span className="sch-now" style={{ top: (nowMinutes - DAY_START) * PX_PER_MIN }} aria-hidden="true" />}
              {layoutDay(occurrencesOn(items, date)).map((o) => {
                const dragging = drag?.occ.item.id === o.item.id && drag.occ.date === date;
                const start = Math.max(DAY_START, toMinutes(o.start));
                const preview = dragging && drag.moved ? target(drag) : null;
                const meta = SCHEDULE_CATEGORY_META[o.item.category];
                const style = {
                  '--block': meta.color,
                  top: ((preview ? toMinutes(preview.start) : start) - DAY_START) * PX_PER_MIN,
                  height: Math.max(22, o.minutes * PX_PER_MIN - 2),
                  left: `calc(${(o.lane / o.lanes) * 100}% + 2px)`,
                  width: `calc(${100 / o.lanes}% - 4px)`,
                  transform: preview ? `translateX(${(preview.dayIndex - dayIndex) * 100}%)` : undefined,
                } as CSSProperties;
                return (
                  <div
                    key={`${o.item.id}-${date}`}
                    className={`sch-block sch-block--${o.item.priority}${o.done ? ' is-done' : ''}${dragging ? ' is-dragging' : ''}`}
                    style={style}
                    role="button"
                    tabIndex={0}
                    aria-label={`${o.item.title}, ${o.start}–${o.end}${o.done ? ', done' : ''}`}
                    onPointerDown={(e) => onPointerDown(e, o, dayIndex)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={() => setDrag(null)}
                    onKeyDown={(e) => e.key === 'Enter' && onOpen(o)}
                  >
                    <input
                      type="checkbox"
                      className="sch-block__check"
                      checked={o.done}
                      disabled={busy(`schedule:done:${o.item.id}:${date}`)}
                      onChange={() => onToggle(o)}
                      aria-label={`Mark ${o.item.title} ${o.done ? 'not done' : 'done'}`}
                    />
                    <span className="sch-block__title">
                      {o.item.title}
                      {o.item.recurrence !== 'none' && <span aria-label="Repeats"> ↻</span>}
                    </span>
                    <span className="sch-block__time">
                      {preview ? preview.start : o.start}–{o.end}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="sch-hint">Tap an empty hour to add a block · drag blocks to reschedule{days.length > 1 ? ' (across days too)' : ''} · tick to complete.</p>
    </div>
  );
}

function MonthGrid({ days, items, today, onPick }: { days: string[]; items: ScheduleItem[]; today: string; onPick: (date: string) => void }) {
  const lead = (fromIso(days[0]).getDay() + 6) % 7;
  return (
    <div className="sch-month">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
        <span key={d} className="sch-month__head">
          {d}
        </span>
      ))}
      {Array.from({ length: lead }, (_, i) => (
        <span key={`pad-${i}`} />
      ))}
      {days.map((d) => {
        const occ = occurrencesOn(items, d);
        const done = occ.filter((o) => o.done).length;
        return (
          <button key={d} type="button" className={`sch-month__day${d === today ? ' is-today' : ''}`} onClick={() => onPick(d)} aria-label={`${formatDate(d)}: ${occ.length} blocks`}>
            <strong>{fromIso(d).getDate()}</strong>
            <span className="sch-month__dots">
              {occ.slice(0, 4).map((o) => (
                <i key={o.item.id} style={{ background: SCHEDULE_CATEGORY_META[o.item.category].color }} />
              ))}
            </span>
            {occ.length > 0 && (
              <small>
                {done}/{occ.length}
              </small>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Agenda({ date, items, onToggle, onOpen }: { date: string; items: ScheduleItem[]; onToggle: (o: ScheduleOccurrence) => void; onOpen: (o: ScheduleOccurrence) => void }) {
  const occ = occurrencesOn(items, date);
  if (!occ.length) return <EmptyState>Nothing planned for {formatDate(date, { weekday: 'long' })}.</EmptyState>;
  return (
    <ul className="sch-agenda">
      {occ.map((o) => (
        <li key={o.item.id} className={o.done ? 'is-done' : ''} style={{ '--block': SCHEDULE_CATEGORY_META[o.item.category].color } as CSSProperties}>
          <input type="checkbox" checked={o.done} onChange={() => onToggle(o)} aria-label={`Mark ${o.item.title} ${o.done ? 'not done' : 'done'}`} />
          <button type="button" onClick={() => onOpen(o)}>
            <strong>{o.item.title}</strong>
            <small>
              {o.start}–{o.end} · {SCHEDULE_CATEGORY_META[o.item.category].label}
            </small>
          </button>
        </li>
      ))}
    </ul>
  );
}

const REMINDERS: { value: string; label: string }[] = [
  { value: 'none', label: 'No reminder' },
  { value: '0', label: 'At start time' },
  { value: '5', label: '5 min before' },
  { value: '10', label: '10 min before' },
  { value: '15', label: '15 min before' },
  { value: '30', label: '30 min before' },
  { value: '60', label: '1 hour before' },
];

function ScheduleEditor({
  editor,
  tasks,
  goals,
  busy,
  onSave,
  onClose,
  onDelete,
  onFocus,
}: {
  editor: NonNullable<Editor>;
  tasks: { id: string; title: string }[];
  goals: { id: string; title: string }[];
  busy: boolean;
  onSave: (input: ScheduleInput) => Promise<boolean>;
  onClose: () => void;
  onDelete: () => void;
  onFocus: (taskId: string | null) => void;
}) {
  const [input, setInput] = useState<ScheduleInput>(editor.initial);
  const [formError, setFormError] = useState('');
  const set = <K extends keyof ScheduleInput>(key: K, value: ScheduleInput[K]) => setInput((i) => ({ ...i, [key]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await withInlineErrors(() => onSave(input), setFormError);
    if (ok) onClose();
  }

  return (
    <Modal title={editor.item ? 'Edit block' : 'New time block'} onClose={onClose} size="lg">
      <form className="sch-form" onSubmit={submit}>
        <Input label="Task name" maxLength={SCHEDULE_LIMITS.titleMax} value={input.title} onChange={(e) => set('title', e.target.value)} required autoFocus />
        <TextArea label="Description" rows={2} maxLength={SCHEDULE_LIMITS.descriptionMax} value={input.description} onChange={(e) => set('description', e.target.value)} />
        <div className="sch-form__row">
          <Input label="Date" type="date" value={input.date} onChange={(e) => set('date', e.target.value)} required />
          <Input label="Start" type="time" step={SNAP * 60} value={input.start} onChange={(e) => set('start', e.target.value)} required />
          <Input label="End" type="time" step={SNAP * 60} value={input.end} onChange={(e) => set('end', e.target.value)} required />
        </div>
        <div className="sch-form__cats" role="group" aria-label="Category">
          {SCHEDULE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`sch-chip${input.category === c ? ' is-active' : ''}`}
              style={{ '--block': SCHEDULE_CATEGORY_META[c].color } as CSSProperties}
              aria-pressed={input.category === c}
              onClick={() => set('category', c as ScheduleCategory)}
            >
              {SCHEDULE_CATEGORY_META[c].label}
            </button>
          ))}
        </div>
        <div className="sch-form__row">
          <Select
            label="Priority"
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
            value={input.priority}
            onChange={(v) => set('priority', v as SchedulePriority)}
          />
          <Select label="Repeats" options={(Object.keys(RECURRENCE_LABEL) as ScheduleRecurrence[]).map((r) => ({ value: r, label: RECURRENCE_LABEL[r] }))} value={input.recurrence} onChange={(v) => set('recurrence', v)} />
          <Select label="Reminder" options={REMINDERS} value={input.reminderMinutes === null ? 'none' : String(input.reminderMinutes)} onChange={(v) => set('reminderMinutes', v === 'none' ? null : Number(v))} />
        </div>
        <div className="sch-form__row">
          <Select
            label="Linked task"
            options={[{ value: '', label: 'None' }, ...tasks.map((t) => ({ value: t.id, label: t.title }))]}
            value={input.linkedTaskId ?? ''}
            onChange={(v) => set('linkedTaskId', v || null)}
          />
          <Select
            label="Linked goal"
            options={[{ value: '', label: 'None' }, ...goals.map((g) => ({ value: g.id, label: g.title }))]}
            value={input.linkedGoalId ?? ''}
            onChange={(v) => set('linkedGoalId', v || null)}
          />
        </div>
        <ErrorText>{formError}</ErrorText>
        <div className="sch-form__actions">
          {editor.item && (
            <Button type="button" variant="danger" onClick={onDelete}>
              Delete
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => onFocus(input.linkedTaskId)}>
            🍅 Focus now
          </Button>
          <span className="sch-form__spacer" />
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
