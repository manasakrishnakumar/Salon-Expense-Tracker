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
const WORKER_ID = 'worker_1';
let ownerJwt, workerJwt;

beforeEach(() => {
  fake._reset();
  fake._seedIdentity({ id: OWNER_ID, name: 'Owner One', prefs: { role: 'owner', ownerId: OWNER_ID } });
  fake._seedIdentity({ id: WORKER_ID, name: 'Worker One', prefs: { role: 'worker', ownerId: OWNER_ID } });
  ownerJwt = fake._mintJwtFor(OWNER_ID);
  workerJwt = fake._mintJwtFor(WORKER_ID);
});

function auth(req, jwt) {
  return req.set('Authorization', `Bearer ${jwt}`);
}

describe('POST /api/service-records', () => {
  it('computes cost server-side from the catalog, ignoring anything a client might send', async () => {
    const res = await auth(request(app).post('/api/service-records'), ownerJwt).send({
      serviceId: 'diamond_facial',
      quantity: 2,
      workerName: 'Ravi',
      // A malicious/buggy client throwing in its own numbers should have zero effect:
      unitCost: 1,
      totalCost: 1,
      totalPrice: 999999,
    });

    expect(res.status).toBe(201);
    expect(res.body.record.unitCost).toBe(139.7);
    expect(res.body.record.totalCost).toBe(279.4);
    expect(res.body.record.userID).toBe(OWNER_ID);
  });

  it('rejects a request missing the required serviceId (zod validation)', async () => {
    const res = await auth(request(app).post('/api/service-records'), ownerJwt).send({ quantity: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('404s for a serviceId not in the catalog', async () => {
    const res = await auth(request(app).post('/api/service-records'), ownerJwt).send({
      serviceId: 'does_not_exist',
      quantity: 1,
    });
    expect(res.status).toBe(404);
  });

  it("a worker's own name is used for attribution even if they don't pass workerName", async () => {
    const res = await auth(request(app).post('/api/service-records'), workerJwt).send({
      serviceId: 'hair_cut',
      quantity: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body.record.recordedByUserId).toBe(WORKER_ID);
    expect(res.body.record.WorkerName).toBe('Worker One');
    expect(res.body.record.userID).toBe(OWNER_ID); // still scoped to the salon, not the worker
  });
});

describe('GET /api/service-records — visibility differs by role', () => {
  async function seedOneRecordFromEachRole() {
    await auth(request(app).post('/api/service-records'), ownerJwt).send({ serviceId: 'hair_cut', quantity: 1 });
    await auth(request(app).post('/api/service-records'), workerJwt).send({ serviceId: 'beard', quantity: 1 });
  }

  it('owner sees every record for the salon', async () => {
    await seedOneRecordFromEachRole();
    const res = await auth(request(app).get('/api/service-records'), ownerJwt);
    expect(res.status).toBe(200);
    expect(res.body.records).toHaveLength(2);
  });

  it('worker sees only the record they personally recorded', async () => {
    await seedOneRecordFromEachRole();
    const res = await auth(request(app).get('/api/service-records'), workerJwt);
    expect(res.status).toBe(200);
    expect(res.body.records).toHaveLength(1);
    expect(res.body.records[0].recordedByUserId).toBe(WORKER_ID);
  });
});

describe('DELETE /api/service-records/:id', () => {
  it('is blocked for a worker', async () => {
    const create = await auth(request(app).post('/api/service-records'), ownerJwt).send({ serviceId: 'hair_cut', quantity: 1 });
    const res = await auth(request(app).delete(`/api/service-records/${create.body.record.$id}`), workerJwt);
    expect(res.status).toBe(403);
  });

  it('works for the owner and actually removes the record', async () => {
    const create = await auth(request(app).post('/api/service-records'), ownerJwt).send({ serviceId: 'hair_cut', quantity: 1 });
    const del = await auth(request(app).delete(`/api/service-records/${create.body.record.$id}`), ownerJwt);
    expect(del.status).toBe(204);

    const list = await auth(request(app).get('/api/service-records'), ownerJwt);
    expect(list.body.records).toHaveLength(0);
  });
});

describe('GET /api/service-records/:id/invoice', () => {
  it('streams a real PDF for a record the owner can see', async () => {
    const create = await auth(request(app).post('/api/service-records'), ownerJwt).send({ serviceId: 'diamond_facial', quantity: 1 });
    const res = await auth(request(app).get(`/api/service-records/${create.body.record.$id}/invoice`), ownerJwt);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('receipt-');
    expect(res.body.length).toBeGreaterThan(500); // a real PDF, not an empty stream
  });

  it("blocks a worker from another worker's receipt", async () => {
    fake._seedIdentity({ id: 'worker_2', prefs: { role: 'worker', ownerId: OWNER_ID } });
    const worker2Jwt = fake._mintJwtFor('worker_2');

    const create = await auth(request(app).post('/api/service-records'), workerJwt).send({ serviceId: 'hair_cut', quantity: 1 });
    const res = await auth(request(app).get(`/api/service-records/${create.body.record.$id}/invoice`), worker2Jwt);

    expect(res.status).toBe(403);
  });
});
