import { Client, Account, Databases, ID, Query } from 'appwrite';

const client = new Client();

client
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('695f65ac002951c845ea');

export const account = new Account(client);
export const databases = new Databases(client);

export { ID, Query };

// --- JWT for calling our own backend -------------------------------------
//
// The app still authenticates directly against Appwrite (createEmailPasswordSession,
// account.get(), etc. below) — Appwrite remains the identity provider. But
// everything else (services, stock, expenses, workers, reports) now goes
// through our Express API instead of the Appwrite database SDK, so the
// backend can enforce business logic and RBAC instead of trusting this
// browser code. See ../../../backend and lib/api.js.
//
// Appwrite JWTs are short-lived (~15 min), so we mint one lazily and cache
// it until it's close to expiry rather than minting on every single request.
let cachedJwt = null;
let cachedJwtExpiresAt = 0;

export async function getBackendAuthToken() {
  const now = Date.now();
  if (cachedJwt && now < cachedJwtExpiresAt) {
    return cachedJwt;
  }
  const { jwt } = await account.createJWT();
  cachedJwt = jwt;
  cachedJwtExpiresAt = now + 10 * 60 * 1000; // refresh a few minutes early
  return jwt;
}

export function clearBackendAuthToken() {
  cachedJwt = null;
  cachedJwtExpiresAt = 0;
}
