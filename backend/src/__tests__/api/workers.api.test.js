import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createFakeAppwrite } from '../../testUtils/fakeAppwrite.js';

const fake = createFakeAppwrite();
jest.unstable_mockModule('node-appwrite', () => fake);

process.env.APPWRITE_ENDPOINT ??= 'https://example.invalid/v1';
process.env.APPWRITE_PROJECT_ID ??= 'test-project';
process.env.APPWRITE_API_KEY ??= 'test-key';
process.env.APPWRITE_DATABASE_ID ??= 'test-db';

const { createApp } = await import('../../app.js');
const request = (await import('supertest')).default;

const app = createApp();

const OWNER_ID = 'owner_1';
let ownerJwt;

beforeEach(() => {
  fake._reset();
  fake._seedIdentity({ id: OWNER_ID, name: 'Owner One', prefs: { role: 'owner', ownerId: OWNER_ID } });
  ownerJwt = fake._mintJwtFor(OWNER_ID);
});

function auth(req, jwt) {
  return req.set('Authorization', `Bearer ${jwt}`);
}

describe('POST /api/workers (plain attribution name, no login)', () => {
  it('adds a worker name', async () => {
    const res = await auth(request(app).post('/api/workers'), ownerJwt).send({ name: 'Priya' });
    expect(res.status).toBe(201);
    expect(res.body.worker.name).toBe('Priya');
  });

  it('rejects a duplicate name (case-insensitive)', async () => {
    await auth(request(app).post('/api/workers'), ownerJwt).send({ name: 'Priya' });
    const res = await auth(request(app).post('/api/workers'), ownerJwt).send({ name: 'priya' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/workers/invite (real login)', () => {
  it('creates a working login that resolves to role=worker under this owner', async () => {
    const invite = await auth(request(app).post('/api/workers/invite'), ownerJwt).send({
      name: 'Ravi',
      email: 'ravi@example.test',
      password: 'TempPass123!',
    });
    expect(invite.status).toBe(201);
    expect(invite.body.tempPassword).toBe('TempPass123!');

    // Prove the invited account actually works end-to-end: mint it a
    // session the same way a real login eventually would, and confirm the
    // role/tenant it resolves to server-side.
    const newWorkerJwt = fake._mintJwtFor(invite.body.worker.id);

    const blocked = await auth(request(app).get('/api/expenses'), newWorkerJwt);
    expect(blocked.status).toBe(403); // proves role === 'worker'

    const record = await auth(request(app).post('/api/service-records'), newWorkerJwt).send({
      serviceId: 'hair_cut',
      quantity: 1,
    });
    expect(record.body.record.userID).toBe(OWNER_ID); // proves ownerId === the inviting owner
  });

  it('is blocked for a worker-role account (only owners can invite)', async () => {
    fake._seedIdentity({ id: 'worker_1', prefs: { role: 'worker', ownerId: OWNER_ID } });
    const workerJwt = fake._mintJwtFor('worker_1');

    const res = await auth(request(app).post('/api/workers/invite'), workerJwt).send({
      name: 'Someone',
      email: 'someone@example.test',
      password: 'TempPass123!',
    });
    expect(res.status).toBe(403);
  });

  it('rejects a short password (zod validation)', async () => {
    const res = await auth(request(app).post('/api/workers/invite'), ownerJwt).send({
      name: 'Ravi',
      email: 'ravi@example.test',
      password: 'short',
    });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid email', async () => {
    const res = await auth(request(app).post('/api/workers/invite'), ownerJwt).send({
      name: 'Ravi',
      email: 'not-an-email',
      password: 'TempPass123!',
    });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/workers/:id (soft-delete)', () => {
  it('deactivates rather than deleting, and it disappears from the active list', async () => {
    const create = await auth(request(app).post('/api/workers'), ownerJwt).send({ name: 'Priya' });
    const del = await auth(request(app).delete(`/api/workers/${create.body.worker.$id}`), ownerJwt);
    expect(del.status).toBe(200);
    expect(del.body.worker.isActive).toBe(false);

    const list = await auth(request(app).get('/api/workers'), ownerJwt);
    expect(list.body.workers).toHaveLength(0);
  });
});
