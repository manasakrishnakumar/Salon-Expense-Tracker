import { env } from '../config/env.js';
import { databases, users, ID, Query } from '../config/appwrite.js';
import { sendWorkerInviteEmail } from '../config/email.js';
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
 * Gives a real member of staff their own login, scoped to this owner's salon.
 * - Password is generated SERVER-SIDE — never sent back to the admin.
 * - Credentials are emailed directly to the worker via Gmail SMTP (Nodemailer).
 * - The worker is prompted in the email to change their password after first login.
 *
 * Requires SMTP_USER and SMTP_PASS env vars to be set on the server.
 */
export async function inviteWorker(req, res) {
  const { name, email } = req.body;

  if (!name || !email) {
    throw new HttpError(400, 'name and email are required');
  }

  // Generate a secure temp password server-side — admin never sees this
  const tempPassword =
    Math.random().toString(36).slice(-5) +
    Math.random().toString(36).slice(-5).toUpperCase() +
    Math.floor(Math.random() * 90 + 10);

  // Create the Appwrite account
  const newUser = await users.create(ID.unique(), email, undefined, tempPassword, name);
  // Tag them as a worker scoped to this owner, before they ever log in
  await users.updatePrefs(newUser.$id, { role: 'worker', ownerId: req.user.ownerId });

  // Send credentials directly to the worker's email
  const loginUrl = env.corsOrigin;
  const emailSent = await sendWorkerInviteEmail({
    toEmail: email,
    toName: name,
    password: tempPassword,
    loginUrl,
  });

  await recordAudit(req.user, 'worker.invite', {
    targetId: newUser.$id,
    message: emailSent
      ? `Invited ${email} as a worker — credentials emailed directly to them`
      : `Invited ${email} as a worker — email delivery skipped (SMTP not configured)`,
  });

  res.status(201).json({
    worker: { id: newUser.$id, name: newUser.name, email: newUser.email },
    emailSent,
    note: emailSent
      ? `✅ Login credentials have been sent directly to ${email}. They should log in and change their password.`
      : `⚠️ Account created but email could not be sent — SMTP not configured. Please set SMTP_USER and SMTP_PASS in your Render environment variables.`,
  });
}
