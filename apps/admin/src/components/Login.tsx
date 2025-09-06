// apps/admin/src/components/Login.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../App';

type Props = { setToken: (t: string) => void };

const Login: React.FC<Props> = ({ setToken }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // ---- Theme bootstrap (prefers-color-scheme + localStorage) ----
  useEffect(() => {
    const saved = (localStorage.getItem('theme') || '').toLowerCase();
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    const initial: 'light' | 'dark' =
      saved === 'dark' ? 'dark' : saved === 'light' ? 'light' : prefersDark ? 'dark' : 'light';

    setTheme(initial);
    if (initial === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    if (next === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const onSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setSubmitting(true);
      const { data } = await axios.post(`${backendUrl}/api/user/admin`, { email, password });

      if (data?.success && data?.token) {
        localStorage.setItem('authToken', data.token);
        setToken(data.token);
        toast.success('Login successful!');
      } else {
        toast.error(data?.message || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login Error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-body min-h-screen flex items-center justify-center p-6">
      <div className="panel w-full max-w-md p-8 relative">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="absolute right-4 top-4 chip text-xs"
          type="button"
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
        </button>

        {/* Heading */}
        <h1 className="app-heading text-2xl text-center">DayBreak Learner — Admin</h1>
        <p className="mt-1 text-center text-sm text-mutedGray dark:text-darkTextSecondary">
          Sign in to manage payments, users, and reports.
        </p>

        {/* Form */}
        <form onSubmit={onSubmitHandler} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm mb-1 dark:text-darkTextPrimary">
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm mb-1 dark:text-darkTextPrimary">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn w-full mt-2"
            disabled={submitting}
          >
            {submitting ? 'Signing in…' : 'Login'}
          </button>
        </form>

        {/* Subtext */}
        <p className="mt-6 text-xs text-center text-mutedGray dark:text-darkTextSecondary">
          Protected area. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
};

export default Login;
