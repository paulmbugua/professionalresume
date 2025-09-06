import React, { useEffect, useState } from 'react';
import { Pencil, X, BadgePercent } from 'lucide-react';

type Pkg = {
  id: string;
  credits: number;
  priceUSD: number;
  priceKES: number;
  offer?: string;
};

export default function PackagesManage({ token }: { token: string }) {
  const [list, setList] = useState<Pkg[]>([]);
  const [editing, setEditing] = useState<Pkg | null>(null);

  useEffect(() => {
    // structure only: mock some packages
    setList([
      { id: '11', credits: 5, priceUSD: 1.0, priceKES: 120, offer: 'Starter' },
      { id: '12', credits: 20, priceUSD: 3.5, priceKES: 420, offer: 'Popular' },
    ]);
  }, []);

  return (
    <>
      <p className="mb-2 app-heading">Token Packages</p>

      <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_1fr_1fr] items-center py-2 px-3 border bg-gray-100 dark:bg-white/10 text-sm">
        <b>Credits</b>
        <b>Price USD</b>
        <b>Price KES</b>
        <b>Offer</b>
        <b className="text-center">Action</b>
      </div>

      <div className="flex flex-col gap-2">
        {list.map((p) => (
          <div key={p.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] items-center gap-2 py-2 px-3 border text-sm panel">
            <p>{p.credits}</p>
            <p>${p.priceUSD.toFixed(2)}</p>
            <p>KSh {p.priceKES.toLocaleString()}</p>
            <p className="flex items-center gap-2">{p.offer ? (<><BadgePercent className="w-4 h-4" /> {p.offer}</>) : '—'}</p>

            <div className="flex justify-end md:justify-center gap-4">
              <button onClick={() => setEditing(p)} title="Edit" className="link"><Pencil /></button>
              <button onClick={() => setList(list.filter(x => x.id !== p.id))} title="Remove" className="text-red-600 hover:text-red-800">X</button>
            </div>
          </div>
        ))}
      </div>

      {/* modal */}
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="app-heading mb-4">Edit Package</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm">Credits</span>
                <input className="input mt-1" type="number" defaultValue={editing.credits} />
              </label>
              <label className="block">
                <span className="text-sm">Price USD</span>
                <input className="input mt-1" type="number" defaultValue={editing.priceUSD} />
              </label>
              <label className="block">
                <span className="text-sm">Price KES</span>
                <input className="input mt-1" type="number" defaultValue={editing.priceKES} />
              </label>
              <label className="block col-span-2">
                <span className="text-sm">Offer</span>
                <input className="input mt-1" defaultValue={editing.offer || ''} />
              </label>
            </div>
            <div className="flex justify-between mt-4">
              <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn" onClick={() => setEditing(null)}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
