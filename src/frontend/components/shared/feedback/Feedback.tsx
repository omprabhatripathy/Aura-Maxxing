import Button from '../Button';
import { useOnline } from '../../../hooks/useOnline';
import './feedback.css';

export function Skeleton({ height = 16, width = '100%', radius }: { height?: number | string; width?: number | string; radius?: string }) {
  return <span className="skeleton" style={{ height, width, borderRadius: radius }} aria-hidden="true" />;
}

/** Placeholder layout shown while a page's data streams in. */
export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="page-skeleton" role="status" aria-label="Loading">
      <Skeleton height={36} width="45%" />
      <Skeleton height={16} width="70%" />
      <div className="page-skeleton__grid">
        {Array.from({ length: cards }, (_, i) => (
          <Skeleton key={i} height={120} radius="var(--radius-lg)" />
        ))}
      </div>
      <Skeleton height={220} radius="var(--radius-lg)" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <p>{message}</p>
      {onRetry && <Button onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function OfflineBanner({ cloud }: { cloud: boolean }) {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      {cloud ? "You're offline. Changes are saved on this device and will sync when you reconnect." : "You're offline."}
    </div>
  );
}
