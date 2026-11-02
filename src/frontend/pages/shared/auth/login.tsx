import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../context/useAuth';
import { LOCAL_DEMO } from '../../../../backend/auth/authService';
import { EyeIcon, EyeOffIcon } from '../../../components/shared/icons';
import './auth.css';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<'email' | 'google' | 'reset' | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { message?: string; from?: string } | null;
  const { login, loginWithGoogle, resetPassword, googleAvailable, mode } = useAuth();

  async function attempt(kind: 'email' | 'google', action: () => Promise<void>) {
    setError('');
    setNotice('');
    setBusy(kind);
    try {
      await action();
      navigate(state?.from ?? '/', { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleReset() {
    setError('');
    setNotice('');
    setBusy('reset');
    try {
      await resetPassword(identifier);
      setNotice('If an account exists for that email, a reset link is on its way.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const isNumber = /^\d+$/.test(identifier);

  return (
    <div className="auth-container surface-level-2-glass">
      <h2 className="auth-title">Login</h2>

      {state?.message && <p className="auth-hint">{state.message}</p>}
      {mode === 'local' && (
        <p className="auth-hint">
          Local mode demo account: {LOCAL_DEMO.email} / {LOCAL_DEMO.password}
        </p>
      )}

      <form onSubmit={(e: FormEvent) => { e.preventDefault(); void attempt('email', () => login(identifier, password)); }} className="auth-form" noValidate>
        <input
          type="text"
          autoComplete="username"
          inputMode={isNumber ? 'numeric' : 'email'}
          placeholder="Email or mobile number"
          aria-label="Email or mobile number"
          value={identifier}
          // Numbers are capped at 10 digits; anything else is treated as an email.
          onChange={(e) => setIdentifier(/^\d*$/.test(e.target.value) ? e.target.value.slice(0, 10) : e.target.value)}
          className="auth-input"
          required
        />

        <div className="auth-input-group">
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Password"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            required
          />
          <button type="button" className="auth-input-group__toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}
        {notice && <p className="auth-hint" role="status">{notice}</p>}

        <button type="submit" className="auth-button" disabled={busy !== null}>
          {busy === 'email' ? 'Signing in…' : 'Login'}
        </button>
        {googleAvailable && (
          <button type="button" className="auth-link-button" onClick={handleReset} disabled={busy !== null}>
            {busy === 'reset' ? 'Sending…' : 'Forgot password?'}
          </button>
        )}
      </form>

      <div className="auth-divider">
        <span>or</span>
      </div>

      {!googleAvailable && <p className="auth-hint">Google sign-in needs Firebase: add the VITE_FIREBASE_* keys to .env and enable the Google provider.</p>}

      <button type="button" onClick={() => void attempt('google', loginWithGoogle)} className="auth-button auth-button-google" disabled={busy !== null || !googleAvailable}>
        {busy === 'google' ? (
          <span className="auth-spinner" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
          </svg>
        )}
        {busy === 'google' ? 'Signing in…' : 'Continue with Google'}
      </button>

      <p className="auth-switch">
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
