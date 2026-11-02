import { createContext, useContext } from 'react';
import type { AppUser } from '../../backend/auth/authService';
import type { Gender, UserProfile } from '../../backend/models';

export interface AuthContextValue {
  user: AppUser | null;
  profile: UserProfile | null;
  /** True until the session and profile have been resolved. */
  loading: boolean;
  mode: 'firebase' | 'local';
  googleAvailable: boolean;
  gender: Gender | null;
  setGender: (gender: Gender) => Promise<void>;
  /** `identifier` is an email address or a 10-digit mobile number. */
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, mobile: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export type { Gender };
