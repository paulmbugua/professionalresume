import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { Routes, Route, Navigate } from 'react-router-dom';
import PackagesCreate from './pages/PackagesCreate';
import PackagesManage from './pages/PackagesManage';
import Transactions from './pages/Transactions';
import Receipts from './pages/Receipts';
import Users from './pages/Users';
import Login from './components/Login';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const backendUrl = import.meta.env.VITE_BACKEND_URL;
export const currency = 'Kshs ';

const App: React.FC = () => {
  const [token, setToken] = useState<string>(localStorage.getItem('token') ?? '');

  useEffect(() => {
    localStorage.setItem('token', token);
  }, [token]);

  if (token === '') {
    return (
      <div className="app-body min-h-screen">
        <ToastContainer />
        <Login setToken={setToken} />
      </div>
    );
  }

  return (
    <div className="app-body min-h-screen">
      <ToastContainer />
      <Navbar setToken={setToken} />
      <hr className="border-gray-200 dark:border-darkCard" />
      <div className="flex w-full">
        <Sidebar />
        <main className="w-[70%] mx-auto ml-[max(5vw,25px)] my-8 text-gray-600 dark:text-darkTextPrimary text-base">
          <Routes>
            <Route path="/" element={<Navigate to="/packages" replace />} />
            <Route path="/packages/create" element={<PackagesCreate token={token} />} />
            <Route path="/packages" element={<PackagesManage token={token} />} />
            <Route path="/transactions" element={<Transactions token={token} />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="/users" element={<Users />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;
