import { loadSentIds, markSent } from '../../../../backend/period/reminders';

export interface Notice {
  id: string;
  title: string;
  body: string;
}

/** Shows each notice at most once per device; only when the user enabled notifications and granted permission. */
export function deliverNotifications(storageKey: string, notices: Notice[]): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !notices.length) return;
  const sent = new Set(loadSentIds(storageKey));
  const fresh = notices.filter((n) => !sent.has(n.id));
  fresh.forEach((n) => new Notification(n.title, { body: n.body, tag: n.id }));
  if (fresh.length) markSent(storageKey, fresh.map((n) => n.id));
}

export function currentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
