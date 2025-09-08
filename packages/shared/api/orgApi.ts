// packages/shared/api/orgApi.ts
import axios from 'axios';
import type {
  CurrentUser,
  OrgInviteInfo,
  OrgAttemptAcceptResponse,
} from '@mytutorapp/shared/types';

function baseUrl(u: string) {
  return u.replace(/\/+$/, '');
}

/** GET /api/user/me — used to discover org membership(s) on the user object */
export async function fetchCurrentUser(
  backendUrl: string,
  token: string
): Promise<CurrentUser> {
  const url = `${baseUrl(backendUrl)}/api/user/me`;
  const res = await axios.get<CurrentUser>(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/** GET /api/orgs/invite/:code — resolve invite to assignment + org branding */
export async function resolveOrgInvite(
  backendUrl: string,
  code: string
): Promise<OrgInviteInfo> {
  const url = `${baseUrl(backendUrl)}/api/orgs/invite/${encodeURIComponent(code)}`;
  const res = await axios.get<OrgInviteInfo>(url);
  return res.data;
}

/** POST /api/orgs/accept — accept invite and create/refresh attempt */
export async function acceptOrgInvite(
  backendUrl: string,
  code: string,
  token: string
): Promise<OrgAttemptAcceptResponse> {
  const url = `${baseUrl(backendUrl)}/api/orgs/accept`;
  const res = await axios.post<OrgAttemptAcceptResponse>(
    url,
    { code },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}
