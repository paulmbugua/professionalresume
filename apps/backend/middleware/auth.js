// apps/backend/middleware/auth.js
import jwt from 'jsonwebtoken';

/**
 * Minimal bearer-auth middleware:
 *  - Reads Authorization: Bearer <jwt>
 *  - Verifies with JWT_SECRET
 *  - Attaches req.user = { id }
 */
export function requireAuth(req, res, next) {
  try {
    const raw = req.headers.authorization || req.headers.Authorization || '';
    const [scheme, token] = String(raw).split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded?.id ?? decoded?.userId ?? decoded?.sub;
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    req.user = { id };
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

// ✅ Provide default export so `import requireAuth from '../middleware/auth.js'` works
export default requireAuth;
