import { describe, it, expect, jest } from '@jest/globals';
import { requireRole } from '../middleware/requireRole.js';

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('requireRole', () => {
  it('calls next when the caller has an allowed role', () => {
    const req = { user: { role: 'owner' } };
    const res = mockRes();
    const next = jest.fn();

    requireRole('owner', 'manager')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects with 403 when the role is not in the allowed list', () => {
    const req = { user: { role: 'worker' } };
    const res = mockRes();
    const next = jest.fn();

    requireRole('owner')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects with 401 when there is no authenticated user at all', () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    requireRole('owner')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
