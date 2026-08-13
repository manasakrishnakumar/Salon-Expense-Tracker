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

describe('POST /api/restock', () => {
  it('owner can restock', async () => {
    const res = await auth(request(app).post('/api/restock'), ownerJwt).send({
      productName: 'CLEANSER', quantityAdded: 500, unit: 'g', purchasePrice: 750,
    });
    expect(res.status).toBe(201);
    expect(res.body.restock.productName).toBe('CLEANSER');
  });

  it('worker is blocked from restocking', async () => {
    const res = await auth(request(app).post('/api/restock'), workerJwt).send({
      productName: 'CLEANSER', quantityAdded: 500,
    });
    expect(res.status).toBe(403);
  });

  it('rejects a non-positive quantity', async () => {
    const res = await auth(request(app).post('/api/restock'), ownerJwt).send({
      productName: 'CLEANSER', quantityAdded: -5,
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/products/status', () => {
  it('reflects restock minus consumption from actual service records', async () => {
    await auth(request(app).post('/api/restock'), ownerJwt).send({ productName: 'CLEANSER', quantityAdded: 500 });
    // diamond_facial uses CLEANSER 10g; record it twice = 20g consumed
    await auth(request(app).post('/api/service-records'), ownerJwt).send({ serviceId: 'diamond_facial', quantity: 2 });

    const res = await auth(request(app).get('/api/products/status'), ownerJwt);
    expect(res.status).toBe(200);
    expect(res.body.stock.CLEANSER.totalRestocked).toBe(500);
    expect(res.body.stock.CLEANSER.totalUsed).toBe(20);
    expect(res.body.stock.CLEANSER.remaining).toBe(480);
  });

  it('is owner-only', async () => {
    const res = await auth(request(app).get('/api/products/status'), workerJwt);
    expect(res.status).toBe(403);
  });
});

describe('Reports (all owner-only)', () => {
  it('daily report requires a date and is blocked for a worker', async () => {
    const blocked = await auth(request(app).get('/api/reports/daily?date=2026-08-08'), workerJwt);
    expect(blocked.status).toBe(403);

    const missingDate = await auth(request(app).get('/api/reports/daily'), ownerJwt);
    expect(missingDate.status).toBe(400);

    const ok = await auth(request(app).get('/api/reports/daily?date=2026-08-08'), ownerJwt);
    expect(ok.status).toBe(200);
  });

  it('monthly report coerces month/year from query strings', async () => {
    const res = await auth(request(app).get('/api/reports/monthly?month=8&year=2026'), ownerJwt);
    expect(res.status).toBe(200);
    expect(res.body.month).toBe(8);
    expect(res.body.year).toBe(2026);
  });

  it('forecast endpoint returns both projections and a runout list', async () => {
    const res = await auth(request(app).get('/api/reports/forecast'), ownerJwt);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('expenseForecast');
    expect(res.body).toHaveProperty('serviceCostForecast');
    expect(res.body).toHaveProperty('stockRunout');
  });
});

describe('Expense ownership check on delete', () => {
  it("an owner cannot delete another salon's expense", async () => {
    const created = await auth(request(app).post('/api/expenses'), ownerJwt).send({
      name: 'Rent', amount: 5000, category: 'rent', date: '2026-08-01',
    });

    fake._seedIdentity({ id: 'other_owner', prefs: { role: 'owner', ownerId: 'other_owner' } });
    const otherOwnerJwt = fake._mintJwtFor('other_owner');

    const del = await auth(request(app).delete(`/api/expenses/${created.body.expense.$id}`), otherOwnerJwt);
    expect(del.status).toBe(403);
  });
});
