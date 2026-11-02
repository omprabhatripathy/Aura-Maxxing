import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, EmptyState, Grid, Input, SegmentedControl, StatCard, TextArea } from '../../components/shared/ui';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import TrendBars from '../../components/shared/charts/TrendBars';
import { PomodoroIcon } from '../../components/shared/icons';
import { ErrorState, PageSkeleton } from '../../components/shared/feedback/Feedback';
import { useUserData } from '../../context/useUserData';
import { useScoreHistory } from '../../context/useScoreHistory';
import { useAction } from '../../hooks/useAction';
import { usePomodoroTimer, type FocusResult } from '../../hooks/usePomodoroTimer';
import { deletePomodoroSession, logPomodoroSession, updatePomodoroSession } from '../../../backend/pomodoro/pomodoroService';
import { formatMinutes, pomodoroStats } from '../../../backend/pomodoro/analytics';
import { FOCUS_CATEGORIES, FOCUS_CATEGORY_META, POMODORO_LIMITS, POMODORO_PRESETS, type FocusCategory, type PomodoroMode, type PomodoroSession } from '../../../backend/pomodoro/types';
import { XP_RULES } from '../../../backend/services/progressionService';
import { formatDate, formatDateTime } from '../../../backend/core/dates';
import './pomodoro.css';

const MODES: { value: Exclude<PomodoroMode, 'task'>; label: string }[] = [
  { value: 'focus', label: '🍅 Focus 25/5' },
  { value: 'deep', label: '🧠 Deep Work 50/10' },
  { value: 'custom', label: '⚙️ Custom' },
];

const clock = (ms: number) => {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const clampMinutes = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(n)));

/** Short chime when a phase ends (best effort; silently skipped if audio is unavailable). */
function chime() {
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.25);
      osc.stop(ctx.currentTime + i * 0.25 + 0.45);
    });
  } catch {
    /* no audio */
  }
}

