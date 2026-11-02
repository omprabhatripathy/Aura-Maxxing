import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import AchievementBadge from './AchievementBadge';
import { useUserData } from '../../context/useUserData';
import { onAchievementsUnlocked } from '../../lib/achievementEvents';
import { BADGE_GLOW, BADGE_XP, badgeTier, stickerFor } from '../../lib/achievementStickers';
import type { AchievementDefinition } from '../../../backend/achievements/engine';
import './AchievementUnlocked.css';

const AUTO_CLOSE_MS = 7000;
const SPARKS = Array.from({ length: 14 }, (_, i) => i);

/** Real-time celebration pop-up; queues multiple unlocks and shows them one at a time. */
export default function AchievementUnlocked() {
  const { preferences } = useUserData();
  const [queue, setQueue] = useState<AchievementDefinition[]>([]);
  const current = queue[0];

  useEffect(() => onAchievementsUnlocked((earned) => setQueue((q) => [...q, ...earned])), []);

  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(() => setQueue((q) => q.slice(1)), AUTO_CLOSE_MS);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setQueue((q) => q.slice(1));
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
    };
  }, [current]);

  if (!current) return null;

  const tier = badgeTier(current.id);
  const color = BADGE_GLOW[current.id] ?? stickerFor(current.id).color;
  const dismiss = () => setQueue((q) => q.slice(1));

  return createPortal(
    <div className="ach-pop" role="presentation" onClick={dismiss}>
      <div
        key={current.id}
        className={`ach-pop__card ach-pop__card--${tier}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ach-pop-title"
        aria-describedby="ach-pop-desc"
        style={{ '--ach-glow': color } as CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ach-pop__sparks" aria-hidden="true">
          {SPARKS.map((i) => (
            <span key={i} style={{ '--i': i } as CSSProperties} />
          ))}
        </div>
        <p className="ach-pop__eyebrow">{tier === 'legendary' ? 'Legendary achievement unlocked' : 'Achievement unlocked'}</p>
        <div className="ach-pop__badge-wrap">
          <AchievementBadge id={current.id} mode={preferences.theme} className="ach-pop__badge" label={`${current.title} badge`} />
        </div>
        <h2 id="ach-pop-title" className="ach-pop__title">
          {current.title}
        </h2>
        <p id="ach-pop-desc" className="ach-pop__desc">
          {current.description}
        </p>
        <span className="ach-pop__xp">⚡ +{BADGE_XP[tier]} Aura points</span>
        <div className="ach-pop__actions">
          <Link to="/profile" className="ach-pop__link" onClick={dismiss}>
            View badges
          </Link>
          <button type="button" className="ach-pop__btn" onClick={dismiss} autoFocus>
            {queue.length > 1 ? `Next (${queue.length - 1} more)` : 'Awesome!'}
          </button>
        </div>
        <span className="ach-pop__timer" aria-hidden="true" style={{ animationDuration: `${AUTO_CLOSE_MS}ms` }} />
      </div>
    </div>,
    document.body
  );
}
