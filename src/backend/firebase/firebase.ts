import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration, read from .env (VITE_FIREBASE_*).
// For Firebase JS SDK v7.20.0 and later, measurementId is optional.
export const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

/** Unit tests always use the local in-memory/localStorage database, never the live project. */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId) && import.meta.env.MODE !== 'test';

/** Starts Google Analytics when the browser supports it (it doesn't in some private modes/webviews). */
export function initAnalytics(app: FirebaseApp): void {
  // Skipped in dev so local sessions don't pollute stats or fail on networks that block gtag.
  if (!firebaseConfig.measurementId || !import.meta.env.PROD) return;
  isSupported()
    .then((supported) => {
      if (supported) getAnalytics(app);
    })
    .catch(() => undefined);
}