export default function Pomodoro() {
  const { uid, pomodoro, tasks, today, preferences, loading, error, retry } = useUserData();
  const { run, isPending } = useAction();
  const openHistory = useScoreHistory();
  const [params, setParams] = useSearchParams();
  const [historyFilter, setHistoryFilter] = useState<FocusCategory | 'all'>('all');
  const [editing, setEditing] = useState<PomodoroSession | null>(null);
  const [deleting, setDeleting] = useState<PomodoroSession | null>(null);

  const onFocusEnd = useCallback(
    ({ state, completed, actualMinutes }: FocusResult) => {
      if (actualMinutes < 1) return;
      const task = state.taskId ? tasks.find((t) => t.id === state.taskId) ?? null : null;
      if (completed) {
        chime();
        if (preferences.browserNotifications && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Focus session complete 🍅', { body: task ? `“${task.title}” is done. Take a ${state.breakMin}-minute break.` : `Take a ${state.breakMin}-minute break.` });
        }
      }
      void run(
        'pomodoro:save',
        () =>
          logPomodoroSession(
            uid,
            {
              mode: state.mode,
              category: state.category,
              customCategory: state.customCategory,
              notes: state.notes,
              focusMinutes: state.focusMin,
              actualMinutes,
              breakMinutes: state.breakMin,
              completed,
              distractions: state.distractions,
              taskId: state.taskId,
              taskTitle: task?.title ?? '',
              startedAt: state.startedAt ?? new Date().toISOString(),
            },
            task,
            tasks
          ),
        {
          success: completed
            ? `Session complete · ${state.focusMin} min${actualMinutes >= 15 ? ` · +${XP_RULES.focus} XP` : ''}${task ? ` · “${task.title}” marked done` : ''}`
            : `Stopped early · ${Math.round(actualMinutes)} min saved (no XP for unfinished sessions)`,
          error: 'Could not save the focus session.',
        }
      );
    },
    [uid, tasks, run, preferences.browserNotifications]
  );

  const timer = usePomodoroTimer(onFocusEnd);
  const { state } = timer;

  // A task opened from Todo: lock the timer to the task's estimate.
  const requestedTaskId = params.get('task');
  const requestedTask = requestedTaskId ? tasks.find((t) => t.id === requestedTaskId && t.status !== 'done' && t.status !== 'archived') : undefined;
  const linkedTask = state.taskId ? tasks.find((t) => t.id === state.taskId) : undefined;
  if (requestedTask && state.phase === 'idle' && state.taskId !== requestedTask.id) {
    const focus = clampMinutes(requestedTask.estimateMinutes ?? 25, POMODORO_LIMITS.minFocus, POMODORO_LIMITS.maxFocus);
    timer.configure({ taskId: requestedTask.id, mode: 'task', focusMin: focus, breakMin: focus >= 50 ? 10 : 5 });
  }

  const stats = useMemo(() => pomodoroStats(pomodoro, today), [pomodoro, today]);
  const history = useMemo(() => pomodoro.filter((s) => historyFilter === 'all' || s.category === historyFilter).slice(0, 60), [pomodoro, historyFilter]);

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (loading) return <PageSkeleton cards={4} />;

  const idle = state.phase === 'idle';
  const total = (state.phase === 'break' ? state.breakMin : state.focusMin) * 60_000;
  const progress = idle ? 0 : 1 - timer.remaining / total;
  const accent = state.phase === 'break' ? '#4ade80' : FOCUS_CATEGORY_META[state.category].color;

  const chooseMode = (mode: Exclude<PomodoroMode, 'task'>) => {
    if (mode === 'custom') timer.configure({ mode, taskId: null });
    else timer.configure({ mode, taskId: null, focusMin: POMODORO_PRESETS[mode].focus, breakMin: POMODORO_PRESETS[mode].rest });
    if (requestedTaskId) setParams({});
  };

  const unlinkTask = () => {
    timer.configure({ taskId: null, mode: 'focus', focusMin: 25, breakMin: 5 });
    setParams({});
  };

  return (
    <div className="pomo-page">
      <header className="pomo-hero">
        <span className="pomo-hero__icon" aria-hidden="true">
          <PomodoroIcon width={26} height={26} />
        </span>
        <div>
          <h2 className="pomo-hero__title">Pomodoro</h2>
          <p className="pomo-hero__sub">Deep focus in rounds. Every completed session grows your Focus radar, productivity score and XP.</p>
        </div>
      </header>

      <div className="pomo-layout">
        <Card className="pomo-timer" glow={state.phase === 'focus'}>
          {linkedTask && (
            <div className="pomo-task">
              <span className="pomo-task__label">Focusing on task</span>
              <strong>{linkedTask.title}</strong>
              <span className="pomo-task__hint">
                Timer set from the task's estimate ({state.focusMin} min). The task is marked done when the timer completes.
              </span>
              {idle && (
                <button type="button" className="pomo-link" onClick={unlinkTask}>
                  Unlink task
                </button>
              )}
            </div>
          )}

          {!linkedTask && (
            <SegmentedControl ariaLabel="Session type" options={MODES} value={state.mode === 'task' ? null : state.mode} onChange={chooseMode} block />
          )}

          {!linkedTask && state.mode === 'custom' && (
            <div className="pomo-custom">
              <Input
                label="Focus (min)"
                type="number"
                min={POMODORO_LIMITS.minFocus}
                max={POMODORO_LIMITS.maxFocus}
                value={state.focusMin}
                disabled={!idle}
                onChange={(e) => timer.configure({ focusMin: clampMinutes(Number(e.target.value) || POMODORO_LIMITS.minFocus, POMODORO_LIMITS.minFocus, POMODORO_LIMITS.maxFocus) })}
              />
              <Input
                label="Break (min)"
                type="number"
                min={POMODORO_LIMITS.minBreak}
                max={POMODORO_LIMITS.maxBreak}
                value={state.breakMin}
                disabled={!idle}
                onChange={(e) => timer.configure({ breakMin: clampMinutes(Number(e.target.value) || POMODORO_LIMITS.minBreak, POMODORO_LIMITS.minBreak, POMODORO_LIMITS.maxBreak) })}
              />
            </div>
          )}

          <div className="pomo-ring" style={{ '--ring-accent': accent, '--ring-progress': `${Math.round(progress * 360)}deg` } as CSSProperties}>
            <div className="pomo-ring__inner">
              <span className="pomo-ring__phase">{state.phase === 'break' ? 'Break' : state.phase === 'focus' ? (timer.running ? 'Focusing' : 'Paused') : 'Ready'}</span>
              <span className="pomo-ring__time" aria-live="polite">
                {clock(timer.remaining)}
              </span>
              <span className="pomo-ring__meta">
                {state.focusMin} min focus · {state.breakMin} min break
              </span>
            </div>
          </div>

          <div className="pomo-controls">
            {idle && (
              <Button onClick={timer.start} disabled={isPending('pomodoro:save')}>
                ▶ Start focus
              </Button>
            )}
            {!idle && timer.running && (
              <Button variant="ghost" onClick={timer.pause}>
                ❚❚ Pause
              </Button>
            )}
            {!idle && !timer.running && <Button onClick={timer.resume}>▶ Resume</Button>}
            {state.phase === 'focus' && (
              <>
                <Button variant="ghost" onClick={timer.addDistraction} title="Log a distraction">
                  ⚡ Distracted ({state.distractions})
                </Button>
                <Button variant="danger" onClick={timer.stop}>
                  ■ Stop
                </Button>
              </>
            )}
            {state.phase === 'break' && (
              <Button variant="ghost" onClick={timer.skipBreak}>
                ⏭ Skip break
              </Button>
            )}
          </div>

          <div className="pomo-categories" role="group" aria-label="Category">
            {FOCUS_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`pomo-chip${state.category === c ? ' is-active' : ''}`}
                style={{ '--chip': FOCUS_CATEGORY_META[c].color } as CSSProperties}
                aria-pressed={state.category === c}
                onClick={() => timer.configure({ category: c })}
              >
                {FOCUS_CATEGORY_META[c].emoji} {FOCUS_CATEGORY_META[c].label}
              </button>
            ))}
          </div>
          {state.category === 'custom' && (
            <Input label="Custom category" maxLength={POMODORO_LIMITS.customLabelMax} value={state.customCategory} onChange={(e) => timer.configure({ customCategory: e.target.value })} placeholder="e.g. Side project" />
          )}
          <TextArea label="Session notes" rows={2} maxLength={POMODORO_LIMITS.notesMax} value={state.notes} onChange={(e) => timer.configure({ notes: e.target.value })} placeholder="What are you working on?" />
          {!linkedTask && (
            <p className="pomo-hint">
              Tip: tasks in <Link to="/todo">Todo</Link> have a “Start focus” button — the timer then uses the task's estimate and completes the task for you.
            </p>
          )}
        </Card>

        <div className="pomo-side">
          <Grid minItemWidth={150}>
            <StatCard label="Sessions" value={stats.sessionsCompleted} description={`avg ${stats.averageMinutes} min`} onClick={() => openHistory({ kind: 'aura-points' })} />
            <StatCard label="Today" value={formatMinutes(stats.todayMinutes)} />
            <StatCard label="This week" value={formatMinutes(stats.weekMinutes)} />
            <StatCard label="This month" value={formatMinutes(stats.monthMinutes)} />
            <StatCard label="Longest streak" value={`${stats.longestStreak} d`} description={`Current ${stats.currentStreak} d`} />
            <StatCard label="Focus score" value={`${stats.focusScore}/100`} description="Last 30 days" onClick={() => openHistory({ kind: 'aura-score' })} />
          </Grid>
          <Card title="Last 7 days">
            <TrendBars points={stats.last7.map((d) => ({ label: formatDate(d.date, { weekday: 'short' }), value: d.minutes }))} valueLabel="Minutes" ariaLabel="Focus minutes per day this week" height={160} />
          </Card>
          {stats.byCategory.length > 0 && (
            <Card title="By category">
              <ul className="pomo-breakdown">
                {stats.byCategory.map((c) => {
                  const max = Math.max(...stats.byCategory.map((x) => x.minutes));
                  return (
                    <li key={c.category} style={{ '--chip': FOCUS_CATEGORY_META[c.category].color } as CSSProperties}>
                      <span>
                        {FOCUS_CATEGORY_META[c.category].emoji} {FOCUS_CATEGORY_META[c.category].label}
                      </span>
                      <span className="pomo-breakdown__track">
                        <span style={{ width: `${(c.minutes / max) * 100}%` }} />
                      </span>
                      <strong>{formatMinutes(c.minutes)}</strong>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <Card title="Focus history">
        <div className="pomo-categories" role="group" aria-label="Filter history">
          {(['all', ...FOCUS_CATEGORIES] as const).map((c) => (
            <button key={c} type="button" className={`pomo-chip${historyFilter === c ? ' is-active' : ''}`} aria-pressed={historyFilter === c} onClick={() => setHistoryFilter(c)}>
              {c === 'all' ? 'All' : `${FOCUS_CATEGORY_META[c].emoji} ${FOCUS_CATEGORY_META[c].label}`}
            </button>
          ))}
        </div>
        {history.length === 0 ? (
          <EmptyState>No focus sessions yet — start your first one above.</EmptyState>
        ) : (
          <ul className="pomo-history">
            {history.map((s) => (
              <li key={s.id} className={s.completed ? '' : 'is-incomplete'} style={{ '--chip': FOCUS_CATEGORY_META[s.category].color } as CSSProperties}>
                <span className="pomo-history__dot" aria-hidden="true">
                  {FOCUS_CATEGORY_META[s.category].emoji}
                </span>
                <div className="pomo-history__text">
                  <strong>
                    {s.taskTitle || (s.category === 'custom' && s.customCategory ? s.customCategory : FOCUS_CATEGORY_META[s.category].label)}
                    {!s.completed && <em> · stopped early</em>}
                  </strong>
                  <span>
                    {formatDateTime(s.startedAt)} · {formatMinutes(s.actualMinutes)}
                    {s.distractions ? ` · ${s.distractions} distraction${s.distractions === 1 ? '' : 's'}` : ''}
                  </span>
                  {s.notes && <span className="pomo-history__notes">{s.notes}</span>}
                </div>
                <div className="pomo-history__actions">
                  {!s.id.startsWith('legacy_') && (
                    <button type="button" className="pomo-link" onClick={() => setEditing(s)}>
                      Edit
                    </button>
                  )}
                  <button type="button" className="pomo-link pomo-link--danger" onClick={() => setDeleting(s)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing && (
        <EditSession
          session={editing}
          busy={isPending('pomodoro:edit')}
          onCancel={() => setEditing(null)}
          onSave={(patch) => run('pomodoro:edit', () => updatePomodoroSession(uid, editing, patch), { success: 'Session updated.' }).then((ok) => ok && setEditing(null))}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete session?"
          message="This removes it from your focus history and stats."
          confirmLabel="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={() => run('pomodoro:delete', () => deletePomodoroSession(uid, deleting), { success: 'Session deleted.' }).then(() => setDeleting(null))}
        />
      )}
    </div>
  );
}

function EditSession({
  session,
  busy,
  onSave,
  onCancel,
}: {
  session: PomodoroSession;
  busy: boolean;
  onSave: (patch: Pick<PomodoroSession, 'notes' | 'category' | 'customCategory'>) => void;
  onCancel: () => void;
}) {
  const [notes, setNotes] = useState(session.notes);
  const [category, setCategory] = useState<FocusCategory>(session.category);
  const [customCategory, setCustom] = useState(session.customCategory);
  return (
    <ConfirmDialog title="Edit session" message={`${formatDateTime(session.startedAt)} · ${formatMinutes(session.actualMinutes)}`} confirmLabel={busy ? 'Saving…' : 'Save'} onCancel={onCancel} onConfirm={() => onSave({ notes, category, customCategory })}>
      <div className="pomo-categories">
        {FOCUS_CATEGORIES.map((c) => (
          <button key={c} type="button" className={`pomo-chip${category === c ? ' is-active' : ''}`} style={{ '--chip': FOCUS_CATEGORY_META[c].color } as CSSProperties} onClick={() => setCategory(c)}>
            {FOCUS_CATEGORY_META[c].emoji} {FOCUS_CATEGORY_META[c].label}
          </button>
        ))}
      </div>
      {category === 'custom' && <Input label="Custom category" value={customCategory} onChange={(e) => setCustom(e.target.value)} />}
      <TextArea label="Notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
    </ConfirmDialog>
  );
}
