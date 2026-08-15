import { Client, Account, ID } from 'appwrite';

// Appwrite Configuration — used only for identity (login/session/JWT/
// password recovery). Everything else (services, stock, expenses, workers,
// customers, attendance, reports) goes through the backend API instead —
// see lib/api.js. This mirrors web/src/lib/appwrite.js; see that file's
// comments for the full "why."
const client = new Client();

client
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('695f65ac002951c845ea');

export const account = new Account(client);
export { ID };

// --- JWT for calling our own backend -------------------------------------
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
