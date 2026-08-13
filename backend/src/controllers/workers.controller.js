import { env } from '../config/env.js';
import { databases, users, ID, Query } from '../config/appwrite.js';
import { createMine, getDoc, updateDoc } from '../repo.js';
import { HttpError } from '../middleware/errorHandler.js';
import { recordAudit } from '../audit.js';

// Everything here is owner-only at the route level.

export async function listWorkers(req, res) {
  const result = await databases.listDocuments(env.appwrite.databaseId, env.collections.workers, [
    Query.equal('userID', req.user.ownerId),
    Query.equal('isActive', true),
    Query.orderAsc('name'),
    Query.limit(100),
  ]);
  res.json({ workers: result.documents });
}

/** Adds a plain attribution name (for the service-record "who did this"
 * picker) — no login attached. See inviteWorker for actual accounts. */
export async function createWorker(req, res) {
  const trimmed = req.body.name.trim();

  const existing = await databases.listDocuments(env.appwrite.databaseId, env.collections.workers, [
    Query.equal('userID', req.user.ownerId),
    Query.equal('isActive', true),
    Query.limit(200),
  ]);
  if (existing.documents.some((w) => w.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new HttpError(409, 'Worker already exists');
  }

  const worker = await createMine(env.collections.workers, {
    userID: req.user.ownerId,
    name: trimmed,
    isActive: true,
  });

  res.status(201).json({ worker });
}

export async function deactivateWorker(req, res) {
  const doc = await getDoc(env.collections.workers, req.params.id);
  if (doc.userID !== req.user.ownerId) {
    throw new HttpError(403, 'You do not have permission to modify this record');
  }
  const worker = await updateDoc(env.collections.workers, req.params.id, { isActive: false });
  await recordAudit(req.user, 'worker.deactivate', {
    targetCollection: env.collections.workers,
    targetId: req.params.id,
    message: `Deactivated staff entry "${doc.name}"`,
  });
  res.json({ worker });
}

/**
 * Gives a real member of staff their own login, scoped to this owner's
 * salon: creates the Appwrite account server-side, then writes
 * {role: 'worker', ownerId} into their prefs BEFORE they ever log in — so
 * requireAuth's bootstrap-as-owner path never fires for them (see
 * middleware/auth.js).
 *
 * We have no email service wired up, so the temp password is returned in
 * the response for the owner to hand over directly; the worker should
 * change it after first login.
 */
export async function inviteWorker(req, res) {
  const { name, email, password } = req.body;

  const newUser = await users.create(ID.unique(), email, undefined, password, name);
  await users.updatePrefs(newUser.$id, { role: 'worker', ownerId: req.user.ownerId });

  await recordAudit(req.user, 'worker.invite', {
    targetId: newUser.$id,
    message: `Invited ${email} as a worker`,
  });

  res.status(201).json({
    worker: { id: newUser.$id, name: newUser.name, email: newUser.email },
    tempPassword: password,
    note: 'Share these credentials with the worker directly — they should change their password after first login.',
  });
}
