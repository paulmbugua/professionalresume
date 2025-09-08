// packages/shared/api/institutionAuth.ts
export type InstitutionLoginResp = { success: boolean; token?: string; message?: string };
export type InstitutionGoogleResp = { success: boolean; token?: string; userId?: number; name?: string; message?: string };

export async function institutionLogin(backendUrl: string, email: string, password: string): Promise<InstitutionLoginResp> {
  const r = await fetch(`${backendUrl}/api/institutions/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return r.json();
}

export async function institutionRegister(backendUrl: string, name: string, email: string, password: string): Promise<InstitutionLoginResp> {
  const r = await fetch(`${backendUrl}/api/institutions/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return r.json();
}

export async function institutionGoogleLogin(backendUrl: string, idToken: string, name?: string): Promise<InstitutionGoogleResp> {
  const r = await fetch(`${backendUrl}/api/institutions/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: idToken, name }),
  });
  return r.json();
}

export async function institutionRequestReset(backendUrl: string, email: string) {
  const r = await fetch(`${backendUrl}/api/institutions/auth/password/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return r.json();
}

export async function institutionVerifyReset(backendUrl: string, email: string, otp: string, newPassword: string) {
  const r = await fetch(`${backendUrl}/api/institutions/auth/password/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, newPassword }),
  });
  return r.json();
}
