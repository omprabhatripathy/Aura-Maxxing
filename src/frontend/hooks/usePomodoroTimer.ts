import { useCallback, useEffect, useRef, useState } from 'react';
import type { FocusCategory, PomodoroMode } from '../../backend/pomodoro/types';

export type TimerPhase = 'idle' | 'focus' | 'break';

export interface TimerState {
  phase: TimerPhase;
  mode: PomodoroMode;
  focusMin: number;
  breakMin: number;
  category: FocusCategory;
  customCategory: string;
  notes: string;
  taskId: string | null;
  /** ISO time the focus phase started. */
  startedAt: string | null;
  /** Epoch ms when the running phase ends; null while paused/idle. */
  endsAt: number | null;
  /** Remaining ms while paused. */
  remainingMs: number | null;
  distractions: number;
  /** Focus ms already spent (accumulated across pauses). */
  focusedMs: number;
}

export interface FocusResult {
  state: TimerState;
  completed: boolean;
  actualMinutes: number;
}

const STORAGE_KEY = 'aura-pomodoro-timer';

export const DEFAULT_TIMER: TimerState = {
  phase: 'idle',
  mode: 'focus',
  focusMin: 25,
  breakMin: 5,
  category: 'work',
  customCategory: '',
  notes: '',
  taskId: null,
  startedAt: null,
  endsAt: null,
  remainingMs: null,
  distractions: 0,
  focusedMs: 0,
};

function load(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_TIMER, ...(JSON.parse(raw) as Partial<TimerState>) } : DEFAULT_TIMER;
  } catch {
    return DEFAULT_TIMER;
  }
}

/** Ms left in the current phase. */
export function remainingOf(s: TimerState, now: number): number {
  if (s.phase === 'idle') return s.focusMin * 60_000;
  if (s.endsAt === null) return s.remainingMs ?? 0;
  return Math.max(0, s.endsAt - now);
}

/**
 * Pomodoro timer that survives navigation and reloads (state lives in localStorage, time is computed from
 * timestamps). `onFocusEnd` fires exactly once per focus phase, completed or stopped early.
 */
export function usePomodoroTimer(onFocusEnd: (result: FocusResult) => void) {
  const [state, setState] = useState<TimerState>(load);
  const [now, setNow] = useState(() => Date.now());
  const handled = useRef<string | null>(null);
  const onEnd = useRef(onFocusEnd);
  useEffect(() => {
    onEnd.current = onFocusEnd;
  }, [onFocusEnd]);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const finishFocus = useCallback((s: TimerState, completed: boolean, at: number) => {
    const key = `${s.startedAt}`;
    if (handled.current === key) return;
    handled.current = key;
    const spent = s.focusedMs + (s.endsAt !== null ? Math.min(at, s.endsAt) - (s.endsAt - (s.remainingMs ?? s.focusMin * 60_000)) : 0);
    const actualMinutes = completed ? s.focusMin : Math.min(s.focusMin, Math.max(0, spent / 60_000));
    onEnd.current({ state: s, completed, actualMinutes });
  }, []);

  useEffect(() => {
    if (state.phase === 'idle' || state.endsAt === null) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      const current = stateRef.current;
      if (current.phase === 'focus' && current.endsAt !== null && t >= current.endsAt) finishFocus(current, true, t);
      setState((s) => {
        if (s.endsAt === null || t < s.endsAt) return s;
        if (s.phase === 'focus') {
          return { ...s, phase: 'break', taskId: null, endsAt: t + s.breakMin * 60_000, remainingMs: s.breakMin * 60_000, focusedMs: 0 };
        }
        return { ...s, phase: 'idle', endsAt: null, remainingMs: null, startedAt: null, distractions: 0, focusedMs: 0 };
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [state.phase, state.endsAt, finishFocus]);

  const configure = useCallback((patch: Partial<TimerState>) => setState((s) => (s.phase === 'idle' ? { ...s, ...patch } : { ...s, ...pickEditable(patch) })), []);

  const start = useCallback(() => {
    const t = Date.now();
    handled.current = null;
    setNow(t);
    setState((s) => ({ ...s, phase: 'focus', startedAt: new Date(t).toISOString(), endsAt: t + s.focusMin * 60_000, remainingMs: s.focusMin * 60_000, distractions: 0, focusedMs: 0 }));
  }, []);

  const pause = useCallback(() => {
    const t = Date.now();
    setState((s) => {
      if (s.endsAt === null) return s;
      const remaining = Math.max(0, s.endsAt - t);
      const spentThisRun = (s.remainingMs ?? 0) - remaining;
      return { ...s, endsAt: null, remainingMs: remaining, focusedMs: s.phase === 'focus' ? s.focusedMs + spentThisRun : s.focusedMs };
    });
  }, []);

  const resume = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setState((s) => (s.endsAt === null && s.remainingMs !== null ? { ...s, endsAt: t + s.remainingMs } : s));
  }, []);

  /** Stops the session early; the focused time so far is reported as an incomplete session. */
  const stop = useCallback(() => {
    const t = Date.now();
    const current = stateRef.current;
    if (current.phase === 'focus') finishFocus(current, false, t);
    setState((s) => {
      return { ...s, phase: 'idle', endsAt: null, remainingMs: null, startedAt: null, distractions: 0, focusedMs: 0 };
    });
  }, [finishFocus]);

  const skipBreak = useCallback(() => setState((s) => (s.phase === 'break' ? { ...s, phase: 'idle', endsAt: null, remainingMs: null, startedAt: null, distractions: 0 } : s)), []);
  const addDistraction = useCallback(() => setState((s) => (s.phase === 'focus' ? { ...s, distractions: s.distractions + 1 } : s)), []);

  return { state, remaining: remainingOf(state, now), running: state.endsAt !== null, configure, start, pause, resume, stop, skipBreak, addDistraction };
}

/** While a session runs only labels can change, not durations or the linked task. */
function pickEditable(patch: Partial<TimerState>): Partial<TimerState> {
  const out: Partial<TimerState> = {};
  if (patch.notes !== undefined) out.notes = patch.notes;
  if (patch.category !== undefined) out.category = patch.category;
  if (patch.customCategory !== undefined) out.customCategory = patch.customCategory;
  return out;
}
