import { env } from '../config/env.js';
import { users } from '../config/appwrite.js';
import crypto from 'crypto';

// ── Our own signed token (no extra deps needed — Node crypto built-in) ─────
// Uses HMAC-SHA256 with the Appwrite API key as the secret so we don't need
// a separate JWT_SECRET env var in production.
const SECRET = process.env.JWT_SECRET ||
  ('salon-pro-v1-' + (env.appwrite.apiKey || '').slice(0, 32));

function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body   = Buffer.from(JSON.stringify({
    ...payload,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token) {
  const parts = (token || '').split('.');
  if (parts.length !== 3) throw new Error('Bad token format');
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  if (sig !== expected) throw new Error('Invalid token signature');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload.exp < Date.now()) throw new Error('Token expired');
  return payload;
}

/**
 * POST /api/auth/login
 * Calls Appwrite server-to-server (no CORS/cookie issue),
 * then issues our own signed JWT so the frontend never needs
 * account.createJWT() (which requires an Appwrite client session).
 */
export async function proxyLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // 1. Verify credentials with Appwrite (server-to-server)
  const appwriteRes = await fetch(`${env.appwrite.endpoint}/account/sessions/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': env.appwrite.projectId,
      'X-SDK-Platform': 'server',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await appwriteRes.json();
  if (!appwriteRes.ok) {
    return res.status(appwriteRes.status).json({
      error: data.message || 'Invalid email or password',
    });
  }

  // 2. Get role/ownerId from Appwrite user prefs (admin SDK)
  let prefs = {};
  try { prefs = await users.getPrefs(data.userId); } catch { /* new user, bootstrap later */ }

  const role    = prefs.role    || 'owner';
  const ownerId = prefs.ownerId || data.userId;

  // If brand-new owner (no prefs yet), bootstrap them now
  if (!prefs.role) {
    try {
      await users.updatePrefs(data.userId, { role: 'owner', ownerId: data.userId });
    } catch { /* non-fatal */ }
  }

  // 3. Fetch full user record for name/email
  let userRecord = { name: email, email };
  try { userRecord = await users.get(data.userId); } catch { /* non-fatal */ }

  // 4. Sign our own JWT — frontend stores this, sends as Bearer token
  const token = signToken({
    userId:  data.userId,
    email:   userRecord.email,
    name:    userRecord.name,
    role,
    ownerId,
  });

  return res.json({
    token,
    user: {
      $id:     data.userId,
      email:   userRecord.email,
      name:    userRecord.name,
      role,
      ownerId,
    },
  });
}

/**
 * GET /api/auth/me
 * Verifies stored token and returns fresh user data.
 * Called on every page load to restore session.
 */
export async function proxyMe(req, res) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const payload = verifyToken(token);

    // Refresh prefs in case role/ownerId changed
    let prefs = {};
    try { prefs = await users.getPrefs(payload.userId); } catch { /* non-fatal */ }

    return res.json({
      user: {
        $id:     payload.userId,
        email:   payload.email,
        name:    payload.name,
        role:    prefs.role    || payload.role,
        ownerId: prefs.ownerId || payload.ownerId,
      },
    });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
}

/**
 * POST /api/auth/change-password
 * Changes password via Appwrite Admin SDK (no client session needed).
 */
export async function proxyChangePassword(req, res) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Not authenticated' });

  let payload;
  try { payload = verifyToken(token); } catch (e) { return res.status(401).json({ error: e.message }); }

  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    await users.updatePassword(payload.userId, newPassword);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Failed to change password' });
  }
}
