// apps/web/src/utils/firebaseAuthWeb.ts
'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  type Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onIdTokenChanged,
  type UserCredential,
} from 'firebase/auth';

type WebFirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
};

const REQUIRED_KEYS: (keyof WebFirebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'appId'];

const readEnv = () => {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
};

export function debugFirebaseWebConfig(tag: string) {
  if (process.env.NODE_ENV === 'production') return;

  const cfg = readEnv();
  const present = Object.fromEntries(Object.entries(cfg).map(([k, v]) => [k, Boolean(v)]));
  // eslint-disable-next-line no-console
  console.log(`[${tag}] firebase env presence`, present);
}

export function getWebFirebaseConfigOrNull(): { cfg: WebFirebaseConfig | null; missingKeys: string[] } {
  const cfg = readEnv();

  const missingKeys = REQUIRED_KEYS.filter((k) => !cfg[k] || String(cfg[k]).trim() === '');

  if (missingKeys.length) return { cfg: null, missingKeys };

  return { cfg: cfg as WebFirebaseConfig, missingKeys: [] };
}

function getFirebaseAppSafe(): FirebaseApp | null {
  const { cfg } = getWebFirebaseConfigOrNull();
  if (!cfg) return null;

  if (getApps().length) return getApps()[0]!;
  return initializeApp(cfg);
}

export async function getAuthSafe(): Promise<Auth | null> {
  const app = getFirebaseAppSafe();
  if (!app) return null;
  return getAuth(app);
}

export async function signInGooglePopup(): Promise<UserCredential> {
  const auth = await getAuthSafe();
  if (!auth) throw new Error('Missing Firebase web config');

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  return signInWithPopup(auth, provider);
}

export async function signInGoogleRedirect(): Promise<void> {
  const auth = await getAuthSafe();
  if (!auth) throw new Error('Missing Firebase web config');

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  await signInWithRedirect(auth, provider);
}

export async function getGoogleRedirectToken(auth: Auth): Promise<string | null> {
  const res = await getRedirectResult(auth);
  const user = res?.user;
  if (!user) return null;
  return user.getIdToken(true);
}

export async function subscribeAuthToken(auth: Auth, cb: (idToken: string) => void): Promise<() => void> {
  const unsub = onIdTokenChanged(auth, async (user) => {
    if (!user) return;
    const token = await user.getIdToken(true);
    cb(token);
  });
  return unsub;
}