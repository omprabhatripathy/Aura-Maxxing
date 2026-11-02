import Analytics from '../shared/analytics';
import AnalyticsPatterns from '../../components/web/AnalyticsPatterns';

/** Desktop analytics: filters, comparisons, heatmap and patterns above the shared reports. */
export default function DesktopAnalytics() {
  return <Analytics beforeTabs={<AnalyticsPatterns />} />;
}
