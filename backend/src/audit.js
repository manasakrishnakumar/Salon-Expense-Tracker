import { createMine } from './repo.js';
import { env } from './config/env.js';

/**
 * Best-effort accountability trail for actions that matter once more than
 * one person can act on the same salon's data (restocking, deleting an
 * expense, deactivating/inviting a worker, ...). Deliberately swallows its
 * own errors — an audit-log write failing must never take down the actual
 * action it's describing.
 */
export async function recordAudit(user, action, { targetCollection, targetId, message } = {}) {
  try {
    await createMine(env.collections.auditLog, {
      ownerId: user.ownerId,
      actorId: user.id,
      actorName: user.name || '',
      action,
      targetCollection: targetCollection || '',
      targetId: targetId || '',
      message: message || '',
    });
  } catch (err) {
    console.error(`Failed to write audit log for action "${action}":`, err.message);
  }
}
