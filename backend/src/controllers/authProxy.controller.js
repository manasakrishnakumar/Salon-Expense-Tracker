import { env } from '../config/env.js';
import { users } from '../config/appwrite.js';

/**
 * Proxy login: calls Appwrite REST API server-side so the browser never
 * touches Appwrite directly. This bypasses the cross-domain cookie blocking
 * that breaks auth on production (Vercel domain ≠ Appwrite domain).
 *
 * Returns the session secret so the frontend can call client.setSession()
 * which uses the X-Appwrite-Session header instead of a cookie.
 */
export async function proxyLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const appwriteRes = await fetch(`${env.appwrite.endpoint}/account/sessions/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': env.appwrite.projectId,
        'X-SDK-Name':        'appwrite-ssr-proxy',
        'X-SDK-Platform':    'server',
        'X-SDK-Language':    'nodejs',
        'X-SDK-Version':     '14.0.0',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await appwriteRes.json();

    if (!appwriteRes.ok) {
      return res.status(appwriteRes.status).json({
        error: data.message || 'Invalid email or password',
      });
    }

    // The session secret is set in the Set-Cookie header as:
    //   a_session_<projectId>=<secret>
    // We extract it and send it to the browser so it can use
    // client.setSession(secret) — header-based, cross-domain safe.
    const setCookie = appwriteRes.headers.get('set-cookie') || '';
    const match = setCookie.match(/a_session_[a-zA-Z0-9]+=([^;,\s]+)/);
    const sessionSecret = match ? decodeURIComponent(match[1]) : null;

    // Also fetch the user's prefs so the frontend knows the role immediately
    let prefs = {};
    try {
      prefs = await users.getPrefs(data.userId);
    } catch {/* ignore — frontend will fetch separately */}

    return res.json({
      sessionId:     data.$id,
      sessionSecret,
      userId:        data.userId,
      role:          prefs.role   || 'owner',
      ownerId:       prefs.ownerId || data.userId,
    });
  } catch (err) {
    console.error('[proxyLogin] error:', err.message);
    return res.status(500).json({ error: 'Authentication service unavailable. Try again.' });
  }
}

/**
 * Proxy logout: deletes the Appwrite session server-side.
 */
export async function proxyLogout(req, res) {
  const { sessionId } = req.body;
  if (!sessionId) return res.json({ ok: true });

  try {
    await fetch(`${env.appwrite.endpoint}/account/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'X-Appwrite-Project': env.appwrite.projectId,
        'X-Appwrite-Session': sessionId,
      },
    });
  } catch {/* best-effort */}

  return res.json({ ok: true });
}
