import Card from '../Card';
import Button from '../Button';
import { Badge } from '../ui/Layout';
import { EmptyState } from '../ui/Status';
import { formatDate } from '../../../../backend/core/dates';
import type { Cycle, PeriodEntry } from '../../../../backend/period/cycle';
import { FLOW_OPTIONS, type DailyLog } from '../../../../backend/period/types';
import './period.css';

interface PeriodHistoryProps {
  periods: PeriodEntry[];
  cycles: Cycle[];
  logsByDate: Map<string, DailyLog>;
  today: string;
  onEdit: (period: PeriodEntry) => void;
  onDelete: (period: PeriodEntry) => void;
}

export default function PeriodHistory({ periods, cycles, logsByDate, today, onEdit, onDelete }: PeriodHistoryProps) {
  if (periods.length === 0) {
    return <EmptyState>No periods logged yet. Use “Log period” to add your first one — past periods help improve estimates.</EmptyState>;
  }
  return (
    <ul className="period-history">
      {[...periods].reverse().map((p) => {
        const cycle = cycles.find((c) => c.start === p.start);
        const heaviest = Math.max(...p.days.map((d) => FLOW_OPTIONS.findIndex((f) => f.value === logsByDate.get(d)?.period?.flow)));
        return (
          <li key={p.start}>
            <Card className="period-history__item">
              <div className="period-history__main">
                <strong>
                  {formatDate(p.start)} – {formatDate(p.end, { month: 'short', day: 'numeric', year: 'numeric' })}
                </strong>
                <div className="period-history__badges">
                  <Badge tone="primary">{p.days.length} day{p.days.length === 1 ? '' : 's'}</Badge>
                  {heaviest >= 0 && <Badge>Heaviest: {FLOW_OPTIONS[heaviest].label}</Badge>}
                  {cycle?.length && <Badge tone={cycle.outlier ? 'danger' : 'default'}>Cycle: {cycle.length} days{cycle.outlier ? ' (possible tracking gap)' : ''}</Badge>}
                  {p.end === today && <Badge tone="success">Ongoing</Badge>}
                </div>
              </div>
              <div className="period-history__actions">
                <Button variant="ghost" onClick={() => onEdit(p)}>Edit</Button>
                <Button variant="ghost" className="daily-log__delete" onClick={() => onDelete(p)}>Delete</Button>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
