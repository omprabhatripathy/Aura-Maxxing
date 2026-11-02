import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { applyLogChanges, subscribeLogs, type LogChanges } from '../../backend/period/store';
import { computeCycleStats, deriveCycles, derivePeriods, predictCycles } from '../../backend/period/cycle';
import { todayIso } from '../../backend/core/dates';
import { toUserMessage } from '../../backend/core/errors';
import type { DailyLog } from '../../backend/period/types';

const NO_LOGS: DailyLog[] = [];

/** Single source of truth for period/mood/symptom logs and everything derived from them. */
export function usePeriodData() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const [loaded, setLoaded] = useState<{ uid: string; logs: DailyLog[] }>({ uid: '', logs: NO_LOGS });
  const [error, setError] = useState<{ uid: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid) return;
    return subscribeLogs(
      uid,
      (logs) => setLoaded({ uid, logs }),
      (e) => setError({ uid, message: toUserMessage(e, 'Unable to load your cycle data.') })
    );
  }, [uid, attempt]);

  const logs = loaded.uid === uid ? loaded.logs : NO_LOGS;
  const errorMessage = error?.uid === uid ? error.message : null;
  const loading = loaded.uid !== uid && !errorMessage;

  const apply = useCallback((changes: LogChanges) => applyLogChanges(uid, changes), [uid]);
  const retry = useCallback(() => {
    setError(null);
    setAttempt((a) => a + 1);
  }, []);

  const today = todayIso();
  const derived = useMemo(() => {
    const logsByDate = new Map(logs.map((l) => [l.date, l]));
    const periods = derivePeriods(logs);
    const cycles = deriveCycles(periods);
    const stats = computeCycleStats(cycles, today);
    const prediction = predictCycles(cycles, today);
    return { logsByDate, periods, cycles, stats, prediction };
  }, [logs, today]);

  return { uid, logs, loading, error: errorMessage, retry, apply, today, ...derived };
}

export type PeriodData = ReturnType<typeof usePeriodData>;
