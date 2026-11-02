import { database, paths, type Unsubscribe } from '../db';
import { isValidIso } from '../core/dates';
import { commit, deleteOp, setOp } from '../services/ops';
import { CYCLE_MOOD_LABEL, FLOW_LEVEL, isLogEmpty, type CycleMood, type DailyLog, type Flow } from './types';

export interface LogChanges {
  upserts: DailyLog[];
  deletes: string[];
}

const clamp = (n: unknown, min: number, max: number): number | undefined =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : undefined;

/** Normalises data coming from storage so malformed records never reach the UI or analytics. */
export function sanitizeLog(raw: unknown, fallbackDate?: string): DailyLog | null {
  const data = (raw ?? {}) as Record<string, unknown>;
  const date = typeof data.date === 'string' ? data.date : fallbackDate;
  if (!date || !isValidIso(date)) return null;

  const period = data.period as Record<string, unknown> | undefined;
  const flow = period?.flow as Flow | undefined;
  const log: DailyLog = {
    id: date,
    date,
    moods: Array.isArray(data.moods) ? (data.moods.filter((m) => typeof m === 'string' && m in CYCLE_MOOD_LABEL) as CycleMood[]) : [],
    symptoms: Array.isArray(data.symptoms)
      ? (data.symptoms as { name?: unknown; severity?: unknown }[])
          .filter((s) => typeof s?.name === 'string' && s.name.trim())
          .map((s) => ({ name: String(s.name).trim().slice(0, 40), severity: clamp(s.severity, 1, 5) ?? 1 }))
      : [],
  };
  if (period?.isPeriodDay && flow && flow in FLOW_LEVEL) {
    log.period = { isPeriodDay: true, flow, pain: clamp(period.pain, 0, 10) ?? 0 };
  }
  const intensity = clamp(data.moodIntensity, 1, 5);
  const energy = clamp(data.energyLevel, 1, 5);
  const stress = clamp(data.stressLevel, 1, 5);
  if (intensity !== undefined) log.moodIntensity = intensity;
  if (energy !== undefined) log.energyLevel = energy;
  if (stress !== undefined) log.stressLevel = stress;
  if (typeof data.notes === 'string' && data.notes.trim()) log.notes = data.notes.slice(0, 2000);
  return log;
}

export function subscribeLogs(uid: string, onData: (logs: DailyLog[]) => void, onError: (error: unknown) => void): Unsubscribe {
  return database.subscribe(
    paths.periodLogs(uid),
    { orderBy: 'date', direction: 'asc' },
    (docs) => onData(docs.map((d) => sanitizeLog(d.data, d.id)).filter((l): l is DailyLog => l !== null)),
    onError
  );
}

export async function applyLogChanges(uid: string, changes: LogChanges): Promise<void> {
  // Empty logs are removed rather than stored, so clearing every field deletes the record.
  const upserts = changes.upserts.filter((l) => !isLogEmpty(l));
  const deletes = new Set([...changes.deletes, ...changes.upserts.filter(isLogEmpty).map((l) => l.date)]);
  await commit([
    ...upserts.map((l) => setOp(paths.periodLogs(uid), l.date, { ...l, id: l.date })),
    ...[...deletes].map((d) => deleteOp(paths.periodLogs(uid), d)),
  ]);
}
