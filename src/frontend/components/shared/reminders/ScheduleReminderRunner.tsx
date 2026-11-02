import { useEffect } from 'react';
import { useUserData } from '../../../context/useUserData';
import { useToast } from '../feedback/useToast';
import { occurrencesOn } from '../../../../backend/schedule/analytics';
import { toMinutes } from '../../../../backend/schedule/model';
import { deliverNotifications, type Notice } from './notify';

const SHOWN_KEY = 'aura-schedule-reminders-shown';

/** In-app (and, if enabled, browser) reminders for time blocks; runs while the app is open. */
export default function ScheduleReminderRunner() {
  const { uid, loading, schedule, today, preferences } = useUserData();
  const toast = useToast();

  useEffect(() => {
    if (loading) return;
    function check() {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const shown = new Set<string>(JSON.parse(sessionStorage.getItem(SHOWN_KEY) ?? '[]'));
      const due: Notice[] = occurrencesOn(schedule, today)
        .filter((o) => !o.done && o.item.reminderMinutes !== null)
        .filter((o) => {
          const start = toMinutes(o.start);
          return minutes >= start - (o.item.reminderMinutes ?? 0) && minutes < start + 5;
        })
        .map((o) => ({ id: `schedule-${o.item.id}-${today}`, title: `⏰ ${o.item.title}`, body: o.item.reminderMinutes ? `Starts at ${o.start} (in ${Math.max(0, toMinutes(o.start) - minutes)} min)` : `Starting now (${o.start}–${o.end})` }));
      const fresh = due.filter((n) => !shown.has(n.id));
      fresh.forEach((n) => toast.info(`${n.title} — ${n.body}`));
      if (fresh.length) sessionStorage.setItem(SHOWN_KEY, JSON.stringify([...shown, ...fresh.map((n) => n.id)].slice(-200)));
      if (preferences.browserNotifications) deliverNotifications(`${uid}-schedule`, due);
    }
    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [uid, loading, schedule, today, preferences.browserNotifications, toast]);

  return null;
}
