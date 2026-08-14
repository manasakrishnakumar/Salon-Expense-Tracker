import { Client, Account, Databases, ID, Query } from 'appwrite';

const client = new Client();

client
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('695f65ac002951c845ea');

export const account = new Account(client);
export const databases = new Databases(client);

export { ID, Query };

// ── Session persistence (cross-domain safe) ────────────────────────────────
// Instead of relying on cookies (which are blocked cross-domain by modern
// browsers), we store the Appwrite session secret in localStorage and call
// client.setSession() so the SDK uses the X-Appwrite-Session header instead.
const SESSION_KEY = 'salon_session_secret';

export function saveSession(secret) {
  if (secret) {
    localStorage.setItem(SESSION_KEY, secret);
    client.setSession(secret);
  }
}

export function restoreSession() {
  const secret = localStorage.getItem(SESSION_KEY);
  if (secret) {
    client.setSession(secret);
    return true;
  }
  return false;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  client.setSession('');
}

// ── JWT for calling our Express backend ────────────────────────────────────
// Appwrite JWTs are short-lived (~15 min) so we mint lazily and cache.
let cachedJwt = null;
let cachedJwtExpiresAt = 0;

export async function getBackendAuthToken() {
  const now = Date.now();
  if (cachedJwt && now < cachedJwtExpiresAt) return cachedJwt;
  const { jwt } = await account.createJWT();
  cachedJwt = jwt;
  cachedJwtExpiresAt = now + 10 * 60 * 1000;
  return jwt;
}

export function clearBackendAuthToken() {
  cachedJwt = null;
  cachedJwtExpiresAt = 0;
}
