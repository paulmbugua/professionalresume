import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const OAUTH_STATE_COOKIE = 'cvpro_oauth_state';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const OAUTH_CODE_TTL_MS = 60 * 1000;

const oauthStateStore = new Map();
const oauthCodeStore = new Map();

const now = () => Date.now();

const isProd = process.env.NODE_ENV === 'production';

const APP_FRONTEND_URL =
  process.env.FRONTEND_URL?.trim() || 'https://onedollarcvpro.com';

const createToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });

function getAllowedFrontendHosts() {
  const configured = new URL(APP_FRONTEND_URL).host.toLowerCase();
  const hosts = new Set([configured]);
  if (configured.startsWith('www.')) {
    hosts.add(configured.slice(4));
  } else {
    hosts.add(`www.${configured}`);
  }
  if (!isProd) {
    hosts.add('localhost:3000');
    hosts.add('127.0.0.1:3000');
  }
  return hosts;
}

function sanitizeFrontendOrigin(raw, fallback = APP_FRONTEND_URL) {
  try {
    const fallbackUrl = new URL(fallback);
    const candidate = new URL(String(raw || fallback));
    if (candidate.protocol !== 'https:' && candidate.protocol !== 'http:') {
      return fallbackUrl.origin;
    }
    if (isProd && candidate.protocol !== 'https:') {
      return fallbackUrl.origin;
    }
    if (!getAllowedFrontendHosts().has(candidate.host.toLowerCase())) {
      return fallbackUrl.origin;
    }
    return candidate.origin;
  } catch {
    return new URL(fallback).origin;
  }
}

function sanitizeInternalPath(raw, fallback = '/builder') {
  const input = String(raw || '').trim();
  if (!input) return fallback;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(input)) return fallback;
  if (input.startsWith('//')) return fallback;
  if (!input.startsWith('/')) return fallback;
  return input.replace(/\/{2,}/g, '/');
}

