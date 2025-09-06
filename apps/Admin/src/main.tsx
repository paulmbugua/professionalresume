import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter } from 'react-router-dom';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

ReactDOM.createRoot(rootEl as HTMLElement).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
