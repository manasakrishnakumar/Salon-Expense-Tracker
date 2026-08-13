import { env } from '../config/env.js';
import { databases, Query } from '../config/appwrite.js';
import { listMine, createMine, getDoc, updateDoc } from '../repo.js';
import { HttpError } from '../middleware/errorHandler.js';

export async function listAttendance(req, res) {
  // Owner sees all; worker sees only their own
  const extraQueries = req.user.role === 'worker'
    ? [Query.equal('workerId', req.user.id)]
    : [];
  const records = await listMine(env.collections.attendance, req.user.ownerId, extraQueries, 500);
  res.json({ records, count: records.length });
}

export async function getTodayStatus(req, res) {
  const today = new Date().toISOString().split('T')[0];
  const records = await databases.listDocuments(env.appwrite.databaseId, env.collections.attendance, [
    Query.equal('userID', req.user.ownerId),
    Query.equal('date', today),
    Query.limit(100),
  ]);
  res.json({ records: records.documents, date: today });
}

export async function checkIn(req, res) {
  const { workerName, workerId = '' } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  // Check for existing check-in today
  const existing = await databases.listDocuments(env.appwrite.databaseId, env.collections.attendance, [
    Query.equal('userID', req.user.ownerId),
    Query.equal('workerName', workerName),
    Query.equal('date', today),
    Query.limit(1),
  ]);

  if (existing.documents.length > 0) {
    return res.status(409).json({ error: `${workerName} is already checked in today`, existing: existing.documents[0] });
  }

  const record = await createMine(env.collections.attendance, {
    userID: req.user.ownerId,
    workerName,
    workerId: workerId || '',
    date: today,
    checkIn: now,
    checkOut: '',
    durationMinutes: 0,
  });

  res.status(201).json({ record });
}

export async function checkOut(req, res) {
  const record = await getDoc(env.collections.attendance, req.params.id);
  if (record.userID !== req.user.ownerId) throw new HttpError(403, 'Access denied');
  if (record.checkOut) throw new HttpError(409, 'Already checked out');

  const now = new Date();
  const checkInTime = new Date(record.checkIn);
  const durationMinutes = Math.round((now - checkInTime) / 60000);

  const updated = await updateDoc(env.collections.attendance, req.params.id, {
    checkOut: now.toISOString(),
    durationMinutes,
  });

  res.json({ record: updated });
}
