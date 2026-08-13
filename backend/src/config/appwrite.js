import { Client, Databases, Users, Messaging, ID, Query } from 'node-appwrite';
import { env } from './env.js';

/**
 * Server-side Appwrite client, authenticated with a secret API key.
 * This NEVER runs in a browser/app — it only lives here, on the backend.
 * It is what lets our API bypass per-user Appwrite permissions and enforce
 * our own business rules (RBAC, stock deduction, validation) instead.
 */
export const serverClient = new Client()
  .setEndpoint(env.appwrite.endpoint)
  .setProject(env.appwrite.projectId)
  .setKey(env.appwrite.apiKey);

/**
 * Per-request Appwrite client, authenticated as the calling user via a
 * short-lived JWT (see middleware/auth.js). Used when an action should be
 * attributable to that specific user rather than the server identity.
 */
export function clientAsUser(jwt) {
  return new Client()
    .setEndpoint(env.appwrite.endpoint)
    .setProject(env.appwrite.projectId)
    .setJWT(jwt);
}

export const databases = new Databases(serverClient);
export const users = new Users(serverClient);
export const messaging = new Messaging(serverClient);
export { ID, Query };
