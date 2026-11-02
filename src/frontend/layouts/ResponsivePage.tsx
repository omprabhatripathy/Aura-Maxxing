import { Suspense } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import { PageSkeleton } from '../components/shared/feedback/Feedback';
import { useDevice } from '../hooks/useDevice';

interface Props {
  mobile: ComponentType;
  /** Tablet + desktop presentation; lazy so phones never download it. */
  web: LazyExoticComponent<ComponentType> | ComponentType;
}

/** Picks the presentation layer for the current device; both share the same data hooks. */
export default function ResponsivePage({ mobile: Mobile, web: Web }: Props) {
  const device = useDevice();
  if (device === 'mobile') return <Mobile />;
  return (
    <Suspense fallback={<PageSkeleton cards={6} />}>
      <Web />
    </Suspense>
  );
}
