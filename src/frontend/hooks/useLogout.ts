import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

/** Confirm-then-logout flow shared by the mobile wheel and the desktop sidebar. */
export function useLogout(onBeforeLogout?: () => void) {
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const confirm = async () => {
    setConfirming(false);
    onBeforeLogout?.();
    await logout();
    navigate('/login', { replace: true });
  };

  return {
    confirming,
    request: () => setConfirming(true),
    cancel: () => setConfirming(false),
    confirm,
  };
}
