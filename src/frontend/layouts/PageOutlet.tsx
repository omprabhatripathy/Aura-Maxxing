import { Outlet, useLocation } from 'react-router-dom';
import ErrorBoundary from '../components/shared/feedback/ErrorBoundary';
import { OfflineBanner } from '../components/shared/feedback/Feedback';
import { useAuth } from '../context/useAuth';

/** Page body shared by the mobile and web shells: offline notice, routed page, local-mode note. */
export default function PageOutlet() {
  const { mode } = useAuth();
  const location = useLocation();
  return (
    <>
      <OfflineBanner cloud={mode === 'firebase'} />
      <ErrorBoundary resetKey={location.pathname}>
        <Outlet />
      </ErrorBoundary>
      {mode === 'local' && (
        <p className="mode-banner app-content__footer-note" role="note">
          Local mode: Firebase isn't configured, so data is stored only in this browser. Add the VITE_FIREBASE_* variables to enable cloud sync.
        </p>
      )}
    </>
  );
}
