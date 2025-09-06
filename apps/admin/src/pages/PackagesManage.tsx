// apps/admin/src/pages/PackagesManage.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Pencil, X, BadgePercent, Plus, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useShopContext } from '@mytutorapp/shared/context/ShopContext';

type Currency = 'USD' | 'KES';

type RawPkg = {
  id: number;
  credits: number;
  price: number;
  currency: Currency;
  offer: string | null;
};

type PkgRow = {
  id: string;            // use credits as string (aggregated key)
  credits: number;
  priceUSD: number;
  priceKES: number;
  offer?: string;
};

export default function PackagesManage() {
  const { backendUrl, token } = useShopContext();
  const base = useMemo(() => (backendUrl || '').replace(/\/+$/, ''), [backendUrl]);

  const [list, setList] = useState<PkgRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<PkgRow | null>(null);
  const [isNew, setIsNew] = useState(false);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    }),
    [token]
  );

  const mergeRows = (rows: RawPkg[]): PkgRow[] => {
    const map = new Map<number, PkgRow>();
    for (const r of rows) {
      const curr = map.get(r.credits) || {
        id: String(r.credits),
        credits: r.credits,
        priceUSD: 0,
        priceKES: 0,
        offer: undefined,
      };
      if (r.currency === 'USD') curr.priceUSD = Number(r.price) || 0;
      if (r.currency === 'KES') curr.priceKES = Number(r.price) || 0;
      if (r.offer != null && r.offer !== '') curr.offer = r.offer;
      map.set(r.credits, curr);
    }
    return Array.from(map.values()).sort((a, b) => a.credits - b.credits);
  };

  const fetchPackages = useCallback(async () => {
    if (!base || !token) return;
    try {
      setLoading(true);
      const { data } = await axios.get<{ success: boolean; packages: RawPkg[] }>(
        `${base}/api/admin/packages`,
        { headers }
      );
      if (!data?.success) throw new Error('Failed to load packages');
      setList(mergeRows(data.packages || []));
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  }, [base, token, headers]);

  useEffect(() => {
    void fetchPackages();
  }, [fetchPackages]);

  const openNew = () => {
    setIsNew(true);
    setEditing({
      id: 'new',
      credits: 10,
      priceUSD: 10,
      priceKES: 1000,
      offer: '',
    });
  };

  const onSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing || !base || !token) return;

    // Read values from form controls to avoid stale state
    const form = new FormData(e.currentTarget);
    const credits = Number(form.get('credits') || editing.credits);
    const priceUSD = Number(form.get('priceUSD') || editing.priceUSD);
    const priceKES = Number(form.get('priceKES') || editing.priceKES);
    const offer = String(form.get('offer') || '').trim() || null;

    if (!Number.isFinite(credits) || credits <= 0) {
      toast.error('Credits must be a positive number');
      return;
    }
    if (priceUSD < 0 || priceKES < 0) {
      toast.error('Prices must be non-negative');
      return;
    }

    try {
      const payload = { credits, priceUSD, priceKES, offer };
      const url = isNew
        ? `${base}/api/admin/packages`
        : `${base}/api/admin/packages/${credits}`;
      const method = isNew ? 'post' : 'put';

      await axios[method](url, payload, { headers });
      toast.success(isNew ? 'Package added' : 'Package updated');
      setEditing(null);
      setIsNew(false);
      await fetchPackages();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || 'Save failed');
    }
  };

  const onDelete = async (credits: number) => {
    if (!base || !token) return;
    if (!window.confirm(`Delete the ${credits}-credit package (both USD & KES)?`)) return;
    try {
      await axios.delete(`${base}/api/admin/packages/${credits}`, { headers });
      toast.success('Package deleted');
      setList((prev) => prev.filter((p) => p.credits !== credits));
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || 'Delete failed');
    }
  };

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <p className="app-heading">Token Packages</p>
        <button className="btn flex items-center gap-2" onClick={openNew}>
          <Plus className="w-4 h-4" />
          New package
        </button>
      </div>

      <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_1fr_1fr] items-center py-2 px-3 border bg-gray-100 dark:bg-white/10 text-sm rounded-t">
        <b>Credits</b>
        <b>Price USD</b>
        <b>Price KES</b>
        <b>Offer</b>
        <b className="text-center">Action</b>
      </div>

      {loading ? (
        <div className="panel flex items-center gap-2 p-4 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading packages…
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] items-center gap-2 py-2 px-3 border text-sm panel"
            >
              <p>{p.credits}</p>
              <p>${p.priceUSD.toFixed(2)}</p>
              <p>KSh {p.priceKES.toLocaleString()}</p>
              <p className="flex items-center gap-2">
                {p.offer ? (
                  <>
                    <BadgePercent className="w-4 h-4" /> {p.offer}
                  </>
                ) : (
                  '—'
                )}
              </p>

              <div className="flex justify-end md:justify-center gap-4">
                <button
                  onClick={() => {
                    setEditing(p);
                    setIsNew(false);
                  }}
                  title="Edit"
                  className="link inline-flex items-center gap-1"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(p.credits)}
                  title="Remove"
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {!list.length && (
            <div className="panel p-4 text-sm text-mutedGray dark:text-darkTextSecondary">
              No packages yet.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="app-heading mb-4">
              {isNew ? 'Add Package' : `Edit Package (${editing.credits} credits)`}
            </h3>

            <form onSubmit={onSave} className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm">Credits</span>
                <input
                  name="credits"
                  className="input mt-1"
                  type="number"
                  min={1}
                  defaultValue={editing.credits}
                  disabled={!isNew} // prevent changing key when editing
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm">Price USD</span>
                <input
                  name="priceUSD"
                  className="input mt-1"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={editing.priceUSD}
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm">Price KES</span>
                <input
                  name="priceKES"
                  className="input mt-1"
                  type="number"
                  step="1"
                  min={0}
                  defaultValue={editing.priceKES}
                  required
                />
              </label>

              <label className="block col-span-2">
                <span className="text-sm">Offer (optional)</span>
                <input
                  name="offer"
                  className="input mt-1"
                  placeholder="Starter Pack / Premium Pack / …"
                  defaultValue={editing.offer || ''}
                />
              </label>

              <div className="flex justify-between col-span-2 mt-2">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setEditing(null);
                    setIsNew(false);
                  }}
                >
                  Cancel
                </button>
                <button className="btn" type="submit">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
