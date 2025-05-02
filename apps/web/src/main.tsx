import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import ShopContextProvider from '@shared/context/ShopContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId={googleClientId}>
        <BrowserRouter>
          <ShopContextProvider backendUrl={backendUrl} storage={storage}>
            <App />
          </ShopContextProvider>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </React.StrictMode>
  );
} else {
  console.error('Root element not found');
}
