import Card from '../Card';
import { EmptyState } from '../ui/Status';

export default function PeriodInsights({ insights }: { insights: string[] }) {
  return (
    <Card eyebrow="Insights" title="From your entries">
      {insights.length === 0 ? (
        <EmptyState>Keep logging — insights only appear once your own data supports them.</EmptyState>
      ) : (
        <ul className="period-insights">
          {insights.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      )}
      <p className="period-chart__note">These observations describe your logs. They are not medical advice or a diagnosis.</p>
    </Card>
  );
}
