import React, { useState } from 'react';
import { FileDown } from 'lucide-react';

export default function Receipts() {
  const [captureId, setCaptureId] = useState('');
  const [email, setEmail] = useState('');

  return (
    <div className="space-y-4">
      <h3 className="app-heading">Proof of Fulfillment</h3>
      <div className="panel p-4 grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm">PayPal Capture ID</span>
          <input className="input mt-1" value={captureId} onChange={e => setCaptureId(e.target.value)} placeholder="0LD80058AX440524F" />
        </label>
        <label className="block">
          <span className="text-sm">Buyer Email (App)</span>
          <input className="input mt-1" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@example.com" />
        </label>
        <div className="sm:col-span-2">
          <button className="btn">
            <FileDown className="w-4 h-4" />
            Generate Receipt (PDF)
          </button>
        </div>
      </div>
      <p className="text-xs text-mutedGray dark:text-darkTextSecondary">Note: This is the UI skeleton. Wire it to your backend to fetch joined payment/user/package data and generate a PDF.</p>
    </div>
  );
}
