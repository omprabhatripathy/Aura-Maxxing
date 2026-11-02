import { useMemo, useState } from 'react';
import TrendLine from '../charts/TrendLine';
import { Card, ConfirmDialog, EmptyState, Grid, IconButton, MoodIcon, ProgressBar, StatCard } from '../ui';
import { useUserData } from '../../../context/useUserData';
import { useScoreHistory } from '../../../context/useScoreHistory';
import { useAction } from '../../../hooks/useAction';
import { deleteMoodLog } from '../../../../backend/services/journalService';
import { moodDistribution, moodSeries } from '../../../../backend/analytics/metrics';
import { addDays, formatDate, formatDateTime } from '../../../../backend/core/dates';
import type { MoodLog } from '../../../../backend/models';
import { MOOD_META } from '../../../icons/moodMeta';
import '../../../pages/shared/trackers.css';

const avg = (values: number[]) => (values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null);

/** Mood statistics, trend, distribution and an editable timeline. */
export default function MoodOverview({ timeline = true }: { timeline?: boolean }) {
  const { uid, moodLogs, report, today } = useUserData();
  const openHistory = useScoreHistory();
  const { run } = useAction();
  const [deleting, setDeleting] = useState<MoodLog | null>(null);
  const days = useMemo(() => moodSeries(moodLogs, today, 30), [moodLogs, today]);
  const distribution = useMemo(() => moodDistribution(moodLogs, addDays(today, -29), today), [moodLogs, today]);
  const mood7 = avg(moodLogs.filter((m) => m.date > addDays(today, -7)).map((m) => m.score));
  const mood30 = avg(moodLogs.filter((m) => m.date > addDays(today, -30)).map((m) => m.score));

  return (
    <>
      <Grid minItemWidth={160}>
        <StatCard label="7-day average" value={mood7 === null ? '—' : `${mood7}/10`} />
        <StatCard label="30-day average" value={mood30 === null ? '—' : `${mood30}/10`} />
        <StatCard label="Check-ins" value={moodLogs.length} description="All time" />
        <StatCard label="Wellbeing" value={report.wellbeing === null ? '—' : `${report.wellbeing}/100`} description="Last 14 days" onClick={() => openHistory({ kind: 'wellbeing' })} />
      </Grid>
      <Card title="Mood trend · last 30 days">
        {moodLogs.length ? (
          <TrendLine
            labels={days.map((d) => formatDate(d.date))}
            series={[{ label: 'Average mood', values: days.map((d) => d.average) }]}
            min={1}
            max={10}
            ariaLabel="Line chart of daily average mood score; gaps are days without a check-in"
          />
        ) : (
          <EmptyState>Log a mood to see trends.</EmptyState>
        )}
      </Card>
      {distribution.length > 0 && (
        <Card title="Distribution · last 30 days">
          {distribution.map((m) => (
            <ProgressBar key={m.mood} label={MOOD_META[m.mood].label} value={m.percent} suffix="%" />
          ))}
        </Card>
      )}
      {timeline && (
        <Card title="Mood timeline">
          {moodLogs.length === 0 ? (
            <EmptyState>No mood logs yet.</EmptyState>
          ) : (
            <ul className="trackers-page__mood-list">
              {moodLogs.slice(0, 50).map((m) => (
                <li key={m.id}>
                  <MoodIcon mood={m.mood} size={22} />
                  <span>
                    {MOOD_META[m.mood].label} · {m.score}/10{m.source === 'journal' ? ' · from journal' : ''}
                  </span>
                  <span className="text-muted">{formatDateTime(m.createdAt)}</span>
                  <IconButton label="Delete mood log" size="sm" tone="danger" plain onClick={() => setDeleting(m)}>
                    ✕
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete mood log?"
          message={deleting.journalEntryId ? 'This mood is linked to a journal entry; the entry stays but its mood will be cleared.' : 'This check-in will be removed from your trends.'}
          confirmLabel="Delete"
          onConfirm={() => {
            const target = deleting;
            setDeleting(null);
            void run('mood-delete', () => deleteMoodLog(uid, target), { success: 'Mood log deleted.' });
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
