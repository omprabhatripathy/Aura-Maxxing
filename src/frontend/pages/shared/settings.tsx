import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, ConfirmDialog, ErrorText, Input, PageHeader, SegmentedControl, Switch } from '../../components/shared/ui';
import { ErrorState, PageSkeleton } from '../../components/shared/feedback/Feedback';
import { useAuth, type Gender } from '../../context/useAuth';
import { useUserData } from '../../context/useUserData';
import { useAction } from '../../hooks/useAction';
import { savePreferences } from '../../../backend/services/profileService';
import { deleteAllUserData, exportUserData } from '../../../backend/services/systemService';
import type { Preferences, Theme } from '../../../backend/models';
import './settings.css';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
];

export default function Settings() {
  const { profile, logout, gender, setGender, mode } = useAuth();
  const { uid, preferences, loading, error, retry } = useUserData();
  const { run, isPending } = useAction();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [permission, setPermission] = useState(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission));

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (loading) return <PageSkeleton cards={2} />;

  function update(patch: Partial<Preferences>) {
    if (patch.theme) document.documentElement.setAttribute('data-theme', patch.theme);
    void run('prefs', () => savePreferences(uid, patch), { error: 'Could not save your settings.' });
  }

  async function toggleNotifications(on: boolean) {
    if (on && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      setPermission(await Notification.requestPermission());
    }
    update({ browserNotifications: on });
  }

  async function handleExport() {
    await run(
      'export',
      async () => {
        const blob = await exportUserData(uid);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aura-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      { success: 'Your data export has downloaded.', error: 'Export failed.' }
    );
  }

  return (
    <div className="settings-page">
      <PageHeader title="Settings" subtitle="Saved to your account and synced across devices." />

      <Card eyebrow="Appearance" title="Theme">
        <SegmentedControl ariaLabel="Theme" options={THEME_OPTIONS} value={preferences.theme} onChange={(theme) => update({ theme })} />
      </Card>

      <Card eyebrow="Personalisation" title="Gender">
        <p className="text-muted">Enables the Period Tracker for female users.</p>
        <SegmentedControl ariaLabel="Gender" options={GENDER_OPTIONS} value={gender} onChange={(g) => void run('gender', () => setGender(g), { success: 'Saved.' })} />
      </Card>

      <Card eyebrow="Notifications" title="Reminders">
        <Switch label="Browser notifications" checked={preferences.browserNotifications} onChange={(e) => void toggleNotifications(e.target.checked)} />
        {preferences.browserNotifications && permission !== 'granted' && (
          <ErrorText>
            {permission === 'unsupported' ? 'This browser does not support notifications.' : 'Notifications are blocked for this site. Allow them in your browser settings.'}
          </ErrorText>
        )}
        <Switch label="Remind me about unfinished habits" checked={preferences.habitReminder} onChange={(e) => update({ habitReminder: e.target.checked })} />
        {preferences.habitReminder && (
          <Input label="Habit reminder after" type="time" value={preferences.habitReminderTime} onChange={(e) => e.target.value && update({ habitReminderTime: e.target.value })} />
        )}
        <Switch label="Journal prompt if I haven't written today" checked={preferences.journalReminder} onChange={(e) => update({ journalReminder: e.target.checked })} />
        {preferences.journalReminder && (
          <Input label="Journal prompt after" type="time" value={preferences.journalReminderTime} onChange={(e) => e.target.value && update({ journalReminderTime: e.target.value })} />
        )}
        <p className="text-muted settings-page__hint">Reminders are delivered while Aura is open in a browser tab, at most once per day each.</p>
      </Card>

      <Card eyebrow="Your data" title="Export & delete">
        <p className="text-muted">
          {mode === 'firebase' ? 'Your data is stored in your private Firebase account space.' : 'Local mode: your data is stored only in this browser.'}
        </p>
        <div className="settings-page__actions">
          <Button variant="ghost" disabled={isPending('export')} onClick={() => void handleExport()}>
            {isPending('export') ? 'Preparing…' : 'Export my data (JSON)'}
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete all my data
          </Button>
        </div>
      </Card>

      <Card eyebrow="Account" title="Session">
        <p className="text-muted">Signed in as {profile?.email}</p>
        <Button variant="ghost" onClick={() => setConfirmLogout(true)}>
          Log out
        </Button>
      </Card>

      {confirmLogout && (
        <ConfirmDialog
          title="Log out?"
          message="Are you sure you want to log out of your account?"
          confirmLabel="Log out"
          onConfirm={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
          onCancel={() => setConfirmLogout(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete all data permanently?"
          message="Habits, goals, journal entries, moods, cycle logs, history and achievements will be erased. This cannot be undone. Type DELETE below to confirm."
          confirmLabel={isPending('wipe') ? 'Deleting…' : 'Delete everything'}
          onConfirm={() => {
            if (deleteText !== 'DELETE') return;
            void run('wipe', () => deleteAllUserData(uid), { success: 'All your data was deleted.' }).then(() => setConfirmDelete(false));
          }}
          onCancel={() => {
            setConfirmDelete(false);
            setDeleteText('');
          }}
        >
          <Input aria-label="Type DELETE to confirm" placeholder="DELETE" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} />
        </ConfirmDialog>
      )}
    </div>
  );
}
