// packages/shared/utils/firebaseConfig.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';

/** ===== Cross-platform env helpers ===== */
type AnyEnv = Record<string, string | boolean | undefined>;
const META_ENV: AnyEnv =
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env) || {};

const IS_PROD =
  typeof META_ENV.PROD === 'boolean'
    ? (META_ENV.PROD as boolean)
    : (process?.env?.NODE_ENV === 'production');

/** Map Vite keys to Expo native keys when needed */
const getEnv = (viteKey: string): string => {
  // Prefer Vite (web builds)
  const fromVite = META_ENV[viteKey];
  if (typeof fromVite === 'string') return fromVite;

  // Fallback for native (Expo) builds: VITE_FOO -> EXPO_PUBLIC_FOO
  const tail = viteKey.replace(/^VITE_/, '');
  const expoKey = `EXPO_PUBLIC_${tail}`;
  const fromExpo = (process?.env as AnyEnv)?.[expoKey];
  return typeof fromExpo === 'string' ? fromExpo : '';
};

/** ===== Auth domain selection ===== */
const PROJECT_DEFAULT_AUTH_DOMAIN = 'mytutorapp-d3c91.firebaseapp.com';

const USE_CUSTOM =
  IS_PROD && getEnv('VITE_USE_CUSTOM_AUTH_DOMAIN') === '1';
const ENV_AUTH_DOMAIN = getEnv('VITE_FIREBASE_AUTH_DOMAIN').trim();
const PROJECT_ID = getEnv('VITE_FIREBASE_PROJECT_ID').trim();

const fallbackDomain =
  PROJECT_DEFAULT_AUTH_DOMAIN || (PROJECT_ID ? `${PROJECT_ID}.firebaseapp.com` : '');

const authDomain =
  USE_CUSTOM && ENV_AUTH_DOMAIN ? ENV_AUTH_DOMAIN : fallbackDomain;

if (IS_PROD && USE_CUSTOM && !ENV_AUTH_DOMAIN) {
  // eslint-disable-next-line no-console
  console.warn(
    '[firebase] VITE_USE_CUSTOM_AUTH_DOMAIN=1 but VITE_FIREBASE_AUTH_DOMAIN is empty. Falling back to project domain.'
  );
}

/** ===== Firebase config ===== */
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain,
  projectId: PROJECT_ID,
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID'),
};

/** ===== Initialize app & auth ===== */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
auth.useDeviceLanguage();

// Use durable persistence only on the web (browser storage available).
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

/** ===== Google provider (mostly used on web) ===== */
export const provider = new GoogleAuthProvider();
// Show account chooser (nice for multi-account users)
provider.setCustomParameters({ prompt: 'select_account' });

/** Optional exports for debugging */
export const firebaseApp = app;
export const firebaseAuthDomain = authDomain;
