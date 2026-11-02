import { useEffect } from 'react';
import { usePeriodData } from '../../../hooks/usePeriodData';
import { useUserData } from '../../../context/useUserData';
import { dueReminders, toReminderSettings } from '../../../../backend/period/reminders';
import { isLogEmpty } from '../../../../backend/period/types';
import { currentTime, deliverNotifications } from '../reminders/notify';

/** Sends opted-in period/check-in notifications while the app is open; each is delivered at most once. */
export default function PeriodReminderRunner() {
  const { prediction, logsByDate, today, loading } = usePeriodData();
  const { uid, settingsDoc, preferences } = useUserData();
  const stored = settingsDoc('periodReminders');

  useEffect(() => {
    if (loading || !preferences.browserNotifications) return;
    const settings = toReminderSettings(stored?.data);
    function check() {
      const todayLog = logsByDate.get(today);
      deliverNotifications(
        uid,
        dueReminders({ settings, today, time: currentTime(), prediction, loggedToday: Boolean(todayLog && !isLogEmpty(todayLog)) })
      );
    }
    check();
    const timer = window.setInterval(check, 60_000);
    return () => window.clearInterval(timer);
  }, [loading, uid, stored, preferences.browserNotifications, logsByDate, prediction, today]);

  return null;
}
