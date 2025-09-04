// packages/shared/utils/firebaseConfig.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';

const PROJECT_DEFAULT_AUTH_DOMAIN = 'mytutorapp-d3c91.firebaseapp.com';

// ✅ Use the Firebase project domain by default.
//    Only use a custom auth domain if you *explicitly* opt-in with VITE_USE_CUSTOM_AUTH_DOMAIN=1
//    *and* provide VITE_FIREBASE_AUTH_DOMAIN.
const USE_CUSTOM = import.meta.env.PROD && import.meta.env.VITE_USE_CUSTOM_AUTH_DOMAIN === '1';
const ENV_AUTH_DOMAIN = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim();

const authDomain =
  USE_CUSTOM && ENV_AUTH_DOMAIN
    ? ENV_AUTH_DOMAIN
    : PROJECT_DEFAULT_AUTH_DOMAIN;

// Helpful warning if misconfigured
if (import.meta.env.PROD && USE_CUSTOM && !ENV_AUTH_DOMAIN) {
  // eslint-disable-next-line no-console
  console.warn(
    '[firebase] VITE_USE_CUSTOM_AUTH_DOMAIN=1 but VITE_FIREBASE_AUTH_DOMAIN is empty. Falling back to project domain.'
  );
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain, // 👈 correct domain for Firebase Auth handler
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
auth.useDeviceLanguage();
setPersistence(auth, browserLocalPersistence).catch(() => {});

export const provider = new GoogleAuthProvider();
// Show account chooser (nice for multi-account users)
provider.setCustomParameters({ prompt: 'select_account' });

// (optional) export for debugging
export const firebaseApp = app;
export const firebaseAuthDomain = authDomain;
