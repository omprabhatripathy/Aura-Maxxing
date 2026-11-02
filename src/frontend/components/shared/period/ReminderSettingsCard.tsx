import Card from '../Card';
import Button from '../Button';
import { Input, Select } from '../ui/Field';
import { Switch } from '../ui/Checkbox';
import IconButton from '../ui/IconButton';
import { useUserData } from '../../../context/useUserData';
import { useAction } from '../../../hooks/useAction';
import { saveSettings } from '../../../../backend/services/profileService';
import { toReminderSettings, type ReminderSettings } from '../../../../backend/period/reminders';
import './period.css';

const DAYS_BEFORE = [1, 2, 3, 5, 7].map((d) => ({ value: String(d), label: `${d} day${d === 1 ? '' : 's'} before` }));

export default function ReminderSettingsCard() {
  const { uid, settingsDoc, preferences } = useUserData();
  const { run } = useAction();
  const settings = toReminderSettings(settingsDoc('periodReminders')?.data);

  function update(patch: Partial<ReminderSettings>) {
    void run('period-reminders', () => saveSettings(uid, 'periodReminders', { ...settings, ...patch }), { error: 'Could not save reminder settings.' });
  }

  function updateCustom(id: string, patch: Partial<ReminderSettings['custom'][number]>) {
    update({ custom: settings.custom.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  }

  return (
    <Card eyebrow="Reminders" title="Cycle reminders">
      <div className="reminders">
        <Switch label="Upcoming period reminder" checked={settings.periodEnabled} onChange={(e) => update({ periodEnabled: e.target.checked })} />
        {settings.periodEnabled && (
          <Select
            aria-label="When to remind before the estimated period"
            options={DAYS_BEFORE}
            value={String(settings.periodDaysBefore)}
            onChange={(v) => update({ periodDaysBefore: Number(v) })}
          />
        )}

        <Switch label="Daily cycle check-in reminder" checked={settings.checkInEnabled} onChange={(e) => update({ checkInEnabled: e.target.checked })} />
        {settings.checkInEnabled && (
          <Input label="Remind me after" type="time" value={settings.checkInTime} onChange={(e) => update({ checkInTime: e.target.value || '20:00' })} />
        )}

        <div className="reminders__custom">
          <span className="ui-field__label">Custom reminders</span>
          {settings.custom.map((c) => (
            <div key={c.id} className="reminders__custom-row">
              <Input aria-label="Reminder label" maxLength={80} placeholder="e.g. Take vitamins" defaultValue={c.label} onBlur={(e) => e.target.value !== c.label && updateCustom(c.id, { label: e.target.value })} />
              <Input aria-label="Reminder time" type="time" value={c.time} onChange={(e) => updateCustom(c.id, { time: e.target.value || '09:00' })} />
              <Switch label={<span className="sr-only">Enabled</span>} checked={c.enabled} onChange={(e) => updateCustom(c.id, { enabled: e.target.checked })} />
              <IconButton label="Remove reminder" size="sm" tone="danger" onClick={() => update({ custom: settings.custom.filter((x) => x.id !== c.id) })}>
                ✕
              </IconButton>
            </div>
          ))}
          <Button type="button" variant="ghost" onClick={() => update({ custom: [...settings.custom, { id: crypto.randomUUID(), label: '', time: '09:00', enabled: true }] })}>
            + Add reminder
          </Button>
        </div>

        <Switch label="Show period details in notifications" checked={settings.showDetails} onChange={(e) => update({ showDetails: e.target.checked })} />
        <p className="text-muted reminders__hint">
          Off by default so lock-screen previews stay private.{' '}
          {preferences.browserNotifications
            ? 'Browser notifications are on (change in Settings).'
            : 'Turn on browser notifications in Settings to receive these outside the app.'}
        </p>
      </div>
    </Card>
  );
}
