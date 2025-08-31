// packages/shared/utils/firebaseConfig.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';

const PROJECT_DEFAULT_AUTH_DOMAIN = 'mytutorapp-d3c91.firebaseapp.com';

// Use custom domain only in prod. In dev, use the project default.
const authDomain =
  import.meta.env.PROD
    ? (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'daybreaklearner.com')
    : PROJECT_DEFAULT_AUTH_DOMAIN;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain, // 👈 dynamic
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
// Always show chooser in prod (optional). If you want faster returns for returning users,
// you can skip this prompt after the first Google sign-in.
provider.setCustomParameters({ prompt: 'select_account' });
