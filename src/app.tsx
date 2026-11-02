import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './frontend/context/useAuth';
import { PageSkeleton } from './frontend/components/shared/feedback/Feedback';

import AppLayout from './frontend/layouts/AppLayout';
import ProtectedRoute from './frontend/layouts/ProtectedRoute';
import ResponsivePage from './frontend/layouts/ResponsivePage';

import MobileDashboard from './frontend/pages/mobile/MobileDashboard';
import Habits from './frontend/pages/shared/habits';
import Goals from './frontend/pages/shared/goals';
import Journal from './frontend/pages/shared/journal';

// Route-based chunks: heavier / less frequent pages load on demand.
const Todo = lazy(() => import('./frontend/pages/shared/todo'));
const Profile = lazy(() => import('./frontend/pages/shared/profile'));
const Settings = lazy(() => import('./frontend/pages/shared/settings'));
const Trackers = lazy(() => import('./frontend/pages/shared/trackers'));
const Analytics = lazy(() => import('./frontend/pages/shared/analytics'));
const HealthHub = lazy(() => import('./frontend/pages/shared/health'));
const Pomodoro = lazy(() => import('./frontend/pages/shared/pomodoro'));
const Expenses = lazy(() => import('./frontend/pages/shared/expenses'));
const Schedule = lazy(() => import('./frontend/pages/shared/schedule'));

// Web-only presentations (tablet + desktop).
const DesktopDashboard = lazy(() => import('./frontend/pages/web/DesktopDashboard'));
const DesktopAnalytics = lazy(() => import('./frontend/pages/web/DesktopAnalytics'));

import Login from './frontend/pages/shared/auth/login';
import Register from './frontend/pages/shared/auth/register';

const page = (node: ReactNode, cards = 4) => <Suspense fallback={<PageSkeleton cards={cards} />}>{node}</Suspense>;

/** Signed-in users skip the login/register screens. */
function PublicOnly() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : <Outlet />;
}

function NotFound() {
  return (
    <div className="error-state">
      <h2 className="text-headline-md">Page not found</h2>
      <p className="text-muted">That page doesn't exist.</p>
      <Link to="/">Go to the dashboard</Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<ResponsivePage mobile={MobileDashboard} web={DesktopDashboard} />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/todo" element={page(<Todo />)} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/profile" element={page(<Profile />)} />
            <Route path="/settings" element={page(<Settings />)} />
            <Route path="/analytics" element={page(<ResponsivePage mobile={Analytics} web={DesktopAnalytics} />)} />
            <Route path="/health" element={page(<HealthHub />)} />
            <Route path="/pomodoro" element={page(<Pomodoro />)} />
            <Route path="/expenses" element={page(<Expenses />)} />
            <Route path="/schedule" element={page(<Schedule />)} />
            {/* Retired routes now live inside Analytics and the Health Hub. */}
            <Route path="/monthly" element={<Navigate to="/analytics?tab=monthly" replace />} />
            <Route path="/yearly" element={<Navigate to="/analytics?tab=yearly" replace />} />
            <Route path="/trackers" element={page(<Trackers />)} />
            <Route path="/period-tracker" element={<Navigate to="/health?tab=cycle" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

