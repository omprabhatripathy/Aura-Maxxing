import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import type { FirebaseStorage } from 'firebase/storage';
import { firebaseConfig, initAnalytics, isFirebaseConfigured } from './firebase';

export { isFirebaseConfigured };

export let auth: Auth | null = null;
export let googleProvider: GoogleAuthProvider | null = null;
export let db: Firestore | null = null;
export let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  // Offline cache lets the app read/write without a connection and sync later, across tabs.
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  storage = firebaseConfig.storageBucket ? getStorage(app) : null;
  setPersistence(auth, browserLocalPersistence).catch(() => {});
  initAnalytics(app);
} else {
  console.warn('Firebase is not configured (missing VITE_FIREBASE_* env vars). Running in local device-storage mode.');
}