function parseCookieHeader(cookieHeader) {
  const out = {};
  const raw = String(cookieHeader || '');
  if (!raw) return out;
  for (const pair of raw.split(';')) {
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

function buildSetCookie(name, value, maxAgeSec) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${maxAgeSec}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (isProd) parts.push('Secure');
  return parts.join('; ');
}

function clearCookieHeader(name) {
  const parts = [`${name}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax'];
  if (isProd) parts.push('Secure');
  return parts.join('; ');
}

function frontendUrl(pathname, params = {}, frontendOrigin = APP_FRONTEND_URL) {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const base = new URL(sanitizeFrontendOrigin(frontendOrigin));
  const url = new URL(path, base);
  Object.entries(params).forEach(([k, v]) => {
    if (typeof v === 'string' && v.length) url.searchParams.set(k, v);
  });
  return url.toString();
}

function consumeValidOAuthState(state) {
  const saved = oauthStateStore.get(state);
  if (!saved) return null;
  oauthStateStore.delete(state);
  if (saved.expiresAt < now()) return null;
  return saved;
}

function consumeOAuthCode(code) {
  const saved = oauthCodeStore.get(code);
  if (!saved) return null;
  oauthCodeStore.delete(code);
  if (saved.expiresAt < now()) return null;
  return saved;
}

async function upsertGoogleUser({ email, displayName, googleId }) {
  const emailNorm = String(email || '')
    .trim()
    .toLowerCase();
  const { rows } = await pool.query(
    `
    INSERT INTO users (name, email, google_id, role)
    VALUES ($1, $2, $3, 'user')
    ON CONFLICT ((lower(email))) WHERE deleted_at IS NULL DO UPDATE
    SET
      name       = CASE WHEN COALESCE(users.name, '') = '' THEN EXCLUDED.name ELSE users.name END,
      google_id  = COALESCE(users.google_id, EXCLUDED.google_id),
      role       = COALESCE(users.role, 'user'),
      updated_at = NOW()
    RETURNING id
    `,
    [displayName || emailNorm, emailNorm, googleId],
  );
  return rows[0];
}

export async function startGoogleOAuth(req, res) {
  const returnTo = sanitizeInternalPath(req.query?.returnTo, '/builder');
  const frontendOrigin = sanitizeFrontendOrigin(req.query?.frontendOrigin);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL;
  if (
    !clientId ||
    !callbackUrl ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.JWT_SECRET
  ) {
    return res.redirect(
      frontendUrl(
        '/login',
        { authError: 'google_oauth_unavailable', returnTo },
        frontendOrigin,
      ),
    );
  }

  const state = crypto.randomBytes(24).toString('hex');
  oauthStateStore.set(state, {
    returnTo,
    frontendOrigin,
    expiresAt: now() + OAUTH_STATE_TTL_MS,
  });

  res.setHeader(
    'Set-Cookie',
    buildSetCookie(OAUTH_STATE_COOKIE, state, OAUTH_STATE_TTL_MS / 1000),
  );

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  return res.redirect(authUrl.toString());
}

export async function handleGoogleOAuthCallback(req, res) {
  const callbackState = String(req.query?.state || '');
  const code = String(req.query?.code || '');
  const oauthError = String(req.query?.error || '');
  const cookies = parseCookieHeader(req.headers.cookie);
  const stateCookie = String(cookies[OAUTH_STATE_COOKIE] || '');

  res.setHeader('Set-Cookie', clearCookieHeader(OAUTH_STATE_COOKIE));

  const safeState = consumeValidOAuthState(callbackState);
  const returnTo = sanitizeInternalPath(safeState?.returnTo, '/builder');
  const frontendOrigin = sanitizeFrontendOrigin(safeState?.frontendOrigin);

  if (oauthError) {
    return res.redirect(
      frontendUrl(
        '/login',
        { authError: oauthError, returnTo },
        frontendOrigin,
      ),
    );
  }

  if (
    !callbackState ||
    !stateCookie ||
    callbackState !== stateCookie ||
    !safeState
  ) {
    return res.redirect(
      frontendUrl(
        '/login',
        { authError: 'oauth_state_mismatch', returnTo },
        frontendOrigin,
      ),
    );
  }

  if (!code) {
    return res.redirect(
      frontendUrl(
        '/login',
        { authError: 'missing_oauth_code', returnTo },
        frontendOrigin,
      ),
    );
  }

  try {
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResp.ok) {
      return res.redirect(
        frontendUrl(
          '/login',
          { authError: 'google_token_exchange_failed', returnTo },
          frontendOrigin,
        ),
      );
    }

    const tokenJson = await tokenResp.json();
    const accessToken = String(tokenJson?.access_token || '');
    if (!accessToken) {
      return res.redirect(
        frontendUrl(
          '/login',
          { authError: 'google_access_token_missing', returnTo },
          frontendOrigin,
        ),
      );
    }

    const profileResp = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!profileResp.ok) {
      return res.redirect(
        frontendUrl(
          '/login',
          { authError: 'google_profile_fetch_failed', returnTo },
          frontendOrigin,
        ),
      );
    }

    const profile = await profileResp.json();
    const email = String(profile?.email || '')
      .trim()
      .toLowerCase();
    const emailVerified = Boolean(profile?.email_verified);
    const googleId = String(profile?.sub || '');
    const name = String(profile?.name || '')
      .trim()
      .slice(0, 80);

    if (!email) {
      return res.redirect(
        frontendUrl(
          '/login',
          { authError: 'google_email_missing', returnTo },
          frontendOrigin,
        ),
      );
    }
    if (!emailVerified) {
      return res.redirect(
        frontendUrl(
          '/login',
          { authError: 'google_email_unverified', returnTo },
          frontendOrigin,
        ),
      );
    }
    if (!googleId) {
      return res.redirect(
        frontendUrl(
          '/login',
          { authError: 'google_subject_missing', returnTo },
          frontendOrigin,
        ),
      );
    }

    const user = await upsertGoogleUser({ email, displayName: name, googleId });
    const token = createToken(user.id);
    const authCode = crypto.randomBytes(24).toString('hex');
    oauthCodeStore.set(authCode, {
      token,
      expiresAt: now() + OAUTH_CODE_TTL_MS,
    });

    return res.redirect(
      frontendUrl('/login', { authCode, returnTo }, frontendOrigin),
    );
  } catch (error) {
    console.error('[google-oauth/callback] error', error);
    return res.redirect(
      frontendUrl(
        '/login',
        { authError: 'google_callback_failed', returnTo },
        frontendOrigin,
      ),
    );
  }
}

export async function exchangeGoogleAuthCode(req, res) {
  const code = String(req.body?.code || '').trim();
  if (!code) {
    return res
      .status(400)
      .json({ success: false, message: 'Missing auth code' });
  }
  const saved = consumeOAuthCode(code);
  if (!saved) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid or expired auth code' });
  }

  return res.json({
    success: true,
    token: saved.token,
    message: 'Google login successful',
  });
}

setInterval(() => {
  const ts = now();
  for (const [k, v] of oauthStateStore.entries()) {
    if (v.expiresAt < ts) oauthStateStore.delete(k);
  }
  for (const [k, v] of oauthCodeStore.entries()) {
    if (v.expiresAt < ts) oauthCodeStore.delete(k);
  }
}, 60 * 1000).unref?.();
