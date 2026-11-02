import { useNavigate, useLocation } from 'react-router-dom';
import IconButton from './ui/IconButton';

export default function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === '/') return null;

  // Deep links have no in-app history, so fall back to the dashboard.
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  return (
    <IconButton label="Go back" size="sm" onClick={goBack}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </IconButton>
  );
}
