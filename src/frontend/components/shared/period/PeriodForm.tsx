import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Modal from '../ui/Modal';
import Button from '../Button';
import { Input, Select, TextArea } from '../ui/Field';
import { Checkbox } from '../ui/Checkbox';
import { ChipToggle, RatingScale } from '../ui/RatingScale';
import { ErrorText } from '../ui/Status';
import { dateRange, formatDate, isValidIso } from '../../../../backend/core/dates';
import type { PeriodEntry } from '../../../../backend/period/cycle';
import { buildPeriodChanges, validatePeriodRange, MAX_PERIOD_DAYS, type PeriodDayInput } from '../../../../backend/period/periodForm';
import type { LogChanges } from '../../../../backend/period/store';
import { FLOW_OPTIONS, type DailyLog, type Flow, type SymptomEntry } from '../../../../backend/period/types';
import './period.css';

interface PeriodFormProps {
  editing: PeriodEntry | null;
  initialStart?: string;
  periods: PeriodEntry[];
  logsByDate: Map<string, DailyLog>;
  knownSymptoms: string[];
  today: string;
  onSubmit: (changes: LogChanges) => Promise<void>;
  onClose: () => void;
}

export default function PeriodForm({ editing, initialStart, periods, logsByDate, knownSymptoms, today, onSubmit, onClose }: PeriodFormProps) {
  const [start, setStart] = useState(editing?.start ?? initialStart ?? today);
  const [end, setEnd] = useState(editing?.end ?? initialStart ?? today);
  const [ongoing, setOngoing] = useState(editing ? editing.end === today : false);
  const [days, setDays] = useState<Record<string, PeriodDayInput>>(() => {
    const initial: Record<string, PeriodDayInput> = {};
    editing?.days.forEach((d) => {
      const p = logsByDate.get(d)?.period;
      if (p) initial[d] = { flow: p.flow, pain: p.pain };
    });
    return initial;
  });
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const effectiveEnd = ongoing ? today : end;
  const rangeError = validatePeriodRange(start, effectiveEnd, today, periods, editing);
  const rangeDays = useMemo(
    () => (!rangeError && isValidIso(start) && isValidIso(effectiveEnd) ? dateRange(start, effectiveEnd) : []),
    [rangeError, start, effectiveEnd]
  );

  function setDay(date: string, patch: Partial<PeriodDayInput>) {
    setDays((prev) => ({ ...prev, [date]: { ...(prev[date] ?? { flow: 'medium', pain: 0 }), ...patch } }));
  }

  function toggleSymptom(name: string) {
    setSymptoms((prev) => (prev.some((s) => s.name === name) ? prev.filter((s) => s.name !== name) : [...prev, { name, severity: 3 }]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (rangeError) {
      setError(rangeError);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(buildPeriodChanges({ start, end: effectiveEnd, days, editing, logsByDate, symptoms, notes }));
      onClose();
    } catch {
      setError('Could not save this period. Please try again.');
      setSaving(false);
    }
  }

  return (
    <Modal eyebrow={editing ? 'Edit period' : 'Log period'} title={editing ? `Period from ${formatDate(editing.start)}` : 'New period'} size="lg" onClose={onClose}>
      <form className="daily-log" onSubmit={handleSubmit} noValidate>
        <div className="daily-log__row">
          <Input label="Start date" type="date" max={today} required value={start} onChange={(e) => setStart(e.target.value)} />
          <Input
            label="End date"
            type="date"
            min={start}
            max={today}
            required
            disabled={ongoing}
            value={effectiveEnd}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        <label className="period-form__ongoing">
          <Checkbox checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} />
          Ongoing (still bleeding today)
        </label>

        <ErrorText>{rangeError && (start || end) ? rangeError : ''}</ErrorText>

        {rangeDays.length > 0 && (
          <fieldset className="daily-log__section">
            <legend className="daily-log__legend">Daily flow &amp; pain ({rangeDays.length} day{rangeDays.length === 1 ? '' : 's'}, max {MAX_PERIOD_DAYS})</legend>
            <div className="period-form__days">
              {rangeDays.map((date) => {
                const value = days[date] ?? { flow: 'medium' as Flow, pain: 0 };
                return (
                  <div key={date} className="period-form__day">
                    <span className="period-form__day-label">{formatDate(date, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <Select aria-label={`Flow on ${date}`} options={FLOW_OPTIONS} value={value.flow} onChange={(flow) => setDay(date, { flow })} />
                    <Input
                      aria-label={`Pain on ${date} (0 to 10)`}
                      type="number"
                      min={0}
                      max={10}
                      value={value.pain}
                      onChange={(e) => setDay(date, { pain: Math.min(10, Math.max(0, Number(e.target.value) || 0)) })}
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-muted period-form__hint">Pain is 0 (none) to 10 (worst).</p>
          </fieldset>
        )}

        <fieldset className="daily-log__section">
          <legend className="daily-log__legend">Symptoms <span className="text-muted">(added to every day in this period)</span></legend>
          <div className="daily-log__chips">
            {knownSymptoms.map((name) => (
              <ChipToggle key={name} active={symptoms.some((s) => s.name === name)} onToggle={() => toggleSymptom(name)}>
                {name}
              </ChipToggle>
            ))}
          </div>
          {symptoms.map((s) => (
            <div key={s.name} className="daily-log__severity">
              <span>{s.name}</span>
              <RatingScale
                label={`${s.name} severity`}
                value={s.severity}
                onChange={(v) => setSymptoms((prev) => prev.map((x) => (x.name === s.name ? { ...x, severity: v ?? 1 } : x)))}
              />
            </div>
          ))}
        </fieldset>

        <TextArea label="Notes" rows={2} maxLength={2000} placeholder="Optional — saved on days without notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <ErrorText>{error}</ErrorText>
        <p className="text-muted period-form__hint">Fine-tune any single day later by tapping it in the calendar.</p>

        <div className="daily-log__actions">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving || Boolean(rangeError)}>{saving ? 'Saving…' : 'Save period'}</Button>
        </div>
      </form>
    </Modal>
  );
}
