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

/** Adds a plain attribution name (no login). See inviteWorker for actual accounts. */
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
 * Creates a login account for a worker and returns the temp password
 * directly to the admin (shown on screen). No email is sent.
 * The worker must change their password after first login via
 * the "Change Password" option in the sidebar.
 */
export async function inviteWorker(req, res) {
  const { name, email } = req.body;

  if (!name || !email) {
    throw new HttpError(400, 'name and email are required');
  }

  // Generate a readable temp password — shown to admin on screen, never stored
  const tempPassword =
    Math.random().toString(36).slice(-4).toUpperCase() +
    Math.random().toString(36).slice(-4) +
    Math.floor(Math.random() * 90 + 10);

  // Create the Appwrite account
  let newUser;
  try {
    newUser = await users.create(ID.unique(), email, undefined, tempPassword, name);
  } catch (err) {
    const status = err?.code === 409 ? 409 : 500;
    const message = err?.code === 409
      ? `An account for ${email} already exists. Ask them to use "Forgot Password" on the login page.`
      : `Failed to create account: ${err?.message || 'Unknown error'}`;
    return res.status(status).json({ error: message });
  }

  // Tag as a worker scoped to this owner
  await users.updatePrefs(newUser.$id, { role: 'worker', ownerId: req.user.ownerId });

  await recordAudit(req.user, 'worker.invite', {
    targetId: newUser.$id,
    message: `Created login account for worker ${email} — credentials shown to admin`,
  });

  // Return tempPassword to admin so they can share it manually with the worker
  res.status(201).json({
    worker: { id: newUser.$id, name: newUser.name, email: newUser.email },
    tempPassword,
  });
}
