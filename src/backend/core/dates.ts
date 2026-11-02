// Date helpers that work on local-calendar ISO strings (yyyy-mm-dd) to avoid timezone drift.

export function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayIso(): string {
  return toIso(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = fromIso(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

export function diffDays(fromIsoDate: string, toIsoDate: string): number {
  return Math.round((fromIso(toIsoDate).getTime() - fromIso(fromIsoDate).getTime()) / 86400000);
}

export function dateRange(start: string, end: string): string[] {
  const days: string[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) days.push(cursor);
  return days;
}

export function isValidIso(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toIso(fromIso(value)) === value;
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  return fromIso(iso).toLocaleDateString('en-US', opts);
}

/** Monday of the week containing the date (ISO weeks). */
export function weekStart(iso: string): string {
  const day = fromIso(iso).getDay();
  return addDays(iso, -((day + 6) % 7));
}

/** Local calendar date for a timestamp (avoids the UTC shift of toISOString). */
export function isoFromTimestamp(timestamp: string): string {
  return toIso(new Date(timestamp));
}

export function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
