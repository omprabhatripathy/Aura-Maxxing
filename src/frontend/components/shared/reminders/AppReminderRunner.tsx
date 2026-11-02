import { useEffect } from 'react';
import { useUserData } from '../../../context/useUserData';
import { isDone } from '../../../../backend/analytics/habits';
import { currentTime, deliverNotifications, type Notice } from './notify';

/** Habit and journal reminders configured in Settings; runs while the app is open. */
export default function AppReminderRunner() {
  const { uid, loading, preferences, habits, logsByHabit, journalEntries, today } = useUserData();

  useEffect(() => {
    if (loading || !preferences.browserNotifications) return;
    function check() {
      const time = currentTime();
      const notices: Notice[] = [];
      const pending = habits.filter((h) => !h.archived && !isDone(h, logsByHabit, today));
      if (preferences.habitReminder && time >= preferences.habitReminderTime && pending.length) {
        notices.push({ id: `habits-${today}`, title: 'Aura reminder', body: `You have ${pending.length} habit${pending.length === 1 ? '' : 's'} left today.` });
      }
      if (preferences.journalReminder && time >= preferences.journalReminderTime && !journalEntries.some((e) => e.date === today)) {
        notices.push({ id: `journal-${today}`, title: 'Aura reminder', body: 'Take a minute to write in your journal.' });
      }
      deliverNotifications(uid, notices);
    }
    check();
    const timer = window.setInterval(check, 60_000);
    return () => window.clearInterval(timer);
  }, [uid, loading, preferences, habits, logsByHabit, journalEntries, today]);

  return null;
}
