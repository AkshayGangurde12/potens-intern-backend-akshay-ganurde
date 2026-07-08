'use strict';

process.env.PORT = '3000';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://u:p@localhost/test';
process.env.API_KEY = 'test-key';

jest.mock('../../src/repositories/log.repository');
jest.mock('../../src/config/database', () => ({
  prisma: {
    $queryRawUnsafe: jest.fn(),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  },
}));

const request = require('supertest');
const { createApp } = require('../../src/app');
const repository = require('../../src/repositories/log.repository');

const app = createApp();

const mockEntry = {
  id: 'uuid-1',
  actor: 'system',
  action: 'user.login',
  payload: null,
  previousHash: null,
  currentHash: 'hash-1',
  createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
};

describe('GET /api/logs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with default pagination meta (page=1, pageSize=20, total=1)', async () => {
    repository.findAll.mockResolvedValue([mockEntry]);
    repository.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/logs')
      .set('x-api-key', 'test-key');

    expect(res.status).toBe(200);
    // paginated() returns { success, message, data: [...], meta: {...} }
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 20, total: 1 });
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('reflects custom ?page=2&pageSize=5 in meta', async () => {
    repository.findAll.mockResolvedValue([]);
    repository.count.mockResolvedValue(50);

    const res = await request(app)
      .get('/api/logs?page=2&pageSize=5')
      .set('x-api-key', 'test-key');

    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 2, pageSize: 5, total: 50 });
  });

  it('clamps pageSize=200 to max 100 in meta', async () => {
    repository.findAll.mockResolvedValue([]);
    repository.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/logs?pageSize=200')
      .set('x-api-key', 'test-key');

    expect(res.status).toBe(200);
    expect(res.body.meta.pageSize).toBe(100);
  });

  it('returns 401 when API key is missing', async () => {
    const res = await request(app).get('/api/logs');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });
});
