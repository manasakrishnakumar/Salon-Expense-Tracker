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

beforeEach(() => fake._reset());

describe('requireAuth wiring', () => {
  it('rejects a request with no Authorization header', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed Authorization header', async () => {
    const res = await request(app).get('/api/services').set('Authorization', 'not-a-bearer-token');
    expect(res.status).toBe(401);
  });

  it('rejects a JWT that does not correspond to any session', async () => {
    const res = await request(app).get('/api/services').set('Authorization', 'Bearer totally-invalid');
    expect(res.status).toBe(401);
  });

  it('accepts a valid JWT and lets a fresh (prefs-less) account through', async () => {
    fake._seedIdentity({ id: 'user_new' }); // no prefs -> triggers owner-of-self bootstrap
    const jwt = fake._mintJwtFor('user_new');

    const res = await request(app).get('/api/services').set('Authorization', `Bearer ${jwt}`);
    expect(res.status).toBe(200);
    expect(res.body.services.length).toBe(83);
  });
});

describe('owner-of-self bootstrap', () => {
  it('a brand-new account becomes an owner of its own data on first request', async () => {
    fake._seedIdentity({ id: 'user_fresh' });
    const jwt = fake._mintJwtFor('user_fresh');

    // Expenses is owner-only — a freshly bootstrapped account must pass as 'owner'.
    const res = await request(app).get('/api/expenses').set('Authorization', `Bearer ${jwt}`);
    expect(res.status).toBe(200);
    expect(res.body.expenses).toEqual([]);
  });
});

describe('requireRole wiring end-to-end (not just the unit-tested middleware)', () => {
  it('blocks a worker-role account from an owner-only route', async () => {
    fake._seedIdentity({ id: 'user_worker', prefs: { role: 'worker', ownerId: 'user_owner' } });
    const jwt = fake._mintJwtFor('user_worker');

    const res = await request(app).get('/api/expenses').set('Authorization', `Bearer ${jwt}`);
    expect(res.status).toBe(403);
  });

  it('allows an owner-role account through the same route', async () => {
    fake._seedIdentity({ id: 'user_owner', prefs: { role: 'owner', ownerId: 'user_owner' } });
    const jwt = fake._mintJwtFor('user_owner');

    const res = await request(app).get('/api/expenses').set('Authorization', `Bearer ${jwt}`);
    expect(res.status).toBe(200);
  });
});
