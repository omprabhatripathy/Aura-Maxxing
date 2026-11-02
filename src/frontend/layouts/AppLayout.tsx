import { lazy, Suspense, useState } from 'react';
import { useLocation } from 'react-router-dom';
import GenderPrompt from '../components/shared/GenderPrompt';
import AchievementUnlocked from '../components/shared/AchievementUnlocked';
import ScoreHistoryProvider from '../components/shared/scores/ScoreHistoryProvider';
import PeriodReminderRunner from '../components/shared/period/PeriodReminderRunner';
import AppReminderRunner from '../components/shared/reminders/AppReminderRunner';
import ScheduleReminderRunner from '../components/shared/reminders/ScheduleReminderRunner';
import { PageSkeleton } from '../components/shared/feedback/Feedback';
import { useAuth } from '../context/useAuth';
import { TodoProvider } from '../context/TodoContext';
import { HeaderSlotContext } from '../context/useHeaderSlot';
import { useDevice } from '../hooks/useDevice';
import { labelForSegment } from '../lib/routes';
import MobileShell from './MobileShell';

// Desktop chrome (sidebar, framer-motion, web styles) is a separate chunk phones never download.
const WebShell = lazy(() => import('./WebShell'));

export default function AppLayout() {
  const { gender } = useAuth();
  const location = useLocation();
  const device = useDevice();
  const title = labelForSegment(location.pathname.split('/')[1] ?? '');
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);

  const extras = (
    <>
      <GenderPrompt />
      <AchievementUnlocked />
      <AppReminderRunner />
      <ScheduleReminderRunner />
      {gender === 'female' && <PeriodReminderRunner />}
    </>
  );

  return (
    <TodoProvider>
      <ScoreHistoryProvider>
      <HeaderSlotContext.Provider value={headerSlot}>
        {device === 'mobile' ? (
          <MobileShell title={title} setHeaderSlot={setHeaderSlot}>
            {extras}
          </MobileShell>
        ) : (
          <Suspense fallback={<PageSkeleton cards={4} />}>
            <WebShell title={title} device={device} setHeaderSlot={setHeaderSlot}>
              {extras}
            </WebShell>
          </Suspense>
        )}
      </HeaderSlotContext.Provider>
      </ScoreHistoryProvider>
    </TodoProvider>
  );
}
