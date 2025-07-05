// /apps/web/src/main.tsx

import axios from 'axios';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import ShopContextProvider from '@mytutorapp/shared/context/ShopContext';
import { ChatProvider } from '@mytutorapp/shared/context/ChatContext';
import { ErrorBoundary } from 'react-error-boundary';

// ─── Silence browser alerts & swallow backend errors in production ───
if (import.meta.env.PROD) {
  // no more alert pop-ups
  window.alert = () => {};
  // intercept any backend error and suppress it
  axios.interceptors.response.use(
    response => response,
    error => {
      console.log('🔇 Suppressed backend error:', error);
      return Promise.reject(error);
    }
  );
}

console.log('🟢 main.tsx loaded, bootstrapping React');

// Fallback UI for any rendering errors
function Fallback() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      fontFamily: 'sans-serif',
      color: '#333',
    }}>
      <h1>Something went wrong.</h1>
      <p>Please try refreshing the page.</p>
    </div>
  );
}

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const storage = {
  getItem: async (key: string) => Promise.resolve(localStorage.getItem(key)),
  setItem: async (key: string, value: string) => {
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: async (key: string) => {
    localStorage.removeItem(key);
    return Promise.resolve();
  },
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found');
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary FallbackComponent={Fallback}>
        <BrowserRouter>
          <ShopContextProvider backendUrl={backendUrl} storage={storage}>
            <ChatProvider>
              <App />
            </ChatProvider>
          </ShopContextProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
