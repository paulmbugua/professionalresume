import React, { useEffect, useState } from 'react';
import { currency } from '../App';
import { CreditCard, Receipt } from 'lucide-react';

type Tx = {
  id: string;
  userEmail: string;
  method: 'PayPal' | 'M-Pesa';
  amount: number;
  currency: 'USD' | 'KES';
  status: 'Pending' | 'Completed' | 'Failed';
  date: string; // ISO
  captureId?: string;
  orderId?: string;
};

export default function Transactions({ token }: { token: string }) {
  const [tx, setTx] = useState<Tx[]>([]);

  useEffect(() => {
    // structure only: demo data
    setTx([
      { id: '34', userEmail: 'paulpep2002@gmail', method: 'PayPal', amount: 1.00, currency: 'USD', status: 'Completed', date: new Date().toISOString(), captureId: '0LD80058AX440524F', orderId: '7A2469264D687852V' },
      { id: '35', userEmail: 'student@db.com', method: 'M-Pesa', amount: 120, currency: 'KES', status: 'Pending', date: new Date().toISOString() },
    ]);
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="app-heading">Transactions</h3>

      <div className="grid gap-3">
        {tx.map((t) => (
          <div key={t.id} className="panel p-4 grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 items-center">
            <div className="text-sm">
              <p className="font-medium">{t.userEmail}</p>
              <p className="text-xs text-mutedGray dark:text-darkTextSecondary">
                {t.orderId ? `Order: ${t.orderId}` : '—'} {t.captureId ? ` · Capture: ${t.captureId}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="text-sm">{t.method}</span>
            </div>

            <div className="text-sm">
              {t.currency === 'USD' ? `$ ${t.amount.toFixed(2)}` : `KSh ${t.amount.toLocaleString()}`}
            </div>

            <div>
              <span className={`chip ${t.status === 'Completed' ? 'chip-active' : ''}`}>{t.status}</span>
            </div>

            <div className="flex justify-end">
              <button className="chip" title="Open receipt">
                <Receipt className="w-4 h-4" />
                <span className="hidden sm:inline">Receipt</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
