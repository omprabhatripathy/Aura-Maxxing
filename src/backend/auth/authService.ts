import {
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'firebase/auth';
import type { UserCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';
import { ValidationError } from '../core/errors';
import { sha256 } from '../core/ids';
import { validateEmail, validateMobile, validatePassword, validateUsername } from '../validators';
import { ensureUserDocument } from '../services/profileService';
import { activityOp, commit } from '../services/ops';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const authMode: 'firebase' | 'local' = auth ? 'firebase' : 'local';

function authErrorMessage(error: unknown): string {
  if (error instanceof ValidationError) return error.message;
  const code = (error as { code?: string })?.code ?? '';
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/user-not-found': 'Incorrect email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Please choose a stronger password.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
    'auth/unauthorized-domain': 'This domain is not authorized for Google sign-in. Add it under Firebase Console → Authentication → Settings → Authorized domains.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.',
    'auth/configuration-not-found': 'Firebase Authentication is not set up for this project. Open Firebase Console → Authentication → Get started, then enable Email/Password.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email. Sign in with your password instead.',
    // Firestore errors surface here too (profile and phone-number lookups during sign-up/login).
    'permission-denied': 'The database refused the request. Make sure Cloud Firestore is created and the security rules are deployed.',
    unavailable: 'Could not reach the database. Check your connection, and that Cloud Firestore is enabled for this project.',
  };
  if (!messages[code]) console.error('Authentication error:', error);
  return messages[code] ?? 'Authentication failed. Please try again.';
}

export class AuthError extends Error {}

const wrap = async <T,>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    throw new AuthError(authErrorMessage(error));
  }
};

/* ---------------- Local development accounts (only when Firebase is not configured) ---------------- */

const ACCOUNTS_KEY = 'aura-local-accounts';
const SESSION_KEY = 'aura-local-session';
const LEGACY_KEYS = ['aura_users', 'aura_authenticated', 'aura_current_user'];

interface LocalAccount {
  uid: string;
  email: string;
  mobile?: string;
  username: string;
  salt: string;
  hash: string;
}

const sessionListeners = new Set<(user: AppUser | null) => void>();

function readAccounts(): Record<string, LocalAccount> {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '{}') as Record<string, LocalAccount>;
  } catch {
    return {};
  }
}

function readSession(): AppUser | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as AppUser | null;
  } catch {
    return null;
  }
}

function setSession(user: AppUser | null) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else localStorage.removeItem(SESSION_KEY);
  sessionListeners.forEach((fn) => fn(user));
}

async function createLocalAccount(username: string, email: string, password: string, mobile?: string): Promise<LocalAccount> {
  const accounts = readAccounts();
  if (accounts[email]) throw new ValidationError('An account with this email already exists.');
  if (mobile && Object.values(accounts).some((a) => a.mobile === mobile)) {
    throw new ValidationError('An account with this mobile number already exists.');
  }
  const salt = crypto.randomUUID();
  const account: LocalAccount = { uid: `local_${(await sha256(email)).slice(0, 20)}`, email, mobile, username, salt, hash: await sha256(salt + password) };
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify({ ...accounts, [email]: account }));
  return account;
}

export const LOCAL_DEMO = { email: 'demo@aura.app', password: 'AuraDemo1' };

async function ensureLocalDemo() {
  // Old builds stored plaintext passwords; remove them.
  LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  if (!readAccounts()[LOCAL_DEMO.email]) await createLocalAccount('Demo User', LOCAL_DEMO.email, LOCAL_DEMO.password);
}

/* ---------------- Public API ---------------- */

const phoneDoc = (mobile: string) => doc(db!, 'phoneIndex', mobile);

async function finishGoogleSignIn(credential: UserCredential) {
  const isNew = Boolean(getAdditionalUserInfo(credential)?.isNewUser);
  const { user } = credential;
  await ensureUserDocument(user.uid, { username: user.displayName ?? user.email ?? 'User', email: user.email, photoURL: user.photoURL }, isNew);
  await commit([activityOp(user.uid, 'login', 'Logged in with Google')]);
}

