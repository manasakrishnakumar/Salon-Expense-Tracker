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

  // Create the Appwrite account — catch duplicate-email errors gracefully
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

  // Tag them as a worker scoped to this owner, before they ever log in
  await users.updatePrefs(newUser.$id, { role: 'worker', ownerId: req.user.ownerId });

  // ── Send invite email via Appwrite's built-in magic URL system ──────────
  // Appwrite sends from their own verified servers → arrives in any inbox.
  // The worker clicks the link, lands on the login page, and is auto-logged in.
  // They then use "Change Password" to set a permanent password.
  const redirectUrl = `${env.corsOrigin}?magic=1&invited=1`;
  let emailSent = false;
  try {
    await users.createMagicURLToken(newUser.$id, email, redirectUrl, false);
    emailSent = true;
    console.log('[invite] Appwrite magic URL email sent to', email);
  } catch (magicErr) {
    console.error('[invite] Appwrite magic URL failed:', magicErr.message, '— falling back to SMTP/Resend');
    // Fallback: send credentials via Resend/SMTP
    emailSent = await sendWorkerInviteEmail({
      toEmail: email,
      toName: name,
      password: tempPassword,
      loginUrl: env.corsOrigin,
    });
  }

  await recordAudit(req.user, 'worker.invite', {
    targetId: newUser.$id,
    message: emailSent
      ? `Invited ${email} as a worker — login link emailed via Appwrite`
      : `Invited ${email} as a worker — email delivery failed`,
  });

  res.status(201).json({
    worker: { id: newUser.$id, name: newUser.name, email: newUser.email },
    emailSent,
    note: emailSent
      ? `✅ An invitation link has been sent to ${email}. They should click the link to log in, then set a permanent password using "Change Password" in the sidebar.`
      : `⚠️ Account created but the invite email could not be delivered. Please share the login URL manually: ${env.corsOrigin}`,
  });
}

