'use strict';

// Set env before loading modules that read config at import time
process.env.PORT = '3000';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://u:p@localhost/test';
process.env.API_KEY = 'test-secret-key';

const { requireApiKey } = require('../../src/middlewares/auth.middleware');

function mockReqRes(headerValue) {
  const req = { headers: headerValue !== undefined ? { 'x-api-key': headerValue } : {} };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('requireApiKey middleware', () => {
  it('calls next() when the correct key is provided', () => {
    const { req, res, next } = mockReqRes('test-secret-key');
    requireApiKey(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when x-api-key header is missing', () => {
    const { req, res, next } = mockReqRes(undefined);
    requireApiKey(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when x-api-key value is wrong', () => {
    const { req, res, next } = mockReqRes('wrong-key');
    requireApiKey(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for empty string key', () => {
    const { req, res, next } = mockReqRes('');
    requireApiKey(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
