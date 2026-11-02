import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, SegmentedControl } from '../../components/shared/ui';
import { ErrorState, PageSkeleton } from '../../components/shared/feedback/Feedback';
import AnalyticsOverview from '../../components/shared/analytics/AnalyticsOverview';
import { useUserData } from '../../context/useUserData';
import Monthly from './monthly';
import Yearly from './yearly';
import './trackers.css';

type Tab = 'overview' | 'monthly' | 'yearly';

const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Trends & insights' },
  { value: 'monthly', label: 'Monthly report' },
  { value: 'yearly', label: 'Yearly report' },
];

export default function Analytics({ beforeTabs }: { beforeTabs?: ReactNode }) {
  const { loading, error, retry } = useUserData();
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = TABS.some((t) => t.value === requested) ? (requested as Tab) : 'overview';

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (loading) return <PageSkeleton />;

  return (
    <div className={`trackers-page${beforeTabs ? ' analytics-page--web' : ''}`}>
      <PageHeader title="Analytics" subtitle="Reports, trends, statistics and predictions across your whole Aura." />
      {beforeTabs}
      <SegmentedControl ariaLabel="Analytics view" options={TABS} value={tab} onChange={(t) => setParams({ tab: t })} />
      {tab === 'overview' && <AnalyticsOverview />}
      {tab === 'monthly' && <Monthly />}
      {tab === 'yearly' && <Yearly />}
    </div>
  );
}
