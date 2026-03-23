// apps/backend/middleware/authOptional.js
import authUser from './authUser.js';

export default function authOptional(req, res, next) {
  const rawAuth = String(req.headers.authorization || '').trim();
  if (!rawAuth) return next();

  const bearerMatch = rawAuth.match(/^Bearer\s+(.+)$/i);
  if (!bearerMatch) return next();

  const token = String(bearerMatch[1] || '').trim();
  const lowered = token.toLowerCase();
  if (!token || lowered === 'null' || lowered === 'undefined') return next();

  return authUser(req, res, next);
}
