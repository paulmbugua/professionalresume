import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import ShopContextProvider from '@mytutorapp/shared/context/ShopContext';
import { queryClient } from '@mytutorapp/shared/utils/queryClient'; // <-- shared singleton
import App from './App';
import './index.css';

// Optional: expose for any legacy global reads
(window as any).queryClient = queryClient;

// Prefer Vite env; fall back to window injection; dev default
const backendUrl =
  (import.meta as any).env?.VITE_BACKEND_URL ||
  (window as any).__BACKEND_URL__ ||
  'http://localhost:4000';

// Storage shim that stays compatible with pages that still read "authToken"
const storage = {
  getItem: async (k: string) =>
    Promise.resolve(
      k === 'token'
        ? localStorage.getItem('token') ?? localStorage.getItem('authToken')
        : localStorage.getItem(k)
    ),
  setItem: async (k: string, v: string) => {
    if (k === 'token') {
      localStorage.setItem('token', v);
      localStorage.setItem('authToken', v);
    } else {
      localStorage.setItem(k, v);
    }
    return Promise.resolve();
  },
  removeItem: async (k: string) => {
    if (k === 'token') {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
    } else {
      localStorage.removeItem(k);
    }
    return Promise.resolve();
  },
};

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

ReactDOM.createRoot(rootEl as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ShopContextProvider backendUrl={backendUrl} storage={storage}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ShopContextProvider>

      {(import.meta as any).env?.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>
);