export function onAuthChange(callback: (user: AppUser | null) => void): () => void {
  if (auth) {
    // Completes a Google sign-in that fell back to a full-page redirect.
    getRedirectResult(auth)
      .then((credential) => (credential ? finishGoogleSignIn(credential) : undefined))
      .catch((error) => console.error('Google redirect sign-in failed:', authErrorMessage(error)));
    return onAuthStateChanged(auth, (u) =>
      callback(u ? { uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL } : null)
    );
  }
  void ensureLocalDemo();
  sessionListeners.add(callback);
  queueMicrotask(() => callback(readSession()));
  return () => sessionListeners.delete(callback);
}

export async function register(username: string, email: string, mobile: string, password: string): Promise<void> {
  return wrap(async () => {
    const name = validateUsername(username);
    const mail = validateEmail(email);
    const phone = validateMobile(mobile);
    validatePassword(password);
    if (auth) {
      if ((await getDoc(phoneDoc(phone))).exists()) throw new ValidationError('An account with this mobile number already exists.');
      const credential = await createUserWithEmailAndPassword(auth, mail, password);
      await updateProfile(credential.user, { displayName: name });
      await ensureUserDocument(credential.user.uid, { username: name, email: mail, photoURL: null }, true);
      await setDoc(phoneDoc(phone), { uid: credential.user.uid, email: mail });
      // Registration does not sign the user in; they log in explicitly afterwards.
      await signOut(auth);
      return;
    }
    const account = await createLocalAccount(name, mail, password, phone);
    await ensureUserDocument(account.uid, { username: name, email: mail, photoURL: null }, true);
  });
}

/** Resolves an "email or 10-digit mobile number" identifier to the account email. */
async function resolveEmail(identifier: string): Promise<string | null> {
  const value = identifier.trim();
  if (value.includes('@')) return validateEmail(value);
  const phone = validateMobile(value);
  if (auth) {
    const snap = await getDoc(phoneDoc(phone));
    return snap.exists() ? String(snap.data().email) : null;
  }
  return Object.values(readAccounts()).find((a) => a.mobile === phone)?.email ?? null;
}

export async function login(identifier: string, password: string): Promise<void> {
  return wrap(async () => {
    if (!identifier.trim()) throw new ValidationError('Enter your email or mobile number.');
    const mail = await resolveEmail(identifier);
    if (!password) throw new ValidationError('Enter your password.');
    if (!mail) throw new ValidationError('Incorrect mobile number or password.');
    if (auth) {
      const { user } = await signInWithEmailAndPassword(auth, mail, password);
      await ensureUserDocument(user.uid, { username: user.displayName ?? mail, email: mail, photoURL: user.photoURL }, false);
      await commit([activityOp(user.uid, 'login', 'Logged in with email')]);
      return;
    }
    const account = readAccounts()[mail];
    if (!account || (await sha256(account.salt + password)) !== account.hash) {
      throw new ValidationError('Incorrect email or password.');
    }
    await ensureUserDocument(account.uid, { username: account.username, email: mail, photoURL: null }, false);
    await commit([activityOp(account.uid, 'login', 'Logged in with email')]);
    setSession({ uid: account.uid, email: mail, displayName: account.username, photoURL: null });
  });
}

export async function loginWithGoogle(): Promise<void> {
  return wrap(async () => {
    if (!auth || !googleProvider) throw new ValidationError('Google sign-in requires Firebase to be configured.');
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    try {
      await finishGoogleSignIn(await signInWithPopup(auth, googleProvider));
    } catch (error) {
      const code = (error as { code?: string })?.code;
      // Popups are blocked on some browsers/in-app webviews; a redirect always works.
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw error;
    }
  });
}

export async function resetPassword(email: string): Promise<void> {
  return wrap(async () => {
    const mail = validateEmail(email);
    if (!auth) throw new ValidationError('Password reset requires Firebase to be configured.');
    await sendPasswordResetEmail(auth, mail);
  });
}

export async function logout(): Promise<void> {
  if (auth) await signOut(auth);
  else setSession(null);
}
