import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { database, paths } from '../../backend/db';
import { authMode, onAuthChange, type AppUser } from '../../backend/auth/authService';
import * as authService from '../../backend/auth/authService';
import { toUserProfile } from '../../backend/repositories/mappers';
import { migrateUserData } from '../../backend/services/migrationService';
import { setGender as saveGender, SCHEMA_VERSION } from '../../backend/services/profileService';
import type { Gender, UserProfile } from '../../backend/models';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [profileState, setProfileState] = useState<{ uid: string; profile: UserProfile } | null>(null);
  const migrating = useRef<string | null>(null);

  useEffect(
    () =>
      onAuthChange((u) => {
        setUser(u);
        setSessionResolved(true);
      }),
    []
  );

  useEffect(() => {
    if (!user) return;
    return database.subscribeDoc(
      paths.users(),
      user.uid,
      (doc) => {
        const profile = toUserProfile(user.uid, doc, { email: user.email, name: user.displayName, photoURL: user.photoURL });
        setProfileState({ uid: user.uid, profile });
        if (doc && profile.schemaVersion < SCHEMA_VERSION && database.kind === 'firestore' && migrating.current !== user.uid) {
          migrating.current = user.uid;
          migrateUserData(user.uid).catch((error) => console.error('Data migration failed', error));
        }
      },
      (error) => {
        console.error('Profile subscription failed', error);
        setProfileState({ uid: user.uid, profile: toUserProfile(user.uid, null, { email: user.email, name: user.displayName, photoURL: user.photoURL }) });
      }
    );
  }, [user]);

  const profile = user && profileState?.uid === user.uid ? profileState.profile : null;
  const loading = !sessionResolved || (Boolean(user) && !profile);

  const setGender = useCallback(async (gender: Gender) => {
    if (user) await saveGender(user.uid, gender);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        mode: authMode,
        googleAvailable: authMode === 'firebase',
        gender: profile?.gender ?? null,
        setGender,
        login: authService.login,
        register: authService.register,
        loginWithGoogle: authService.loginWithGoogle,
        resetPassword: authService.resetPassword,
        logout: authService.logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
