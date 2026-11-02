import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useUserData } from '../../context/useUserData';
import { useAction } from '../../hooks/useAction';
import { savePreferences } from '../../../backend/services/profileService';
import Avatar from './Avatar';
import './UserProfile.css';

export default function UserProfile() {
  const { profile } = useAuth();
  const { uid, preferences } = useUserData();
  const { run } = useAction();

  if (!profile) return null;

  const isLight = preferences.theme === 'light';
  const toggleTheme = () => {
    const theme = isLight ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aura-theme', theme);
    void run('theme', () => savePreferences(uid, { theme }), { error: 'Could not save your theme.' });
  };

  return (
    <div className="user-profile">
      <button
        type="button"
        role="switch"
        aria-checked={isLight}
        aria-label="Light theme"
        title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
        className={`theme-switch${isLight ? ' is-light' : ''}`}
        onClick={toggleTheme}
      >
        <span className="theme-switch__icon theme-switch__icon--moon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>
        </span>
        <span className="theme-switch__icon theme-switch__icon--sun" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        </span>
        <span className="theme-switch__knob" aria-hidden="true" />
      </button>
      <Link to="/profile" className="user-profile__link" aria-label="Open your profile">
        <Avatar src={profile.photoURL} name={profile.username} email={profile.email} className="user-profile__avatar" fallbackClassName="user-profile__avatar--fallback" />
      </Link>
    </div>
  );
}
