// packages/shared/api/paypalApi.ts
export async function createOrder(packageId: string, token: string, backendUrl = '') {
  const r = await fetch(`${backendUrl}/api/paypal/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ packageId }),
  });
  if (!r.ok) {
    const msg = await r.text().catch(() => '');
    throw new Error(msg || 'create-order failed');
  }
  return r.json() as Promise<{ id: string }>;
}

export async function captureOrder(orderId: string, token: string, backendUrl = '') {
  const r = await fetch(`${backendUrl}/api/paypal/capture-order/${orderId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    const msg = await r.text().catch(() => '');
    throw new Error(msg || 'capture-order failed');
  }
  return r.json();
}
