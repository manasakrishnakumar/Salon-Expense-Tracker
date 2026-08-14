import { Account } from 'node-appwrite';
import { clientAsUser, users } from '../config/appwrite.js';
import { verifyToken } from '../controllers/authProxy.controller.js';

/**
 * Accepts EITHER:
 *  (A) Our own signed JWT from /api/auth/login  [primary — works cross-domain]
 *  (B) An Appwrite JWT (for backward-compat with any existing sessions)
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    // ── Try our own JWT first ─────────────────────────────────────────────
    try {
      const payload = verifyToken(token);
      req.user = {
        id:      payload.userId,
        email:   payload.email,
        name:    payload.name,
        role:    payload.role,
        ownerId: payload.ownerId,
      };
      return next();
    } catch {
      // Not our JWT — fall through to Appwrite JWT
    }

    // ── Fallback: Appwrite JWT (old sessions / localhost dev) ─────────────
    const account = new Account(clientAsUser(token));
    const identity = await account.get();
    const { role, ownerId } = await resolveRoleAndOwner(identity.$id);

    req.user = {
      id:      identity.$id,
      email:   identity.email,
      name:    identity.name,
      role,
      ownerId,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

async function resolveRoleAndOwner(userId) {
  const prefs = await users.getPrefs(userId).catch(() => ({}));
  if (prefs?.role && prefs?.ownerId) {
    return { role: prefs.role, ownerId: prefs.ownerId };
  }
  await users.updatePrefs(userId, { role: 'owner', ownerId: userId });
  return { role: 'owner', ownerId: userId };
}
