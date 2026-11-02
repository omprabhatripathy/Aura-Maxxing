import { useState } from 'react';
import type { FormEvent } from 'react';
import Modal from '../ui/Modal';
import Button from '../Button';
import { Input, Select, TextArea } from '../ui/Field';
import { ChipToggle, RatingScale } from '../ui/RatingScale';
import { Switch } from '../ui/Checkbox';
import { ErrorText } from '../ui/Status';
import CycleMoodIcon from '../../../icons/CycleMoodIcon';
import { formatDate } from '../../../../backend/core/dates';
import {
  CYCLE_MOOD_LABEL,
  CYCLE_MOODS,
  FLOW_OPTIONS,
  emptyLog,
  type CycleMood,
  type DailyLog,
  type Flow,
} from '../../../../backend/period/types';
import './period.css';

interface DailyLogEditorProps {
  date: string;
  today: string;
  log: DailyLog | undefined;
  knownSymptoms: string[];
  cycleDay: number | null;
  onSave: (log: DailyLog) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

export default function DailyLogEditor({ date, today, log, knownSymptoms, cycleDay, onSave, onDelete, onClose }: DailyLogEditorProps) {
  const [draft, setDraft] = useState<DailyLog>(() => (log ? structuredClone(log) : emptyLog(date)));
  const [customSymptom, setCustomSymptom] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isFuture = date > today;
  const symptomOptions = [...new Set([...knownSymptoms, ...draft.symptoms.map((s) => s.name)])];

  function update(patch: Partial<DailyLog>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function toggleMood(mood: CycleMood) {
    update({ moods: draft.moods.includes(mood) ? draft.moods.filter((m) => m !== mood) : [...draft.moods, mood] });
  }

  function toggleSymptom(name: string) {
    const exists = draft.symptoms.some((s) => s.name === name);
    update({ symptoms: exists ? draft.symptoms.filter((s) => s.name !== name) : [...draft.symptoms, { name, severity: 3 }] });
  }

  function setSeverity(name: string, severity: number | undefined) {
    update({ symptoms: draft.symptoms.map((s) => (s.name === name ? { ...s, severity: severity ?? 1 } : s)) });
  }

  function addCustomSymptom() {
    const name = customSymptom.trim().slice(0, 40);
    if (!name) return;
    const normalized = symptomOptions.find((s) => s.toLowerCase() === name.toLowerCase()) ?? name;
    if (!draft.symptoms.some((s) => s.name === normalized)) {
      update({ symptoms: [...draft.symptoms, { name: normalized, severity: 3 }] });
    }
    setCustomSymptom('');
  }

  function togglePeriod(on: boolean) {
    update({ period: on ? { isPeriodDay: true, flow: draft.period?.flow ?? 'medium', pain: draft.period?.pain ?? 0 } : undefined });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isFuture) {
      setError("You can't log entries for a future date.");
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ ...draft, notes: draft.notes?.trim() || undefined });
      onClose();
    } catch {
      setError('Could not save this log. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await onDelete();
      onClose();
    } catch {
      setError('Could not delete this log. Please try again.');
      setSaving(false);
    }
  }

  const title = formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  if (confirmDelete) {
    return (
      <Modal
        title="Delete this day's log?"
        size="sm"
        role="alertdialog"
        onClose={() => setConfirmDelete(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" disabled={saving} onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-muted">Period, mood, symptoms and notes for {title} will be removed from your calendar and charts.</p>
      </Modal>
    );
  }

  return (
    <Modal eyebrow={cycleDay ? `Cycle day ${cycleDay}` : 'Daily log'} title={title} size="lg" onClose={onClose}>
      <form className="daily-log" onSubmit={handleSubmit}>
        {isFuture && <ErrorText>This date is in the future. You can view it, but logs can only be saved for today or earlier.</ErrorText>}

        <fieldset className="daily-log__section" disabled={isFuture}>
          <legend className="daily-log__legend">Period</legend>
          <Switch label="Period day" checked={Boolean(draft.period?.isPeriodDay)} onChange={(e) => togglePeriod(e.target.checked)} />
          {draft.period && (
            <div className="daily-log__row">
              <Select
                label="Flow"
                options={FLOW_OPTIONS}
                value={draft.period.flow}
                onChange={(flow: Flow) => update({ period: { ...draft.period!, flow } })}
              />
              <Input
                label={`Pain (0–10): ${draft.period.pain}`}
                type="range"
                min={0}
                max={10}
                value={draft.period.pain}
                onChange={(e) => update({ period: { ...draft.period!, pain: Number(e.target.value) } })}
              />
            </div>
          )}
        </fieldset>

        <fieldset className="daily-log__section" disabled={isFuture}>
          <legend className="daily-log__legend">Mood <span className="text-muted">(select all that apply)</span></legend>
          <div className="daily-log__moods">
            {CYCLE_MOODS.map((mood) => (
              <ChipToggle key={mood} active={draft.moods.includes(mood)} onToggle={() => toggleMood(mood)} className="daily-log__mood">
                <CycleMoodIcon mood={mood} size={24} />
                {CYCLE_MOOD_LABEL[mood]}
              </ChipToggle>
            ))}
          </div>
          <div className="daily-log__ratings">
            <div>
              <span className="ui-field__label">Mood intensity</span>
              <RatingScale label="Mood intensity" value={draft.moodIntensity} onChange={(v) => update({ moodIntensity: v })} />
            </div>
            <div>
              <span className="ui-field__label">Energy</span>
              <RatingScale label="Energy level" value={draft.energyLevel} onChange={(v) => update({ energyLevel: v })} />
            </div>
            <div>
              <span className="ui-field__label">Stress</span>
              <RatingScale label="Stress level" value={draft.stressLevel} onChange={(v) => update({ stressLevel: v })} />
            </div>
          </div>
        </fieldset>

        <fieldset className="daily-log__section" disabled={isFuture}>
          <legend className="daily-log__legend">Symptoms</legend>
          <div className="daily-log__chips">
            {symptomOptions.map((name) => (
              <ChipToggle key={name} active={draft.symptoms.some((s) => s.name === name)} onToggle={() => toggleSymptom(name)}>
                {name}
              </ChipToggle>
            ))}
          </div>
          <div className="daily-log__custom">
            <Input
              placeholder="Other symptom…"
              maxLength={40}
              value={customSymptom}
              onChange={(e) => setCustomSymptom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomSymptom();
                }
              }}
            />
            <Button type="button" variant="ghost" onClick={addCustomSymptom}>Add</Button>
          </div>
          {draft.symptoms.length > 0 && (
            <div className="daily-log__severities">
              {draft.symptoms.map((s) => (
                <div key={s.name} className="daily-log__severity">
                  <span>{s.name}</span>
                  <RatingScale label={`${s.name} severity`} value={s.severity} onChange={(v) => setSeverity(s.name, v)} />
                </div>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset className="daily-log__section" disabled={isFuture}>
          <legend className="daily-log__legend">Notes</legend>
          <TextArea rows={3} maxLength={2000} placeholder="Optional private notes" value={draft.notes ?? ''} onChange={(e) => update({ notes: e.target.value })} />
        </fieldset>

        <ErrorText>{error}</ErrorText>

        <div className="daily-log__actions">
          {log && (
            <Button type="button" variant="ghost" className="daily-log__delete" onClick={() => setConfirmDelete(true)}>
              Delete log
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving || isFuture}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  );
}
