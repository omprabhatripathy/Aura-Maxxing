import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/useAuth';
import { EyeIcon, EyeOffIcon } from '../../../components/shared/icons';
import './auth.css';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await register(username, email, mobile, password);
      navigate('/login', { replace: true, state: { message: 'Account created successfully. Please log in.' } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-container surface-level-2-glass">
      <h2 className="auth-title">Register</h2>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <input type="text" autoComplete="nickname" placeholder="Name" aria-label="Name" maxLength={40} value={username} onChange={(e) => setUsername(e.target.value)} className="auth-input" required />
        <input type="email" autoComplete="email" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="auth-input" required />
        <input
          type="tel"
          autoComplete="tel-national"
          inputMode="numeric"
          placeholder="Mobile number"
          aria-label="Mobile number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
          className="auth-input"
          required
        />

        <div className="auth-input-group">
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Password"
            aria-label="Password"
            aria-describedby="password-rules"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            required
          />
          <button type="button" className="auth-input-group__toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <p id="password-rules" className="auth-hint">At least 8 characters, including a letter and a number.</p>

        <input
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Confirm password"
          aria-label="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="auth-input"
          required
        />

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button type="submit" className="auth-button" disabled={busy}>
          {busy ? 'Creating account…' : 'Register'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
