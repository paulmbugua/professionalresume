import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import ShopContextProvider from '@shared/context/ShopContext';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <ShopContextProvider>
          <App />
        </ShopContextProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
} else {
  console.error('Root element not found');
}
