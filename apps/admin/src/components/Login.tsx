import React, { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useShopContext } from '@mytutorapp/shared/context/ShopContext';

type Props = {
  // App passes a Dispatch adapter; we'll call it for back-compat
  setToken: React.Dispatch<React.SetStateAction<string>>;
};

type AdminLoginResponse = {
  token: string;
  message?: string;
};

export default function Login({ setToken }: Props) {
  const { backendUrl, setToken: setCtxToken } = useShopContext();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const navigate = useNavigate();

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!backendUrl) {
      toast.error('Backend URL is not configured.');
      return;
    }
    if (!email.trim() || !password) {
      toast.error('Enter email and password.');
      return;
    }

    try {
      setBusy(true);
      const base = backendUrl.replace(/\/+$/, '');
      const { data } = await axios.post<AdminLoginResponse>(
        `${base}/api/admin/login`,
        { email: email.trim(), password },
        { withCredentials: true }
      );

      if (!data?.token) {
        throw new Error(data?.message || 'No token returned from server');
      }

      // Store token via context (source of truth) and via prop (legacy)
      await setCtxToken(data.token);
      setToken(data.token);

      toast.success('Signed in!');
      navigate('/transactions', { replace: true });
    } catch (err: unknown) {
      const ax = err as AxiosError<{ message?: string }>;
      const msg =
        ax.response?.data?.message ||
        ax.message ||
        'Login failed. Check your credentials.';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-md mx-auto p-6 panel space-y-4">
      <h2 className="app-heading">Admin Login</h2>

      <label className="block">
        <span className="text-sm">Email</span>
        <input
          className="input mt-1"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
      </label>

      <label className="block">
        <span className="text-sm">Password</span>
        <input
          className="input mt-1"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />
      </label>

      <button className="btn w-full" type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
