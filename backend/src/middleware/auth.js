import { Account } from 'node-appwrite';
import { clientAsUser, users } from '../config/appwrite.js';

/**
 * Verifies the caller's identity with Appwrite and attaches their role +
 * tenant (ownerId).
 *
 * Flow: the web/mobile client logs in via the Appwrite client SDK as usual,
 * then calls `account.createJWT()` and sends that JWT as
 * `Authorization: Bearer <jwt>` on every request to THIS API. We hand the
 * JWT back to Appwrite (`account.get()`) to confirm it's genuine and find
 * out who it belongs to — the browser/app never gets to just assert an
 * identity, Appwrite has to vouch for it.
 *
 * role/ownerId live in that Appwrite user's own `prefs`, writable only via
 * the server-side Users API (this backend's secret key) — never by the
 * client. Every collection is scoped by `ownerId` (the salon), not by
 * whoever happens to be logged in, so an owner and their invited workers
 * all read/write the same tenant's data instead of each getting their own
 * empty one.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, jwt] = header.split(' ');

    if (scheme !== 'Bearer' || !jwt) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const account = new Account(clientAsUser(jwt));
    const identity = await account.get();

    const { role, ownerId } = await resolveRoleAndOwner(identity.$id);

    req.user = {
      id: identity.$id,
      email: identity.email,
      name: identity.name,
      role,
      ownerId,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

/**
 * A brand-new, self-registered account has no prefs yet — that absence IS
 * the signal that they just signed up as their own salon's owner, so we
 * bootstrap them as owner-of-self and persist it (self-healing: only
 * happens once per account). An invited worker's prefs are written by the
 * owner's invite call (see controllers/workers.controller.js) BEFORE they
 * ever log in, so by the time this code runs for them, prefs already say
 * role: 'worker' with someone else's ownerId — bootstrap never fires.
 */
async function resolveRoleAndOwner(userId) {
  const prefs = await users.getPrefs(userId).catch(() => ({}));

  if (prefs?.role && prefs?.ownerId) {
    return { role: prefs.role, ownerId: prefs.ownerId };
  }

  await users.updatePrefs(userId, { role: 'owner', ownerId: userId });
  return { role: 'owner', ownerId: userId };
}
