'use strict';

process.env.PORT = '3000';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://u:p@localhost/test';
process.env.API_KEY = 'test-key';

jest.mock('../../src/repositories/log.repository');
jest.mock('../../src/config/database', () => ({
  prisma: { $queryRawUnsafe: jest.fn(), $disconnect: jest.fn().mockResolvedValue(undefined) },
}));

const request = require('supertest');
const { createApp } = require('../../src/app');
const repository = require('../../src/repositories/log.repository');

const app = createApp();

describe('GET /api/export', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with empty array when store is empty', async () => {
    repository.findFiltered.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/export')
      .set('x-api-key', 'test-key');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns 200 with all entries when store has 2 entries', async () => {
    repository.findFiltered.mockResolvedValue([
      { id: 'uuid-1', actor: 'system', action: 'user.login', payload: null, previousHash: null, currentHash: 'hash-1', createdAt: new Date().toISOString() },
      { id: 'uuid-2', actor: 'admin', action: 'order.placed', payload: { orderId: '99' }, previousHash: 'hash-1', currentHash: 'hash-2', createdAt: new Date().toISOString() },
    ]);

    const res = await request(app)
      .get('/api/export')
      .set('x-api-key', 'test-key');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].id).toBe('uuid-1');
    expect(res.body.data[1].id).toBe('uuid-2');
  });

  it('returns 401 when API key is missing', async () => {
    const res = await request(app).get('/api/export');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });
});
