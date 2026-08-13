import { databases, ID, Query } from './config/appwrite.js';
import { env } from './config/env.js';
import { HttpError } from './middleware/errorHandler.js';

/**
 * Thin, ownership-aware wrappers around the Appwrite server SDK. Every
 * collection in this app scopes documents to the Appwrite user that
 * created them via a `userID` field — these helpers make that scoping the
 * default instead of something each controller has to remember to add.
 */

export async function listMine(collectionId, userId, extraQueries = [], limit = 200) {
  const result = await databases.listDocuments(env.appwrite.databaseId, collectionId, [
    Query.equal('userID', userId),
    Query.orderDesc('$createdAt'),
    Query.limit(limit),
    ...extraQueries,
  ]);
  return result.documents;
}

export function createMine(collectionId, data) {
  return databases.createDocument(env.appwrite.databaseId, collectionId, ID.unique(), data);
}

export function getDoc(collectionId, id) {
  return databases.getDocument(env.appwrite.databaseId, collectionId, id);
}

export function updateDoc(collectionId, id, data) {
  return databases.updateDocument(env.appwrite.databaseId, collectionId, id, data);
}

/**
 * Deletes a document only if it belongs to `userId` — otherwise a user
 * could delete another user's record just by guessing/enumerating IDs.
 */
export async function deleteMine(collectionId, id, userId) {
  const doc = await getDoc(collectionId, id);
  if (doc.userID !== userId) {
    throw new HttpError(403, 'You do not have permission to modify this record');
  }
  await databases.deleteDocument(env.appwrite.databaseId, collectionId, id);
}
