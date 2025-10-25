// apps/backend/middleware/authOptional.js
import authUser from './authUser.js';

export default function authOptional(req, res, next) {
  const hasAuth = !!req.headers.authorization;
  if (!hasAuth) return next();
  return authUser(req, res, next);
}
