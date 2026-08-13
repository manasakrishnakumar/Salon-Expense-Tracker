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

describe('GET /api/services — price merge + role-based sanitization', () => {
  it('a never-priced service reports price: null', async () => {
    const res = await auth(request(app).get('/api/services/diamond_facial'), ownerJwt);
    expect(res.status).toBe(200);
    expect(res.body.service.price).toBeNull();
  });

  it('owner sees cost and per-product cost breakdown', async () => {
    const res = await auth(request(app).get('/api/services/diamond_facial'), ownerJwt);
    expect(res.body.service.cost).toBe(139.7);
    expect(res.body.service.products[0].cost).toBeGreaterThan(0);
  });

  it('worker does NOT see cost or per-product cost, but keeps product names/quantities', async () => {
    const res = await auth(request(app).get('/api/services/diamond_facial'), workerJwt);
    expect(res.body.service.cost).toBeUndefined();
    expect(res.body.service.products[0].cost).toBeUndefined();
    expect(res.body.service.products[0].name).toBe('CLEANSER');
  });
});

describe('PUT /api/services/:id/price', () => {
  it('owner can set a price', async () => {
    const put = await auth(request(app).put('/api/services/diamond_facial/price'), ownerJwt).send({ price: 500 });
    expect(put.status).toBe(200);
    expect(put.body.price.price).toBe(500);

    const get = await auth(request(app).get('/api/services/diamond_facial'), ownerJwt);
    expect(get.body.service.price).toBe(500);
  });

  it('worker is blocked from setting a price', async () => {
    const res = await auth(request(app).put('/api/services/diamond_facial/price'), workerJwt).send({ price: 500 });
    expect(res.status).toBe(403);
  });

  it('rejects a negative price', async () => {
    const res = await auth(request(app).put('/api/services/diamond_facial/price'), ownerJwt).send({ price: -10 });
    expect(res.status).toBe(400);
  });

  it('404s for a service not in the catalog', async () => {
    const res = await auth(request(app).put('/api/services/does_not_exist/price'), ownerJwt).send({ price: 100 });
    expect(res.status).toBe(404);
  });

  it('updating a price twice overwrites rather than duplicating', async () => {
    await auth(request(app).put('/api/services/diamond_facial/price'), ownerJwt).send({ price: 400 });
    await auth(request(app).put('/api/services/diamond_facial/price'), ownerJwt).send({ price: 450 });

    const get = await auth(request(app).get('/api/services/diamond_facial'), ownerJwt);
    expect(get.body.service.price).toBe(450);
  });
});

describe('PUT /api/services/prices (bulk)', () => {
  it('sets multiple prices in one call', async () => {
    const res = await auth(request(app).put('/api/services/prices'), ownerJwt).send({
      prices: [
        { serviceId: 'hair_cut', price: 150 },
        { serviceId: 'beard', price: 80 },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);

    const catalog = await auth(request(app).get('/api/services'), ownerJwt);
    const hairCut = catalog.body.services.find((s) => s.id === 'hair_cut');
    expect(hairCut.price).toBe(150);
  });

  it('404s the whole batch if any serviceId is unknown', async () => {
    const res = await auth(request(app).put('/api/services/prices'), ownerJwt).send({
      prices: [{ serviceId: 'hair_cut', price: 150 }, { serviceId: 'nope', price: 10 }],
    });
    expect(res.status).toBe(404);
  });
});

describe('Service-record price snapshotting', () => {
  it('a service record captures the price at the time it was recorded', async () => {
    await auth(request(app).put('/api/services/diamond_facial/price'), ownerJwt).send({ price: 500 });

    const res = await auth(request(app).post('/api/service-records'), ownerJwt).send({
      serviceId: 'diamond_facial',
      quantity: 2,
    });
    expect(res.body.record.unitPrice).toBe(500);
    expect(res.body.record.totalPrice).toBe(1000);
  });

  it('an unpriced service records totalPrice 0, not an error', async () => {
    const res = await auth(request(app).post('/api/service-records'), ownerJwt).send({
      serviceId: 'diamond_facial', // never priced in this test
      quantity: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body.record.totalPrice).toBe(0);
  });
});
