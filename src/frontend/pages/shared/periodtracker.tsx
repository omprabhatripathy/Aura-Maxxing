import { useMemo, useState } from 'react';
import PeriodCalendar from '../../components/shared/period/PeriodCalendar';
import DailyLogEditor from '../../components/shared/period/DailyLogEditor';
import PeriodForm from '../../components/shared/period/PeriodForm';
import PeriodHistory from '../../components/shared/period/PeriodHistory';
import PeriodInsights from '../../components/shared/period/PeriodInsights';
import ReminderSettingsCard from '../../components/shared/period/ReminderSettingsCard';
import MoodTrendChart from '../../components/shared/period/charts/MoodTrendChart';
import MoodDistributionChart from '../../components/shared/period/charts/MoodDistributionChart';
import PhaseMoodChart from '../../components/shared/period/charts/PhaseMoodChart';
import SymptomFrequencyChart from '../../components/shared/period/charts/SymptomFrequencyChart';
import CorrelationChart from '../../components/shared/period/charts/CorrelationChart';
import CycleLengthChart from '../../components/shared/period/charts/CycleLengthChart';
import { Button, Card, ConfirmDialog, Grid, PageHeader, Section, StatCard } from '../../components/shared/ui';
import { ErrorState, PageSkeleton } from '../../components/shared/feedback/Feedback';
import { useToast } from '../../components/shared/feedback/useToast';
import { useUserData } from '../../context/useUserData';
import { usePeriodData } from '../../hooks/usePeriodData';
import { cycleDay, fertileDaySet, predictedDaySet, type PeriodEntry } from '../../../backend/period/cycle';
import { generateInsights } from '../../../backend/period/analytics';
import { buildPeriodDeletion } from '../../../backend/period/periodForm';
import { diffDays, formatDate } from '../../../backend/core/dates';
import { toUserMessage } from '../../../backend/core/errors';
import { dueReminders, toReminderSettings } from '../../../backend/period/reminders';
import { DEFAULT_SYMPTOMS, isLogEmpty, type DailyLog } from '../../../backend/period/types';
import type { LogChanges } from '../../../backend/period/store';
import { currentTime } from '../../components/shared/reminders/notify';
import './periodtracker.css';

