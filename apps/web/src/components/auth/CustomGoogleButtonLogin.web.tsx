'use client';

import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';

export default function CustomGoogleButtonLogin({
  returnTo,
  className,
}: {
  returnTo?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').trim();
      if (!backendUrl) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');

      const params = new URLSearchParams();
      if (returnTo) params.set('returnTo', returnTo);
      const url = `${backendUrl.replace(/\/+$/, '')}/api/auth/google?${params.toString()}`;
      window.location.assign(url);
    } catch (err: any) {
      console.error('[google-login] failure', err);
      setLoading(false);
      alert('Google sign-in is temporarily unavailable. Please try again.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={loading}
      className={
        className ??
        `inline-flex w-full items-center justify-center gap-3 rounded-xl
         border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900
         shadow-sm transition hover:bg-gray-50
         disabled:cursor-not-allowed disabled:opacity-60
         dark:border-white/20 dark:bg-black/20 dark:text-white dark:hover:bg-white/10`
      }
      aria-busy={loading}
    >
      <FcGoogle className="h-5 w-5 rounded-full bg-white p-[2px]" />
      {loading ? 'Signing in…' : 'Continue with Google'}
    </button>
  );
}
