import { useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Badge, Button, Card, ErrorText, Grid, Input, StatCard } from '../../components/shared/ui';
import { ErrorState, PageSkeleton } from '../../components/shared/feedback/Feedback';
import { useAuth } from '../../context/useAuth';
import { useUserData } from '../../context/useUserData';
import { useScoreHistory } from '../../context/useScoreHistory';
import { useAction, withInlineErrors } from '../../hooks/useAction';
import { updateUsername, uploadAvatar } from '../../../backend/services/profileService';
import { ACHIEVEMENTS } from '../../../backend/achievements/engine';
import { BADGE_GLOW, STICKER_THEMES, badgeTier, stickerFor } from '../../lib/achievementStickers';
import AchievementBadge from '../../components/shared/AchievementBadge';
import Avatar from '../../components/shared/Avatar';
import { formatDate, isoFromTimestamp } from '../../../backend/core/dates';
import './profile.css';

type BadgeFilter = 'all' | 'legendary' | 'unlocked' | 'locked';

function memberFor(createdAt: string | null): string {
  if (!createdAt) return 'Unknown';
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
  if (days < 1) return 'Joined today';
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'}`;
}

export default function Profile() {
  const { profile } = useAuth();
  const { uid, goals, journalEntries, achievements, report, preferences, progression, loading, error, retry } = useUserData();
  const openHistory = useScoreHistory();
  const { run, isPending } = useAction();
  const [nameDraft, setName] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const name = nameDraft ?? profile?.username ?? '';
  const [nameError, setNameError] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('all');

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (loading || !profile) return <PageSkeleton />;

  const unlocked = new Map(achievements.map((a) => [a.id, a.unlockedAt]));
  const completedGoals = goals.filter((g) => g.status === 'complete').length;

  const total = ACHIEVEMENTS.length;
  const earned = ACHIEVEMENTS.filter((a) => unlocked.has(a.id));
  const legendaryTotal = ACHIEVEMENTS.filter((a) => badgeTier(a.id) === 'legendary').length;
  const earnedLegendary = earned.filter((a) => badgeTier(a.id) === 'legendary').length;
  const earnedStandard = earned.length - earnedLegendary;
  const lockedCount = total - earned.length;
  const xp = progression.xp.total;
  const { level, streaks, productivity } = progression;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  const filters: { value: BadgeFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All badges', count: total },
    { value: 'legendary', label: 'Legendary', count: legendaryTotal },
    { value: 'unlocked', label: 'Unlocked', count: earned.length },
    { value: 'locked', label: 'Locked', count: lockedCount },
  ];
  const shown = ACHIEVEMENTS.filter((a) =>
    badgeFilter === 'all' ? true : badgeFilter === 'legendary' ? badgeTier(a.id) === 'legendary' : badgeFilter === 'unlocked' ? unlocked.has(a.id) : !unlocked.has(a.id)
  );

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (!editingName) return;
    const ok = await withInlineErrors(() => run('name', () => updateUsername(uid, name), { success: 'Name updated.' }), setNameError);
    if (ok) {
      setEditingName(false);
      setName(null);
    }
  }

  function cancelNameEdit() {
    setEditingName(false);
    setName(null);
    setNameError('');
  }

  async function onAvatar(file: File | undefined) {
    if (!file) return;
    await withInlineErrors(() => run('avatar', () => uploadAvatar(uid, file), { success: 'Profile photo updated.', error: 'Could not upload the photo.' }), setAvatarError);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="profile-page">

      <Card className="profile-page__header-card">
        <div className="profile-page__avatar-wrap">
          <Avatar src={profile.photoURL} name={profile.username} email={profile.email} className="profile-page__avatar" fallbackClassName="profile-page__avatar--fallback" />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void onAvatar(e.target.files?.[0])} />
          <Button variant="ghost" disabled={isPending('avatar')} onClick={() => fileRef.current?.click()}>
            {isPending('avatar') ? 'Uploading…' : 'Change photo'}
          </Button>
          <ErrorText>{avatarError}</ErrorText>
        </div>
        <div className="profile-page__details">
          <form className="profile-page__name-form" onSubmit={saveName}>
            <Input
              key={editingName ? 'editing' : 'viewing'}
              label="Display name"
              maxLength={40}
              value={name}
              readOnly={!editingName}
              autoFocus={editingName}
              className={editingName ? '' : 'profile-page__name-input--locked'}
              onChange={(e) => setName(e.target.value)}
            />
            {editingName ? (
              <>
                <Button key="save" type="submit" disabled={isPending('name') || !name.trim() || name.trim() === profile.username}>
                  {isPending('name') ? 'Saving…' : 'Save'}
                </Button>
                <Button type="button" variant="ghost" disabled={isPending('name')} onClick={cancelNameEdit}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button key="edit" type="button" variant="ghost" onClick={() => setEditingName(true)} aria-label="Edit display name">
                Edit
              </Button>
            )}
          </form>
          <ErrorText>{nameError}</ErrorText>
          <p className="text-muted">{profile.email}</p>
          <p className="text-muted">Member for {memberFor(profile.createdAt)}</p>
        </div>
      </Card>

      <section className="progression" aria-label="Account progression">
        <button type="button" className="progression__level" onClick={() => openHistory({ kind: 'aura-points' })} title="See how your XP was earned">
          <span className="progression__badge" aria-hidden="true">
            <small>LVL</small>
            {level.level}
          </span>
          <span className="progression__level-text">
            <span className="progression__rank">{level.rank}</span>
            <strong>{xp.toLocaleString('en-US')} XP</strong>
            <span className="progression__bar" role="progressbar" aria-valuenow={level.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next level">
              <span style={{ width: `${level.progress}%` }} />
            </span>
            <span className="progression__hint">
              {(level.nextLevel - xp).toLocaleString('en-US')} XP to level {level.level + 1} · +{progression.xp.today} today · history ›
            </span>
          </span>
        </button>
        <div className="progression__stats">
          <button type="button" onClick={() => openHistory({ kind: 'aura-score' })}>
            <span>Aura score</span>
            <strong>{report.overall}</strong>
          </button>
          <button type="button" onClick={() => openHistory({ kind: 'streak' })}>
            <span>Longest streak</span>
            <strong>{streaks.activity.longest} d</strong>
          </button>
          <div>
            <span>Achievements</span>
            <strong>
              {progression.achievementCount}/{ACHIEVEMENTS.length}
            </strong>
          </div>
          <div title={`Updated daily (as of ${formatDate(productivity.asOf)}) from 7- and 30-day moving averages`}>
            <span>Productivity</span>
            <strong>
              {productivity.score}
              {productivity.trend !== null && productivity.trend !== 0 && <em className={productivity.trend > 0 ? 'is-up' : 'is-down'}>{productivity.trend > 0 ? `▲${productivity.trend}` : `▼${-productivity.trend}`}</em>}
            </strong>
          </div>
        </div>
        <ul className="progression__streaks" aria-label="Streaks">
          <li>
            🔥 <strong>{streaks.activity.current} d</strong> activity
          </li>
          <li>
            ✅ <strong>{streaks.habit.current}</strong> habit
          </li>
          <li>
            🎯 <strong>{streaks.goal.current} wk</strong> goal
          </li>
          <li>
            📔 <strong>{streaks.journal.current} d</strong> journal
          </li>
        </ul>
      </section>

      <Grid minItemWidth={180}>
        <StatCard label="Overall score" value={`${report.overall}/100`} description="Across tracked Aura areas, last 30 days" onClick={() => openHistory({ kind: 'aura-score' })} />
        <StatCard label="Longest streak" value={`${report.longestStreak} days`} description={`Current: ${report.streak} days`} onClick={() => openHistory({ kind: 'streak' })} />
        <StatCard label="Habit completions" value={progression.xp.ledger.filter((e) => e.source === 'habit').length} onClick={() => openHistory({ kind: 'aura-points' })} />
        <StatCard label="Goals completed" value={completedGoals} description={`of ${goals.length}`} />
        <StatCard label="Journal entries" value={journalEntries.length} />
      </Grid>

      <section className="collector" aria-label="Collector score">
        <div className="collector__top">
          <div>
            <p className="collector__eyebrow">Collector score</p>
            <p className="collector__score">
              {earned.length} / {total} <span>Unlocked ({Math.round(pct(earned.length))}%)</span>
            </p>
          </div>
          <button type="button" className="collector__xp" onClick={() => openHistory({ kind: 'aura-points' })} aria-haspopup="dialog" title="See how your points were earned">
            <span className="collector__eyebrow collector__eyebrow--gold">Total XP</span>
            <span className="collector__xp-value">
              <span aria-hidden="true">⚡</span> {xp.toLocaleString('en-US')} XP
            </span>
            <span className="collector__xp-hint">View history ›</span>
          </button>
        </div>
        <div
          className="collector__bar"
          role="img"
          aria-label={`${earnedStandard} standard and ${earnedLegendary} legendary badges unlocked, ${lockedCount} locked`}
        >
          <span className="collector__seg collector__seg--standard" style={{ width: `${pct(earnedStandard)}%` }} />
          <span className="collector__seg collector__seg--legendary" style={{ width: `${pct(earnedLegendary)}%` }} />
        </div>
        <ul className="collector__legend">
          <li className="collector__legend--standard">{earnedStandard} Standard</li>
          <li className="collector__legend--legendary">{earnedLegendary} Legendary</li>
          <li className="collector__legend--locked">{lockedCount} Locked</li>
        </ul>
      </section>

      <div className="collector__filters" role="group" aria-label="Filter badges">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`collector__filter collector__filter--${f.value}${badgeFilter === f.value ? ' is-active' : ''}`}
            aria-pressed={badgeFilter === f.value}
            onClick={() => setBadgeFilter(f.value)}
          >
            <span className="collector__filter-dot" aria-hidden="true" />
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      <Card eyebrow="Achievements" title={`${unlocked.size} of ${ACHIEVEMENTS.length} unlocked`}>
        <ul className="profile-page__sticker-legend" aria-label="Sticker colours">
          {Object.values(STICKER_THEMES).map((t) => (
            <li key={t.label} style={{ '--ach-color': t.color } as CSSProperties}>
              {t.label}
            </li>
          ))}
        </ul>
        <ul className="profile-page__achievements">
          {shown.length === 0 && <li className="text-muted">No badges here yet.</li>}
          {shown.map((a, i) => {
            const at = unlocked.get(a.id);
            const sticker = stickerFor(a.id);
            return (
              <li
                key={a.id}
                className={`profile-page__achievement ${at ? 'profile-page__achievement--earned' : ''}`}
                style={{ '--ach-color': sticker.color, '--badge-glow': BADGE_GLOW[a.id] ?? sticker.color, '--ach-tilt': `${i % 2 ? 6 : -6}deg` } as CSSProperties}
              >
                <AchievementBadge id={a.id} mode={preferences.theme} className="profile-page__sticker" label={`${a.title} badge${at ? '' : ' (locked)'}`} />
                <strong>{a.title}</strong>
                <span className="text-muted">{a.description}</span>
                {at ? <Badge tone="success">Unlocked {formatDate(isoFromTimestamp(at))}</Badge> : <Badge>Locked</Badge>}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