export default function PeriodTracker() {
  const { logs, loading, error, retry, apply, today, logsByDate, periods, cycles, stats, prediction } = usePeriodData();
  const { settingsDoc } = useUserData();
  const toast = useToast();

  const [selected, setSelected] = useState(today);
  const [editorDate, setEditorDate] = useState<string | null>(null);
  const [periodForm, setPeriodForm] = useState<{ editing: PeriodEntry | null; start?: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PeriodEntry | null>(null);
  const predicted = useMemo(() => predictedDaySet(prediction), [prediction]);
  const { fertile, ovulation } = useMemo(() => fertileDaySet(prediction), [prediction]);
  const knownSymptoms = useMemo(
    () => [...new Set([...DEFAULT_SYMPTOMS, ...logs.flatMap((l) => l.symptoms.map((s) => s.name))])],
    [logs]
  );
  const loggedSymptoms = useMemo(() => [...new Set(logs.flatMap((l) => l.symptoms.map((s) => s.name)))], [logs]);
  const insights = useMemo(() => generateInsights(logs, periods, cycles, stats, today), [logs, periods, cycles, stats, today]);

  const todayLog = logsByDate.get(today);
  const due = dueReminders({
    settings: toReminderSettings(settingsDoc('periodReminders')?.data),
    today,
    time: currentTime(),
    prediction,
    loggedToday: Boolean(todayLog && !isLogEmpty(todayLog)),
  });

  // Errors propagate to the calling form so it can stay open and show them inline.
  async function run(changes: LogChanges, message: string) {
    await apply(changes);
    toast.success(message);
  }

  async function saveDay(log: DailyLog) {
    await run({ upserts: [log], deletes: [] }, `Saved your log for ${formatDate(log.date)}.`);
  }

  async function deleteDay(date: string) {
    await run({ upserts: [], deletes: [date] }, `Deleted your log for ${formatDate(date)}.`);
  }

  async function confirmDeletePeriod() {
    if (!pendingDelete) return;
    try {
      await run(buildPeriodDeletion(pendingDelete, logsByDate), `Deleted the period from ${formatDate(pendingDelete.start)}.`);
    } catch (e) {
      toast.error(toUserMessage(e, 'Could not delete this period. Please try again.'));
    }
    setPendingDelete(null);
  }

  const currentDay = cycleDay(today, cycles);
  const daysToNext = prediction ? diffDays(today, prediction.nextStart) : null;
  const nextFertile = prediction?.fertileWindows[0];
  const whenText = daysToNext === 0 ? 'Estimated to start today' : `In about ${daysToNext} day${daysToNext === 1 ? '' : 's'}`;
  const confidenceText = prediction
    ? prediction.basedOnCycles < 3
      ? `low confidence — based on ${prediction.basedOnCycles} cycle${prediction.basedOnCycles === 1 ? '' : 's'}`
      : `usually within ±${Math.max(1, Math.ceil(prediction.variation / 2))} days`
    : '';

  return (
    <div className="period-page">
      <PageHeader
        title="Period Tracker"
        subtitle="Log your cycle, moods and symptoms to see patterns in your own data."
        aside={
          <div className="period-page__actions">
            <Button variant="ghost" onClick={() => setEditorDate(today)}>Log today</Button>
            <Button onClick={() => setPeriodForm({ editing: null })}>Log period</Button>
          </div>
        }
      />

      <p className="period-page__disclaimer" role="note">
        Predictions, fertile window and ovulation dates are estimates based on your logged history. They are not guaranteed and must not
        be used as contraception or for medical decisions.
      </p>

      {due.length > 0 && (
        <div className="period-page__reminders" role="status">
          {due.map((d) => (
            <p key={d.id}>{d.body}</p>
          ))}
        </div>
      )}

      {error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : loading ? (
        <PageSkeleton />
      ) : (
        <>
          <Grid minItemWidth={170}>
            <StatCard label="Cycle day" value={currentDay ?? '—'} description={currentDay ? `Since ${formatDate(cycles[cycles.length - 1].start)}` : 'Log a period to start counting'} />
            <StatCard
              label="Next period (estimate)"
              value={prediction ? formatDate(prediction.nextStart) : '—'}
              description={
                !prediction
                  ? 'Log at least two period start dates to see an estimate.'
                  : prediction.overdueSince
                    ? `The earlier estimate (${formatDate(prediction.overdueSince)}) has passed — log your period when it starts.`
                    : `${whenText} · ${confidenceText}`
              }
            />
            <StatCard
              label="Fertile window (estimate)"
              value={nextFertile ? `${formatDate(nextFertile.start)} – ${formatDate(nextFertile.end)}` : '—'}
              description={nextFertile ? `Ovulation estimated ${formatDate(nextFertile.ovulation)}` : 'Needs at least one completed cycle.'}
            />
            <StatCard
              label="Average cycle"
              value={stats.averageCycle !== null ? `${stats.averageCycle} days` : '—'}
              description={prediction ? `Based on ${prediction.basedOnCycles} completed cycle${prediction.basedOnCycles === 1 ? '' : 's'}` : 'No completed cycles yet'}
            />
          </Grid>

          <Card eyebrow="Calendar" title="Your cycle">
            <PeriodCalendar
              today={today}
              selected={selected}
              onSelect={setSelected}
              onOpen={setEditorDate}
              logsByDate={logsByDate}
              predicted={predicted}
              fertile={fertile}
              ovulation={ovulation}
            />
            <p className="period-chart__note">Tap a date (or use arrow keys and Enter) to view or edit that day.</p>
          </Card>

          <Section title="Period history">
            <PeriodHistory
              periods={periods}
              cycles={cycles}
              logsByDate={logsByDate}
              today={today}
              onEdit={(p) => setPeriodForm({ editing: p })}
              onDelete={setPendingDelete}
            />
          </Section>

          <PeriodInsights insights={insights} />

          <Section title="Analytics">
            <div className="period-page__charts">
              <MoodTrendChart cycles={cycles} logsByDate={logsByDate} prediction={prediction} today={today} />
              <MoodDistributionChart logs={logs} cycles={cycles} today={today} />
              <PhaseMoodChart logs={logs} cycles={cycles} prediction={prediction} />
              <SymptomFrequencyChart logs={logs} cycles={cycles} today={today} />
              <CorrelationChart logs={logs} cycles={cycles} today={today} symptoms={loggedSymptoms} />
              <CycleLengthChart cycles={cycles} stats={stats} />
            </div>
          </Section>

          <ReminderSettingsCard />
        </>
      )}

      {editorDate && (
        <DailyLogEditor
          key={editorDate}
          date={editorDate}
          today={today}
          log={logsByDate.get(editorDate)}
          knownSymptoms={knownSymptoms}
          cycleDay={cycleDay(editorDate, cycles)}
          onSave={saveDay}
          onDelete={() => deleteDay(editorDate)}
          onClose={() => setEditorDate(null)}
        />
      )}

      {periodForm && (
        <PeriodForm
          editing={periodForm.editing}
          initialStart={periodForm.start}
          periods={periods}
          logsByDate={logsByDate}
          knownSymptoms={knownSymptoms}
          today={today}
          onSubmit={(changes) => run(changes, periodForm.editing ? 'Period updated.' : 'Period logged.')}
          onClose={() => setPeriodForm(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this period?"
          message={`Period days from ${formatDate(pendingDelete.start)} to ${formatDate(pendingDelete.end)} will be removed. Moods, symptoms and notes on those days are kept.`}
          confirmLabel="Delete"
          onConfirm={confirmDeletePeriod}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
