// packages/shared/api/orgApi.ts
import axios from 'axios';
import type {
   CurrentUser,
   OrgInviteInfo,
   OrgAttemptAcceptResponse,
   OrgTier
 } from '@mytutorapp/shared/types';


function baseUrl(u: string) {
  return u.replace(/\/+$/, '');
}
function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** ─────────────────────────────────────────────────────────
 *  File-scoped shapes (so we don't depend on shared/types)
 *  ───────────────────────────────────────────────────────── */
export type OrgResp = {
  id: string;
  name: string;
  slug?: string | null;

  // Plan & seats
  tier?: OrgTier | null;
  seats?: number | null;

  // Owner/admin hints
  owner_user_id?: number | string | null;
  owner_email?: string | null;

  // Branding & policy
  logo_url?: string | null;
  signature_url?: string | null;
  certificate_title?: string | null;
  default_pass_mark?: number | null;   // %
  quiz_time_limit_s?: number | null;   // seconds
  allow_retry?: boolean | null;
  email_domain?: string | null;
  webhook_url?: string | null;

  // Misc
  seats_used?: number | null;
  created_at?: string | null;
  updated_at?: string | null;

  [k: string]: any;
};

export type OrgUsageResp = { seats_used: number };

export type OrgAnalyticsRow = {
  bucket: string;               // ISO from SQL date_trunc
  attempts: number;
  passes: number;
  avg_score: number | null;
};
export type OrgAnalyticsResponse = {
  ok: boolean;
  data: OrgAnalyticsRow[];
};

export type CreateAssignmentBody = {
  courseId: string;
  title_override?: string | null;
  pass_mark?: number | null;
  timer_s?: number | null;
  due_at?: string | null;       // ISO or null
};

/** GET /api/user/me — used to discover org membership(s) on the user object */
export async function fetchCurrentUser(
  backendUrl: string,
  token: string
): Promise<CurrentUser> {
  const url = `${baseUrl(backendUrl)}/api/user/me`;
  const res = await axios.get<CurrentUser>(url, { headers: authHeaders(token) });
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
    { headers: authHeaders(token) }
  );
  return res.data;
}

/** GET /api/orgs/mine — current user's primary org */
/** GET /api/orgs/mine — current user's primary org
 * Accepts either {id,...} or { ok, org:{id,...} } and always returns Org.
 */

/** GET /api/orgs/:orgId/usage — seats used */
export async function getOrgUsage(
  backendUrl: string,
  token: string,
  orgId: string
): Promise<OrgUsageResp> {
  const url = `${baseUrl(backendUrl)}/api/orgs/${encodeURIComponent(orgId)}/usage`;
  const res = await axios.get<OrgUsageResp>(url, { headers: authHeaders(token) });
  return res.data;
}

/** PUT /api/orgs/:orgId/branding — update branding/settings */
export async function updateOrgBranding(
  backendUrl: string,
  token: string,
  orgId: string,
  body: Record<string, any>
): Promise<OrgResp> {
  const url = `${baseUrl(backendUrl)}/api/orgs/${encodeURIComponent(orgId)}/branding`;
  const res = await axios.put<OrgResp>(url, body, { headers: authHeaders(token) });
  return res.data;
}

/** POST /api/orgs/:orgId/assignments — create assignment (returns invite_code) */
export async function createOrgAssignment(
  backendUrl: string,
  token: string,
  orgId: string,
  body: CreateAssignmentBody
): Promise<{ invite_code: string } & Record<string, any>> {
  const url = `${baseUrl(backendUrl)}/api/orgs/${encodeURIComponent(orgId)}/assignments`;
  const res = await axios.post(url, body, { headers: authHeaders(token) });
  return res.data;
}

/** GET /api/orgs/:orgId/analytics?period=month|term|year */
export async function getOrgAnalytics(
  backendUrl: string,
  token: string,
  orgId: string,
  period: 'month' | 'term' | 'year' = 'month'
): Promise<OrgAnalyticsResponse> {
  const url = `${baseUrl(backendUrl)}/api/orgs/${encodeURIComponent(orgId)}/analytics?period=${encodeURIComponent(period)}`;
  const res = await axios.get<OrgAnalyticsResponse>(url, { headers: authHeaders(token) });
  return res.data;
}

/** POST /api/orgs/:orgId/upgrade — change tier */
export async function upgradeOrgTier(
  backendUrl: string,
  token: string,
  orgId: string,
  tier: OrgTier
): Promise<{ tier: OrgTier; seats: number }> {
  const url = `${baseUrl(backendUrl)}/api/orgs/${encodeURIComponent(orgId)}/upgrade`;
  const res = await axios.post(url, { tier }, { headers: authHeaders(token) });
  return res.data;
}

/** POST /api/orgs/:orgId/reports:test-send — send a test email report */
export async function sendOrgReportTest(
  backendUrl: string,
  token: string,
  orgId: string,
  to?: string
): Promise<{ ok: boolean }> {
  const url = `${baseUrl(backendUrl)}/api/orgs/${encodeURIComponent(orgId)}/reports:test-send`;
  const res = await axios.post(url, { to }, { headers: authHeaders(token) });
  return res.data;
}

/** POST /api/orgs/:orgId/reports:send — queue a report for a given bucket/period */
export async function sendOrgReportRow(
  backendUrl: string,
  token: string,
  orgId: string,
  bucket: string,
  period: 'month' | 'term' | 'year'
): Promise<{ ok: boolean }> {
  const url = `${baseUrl(backendUrl)}/api/orgs/${encodeURIComponent(orgId)}/reports:send`;
  const res = await axios.post(url, { bucket, period }, { headers: authHeaders(token) });
  return res.data;
}

export async function getMyOrg(
  backendUrl: string,
  token: string
): Promise<OrgResp> {
  const url = `${baseUrl(backendUrl)}/api/orgs/mine`;
  const res = await axios.get(url, { headers: authHeaders(token) });
  const data = res.data;
  return (data && typeof data === 'object' && 'org' in data
    ? (data as any).org
    : data) as OrgResp;
} // <-- this } was missing
