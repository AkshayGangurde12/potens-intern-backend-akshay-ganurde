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
const { buildGenesisHash, buildChainHash } = require('../../src/services/hash.service');

const app = createApp();

describe('GET /api/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 success:true totalEntries:0 for empty chain', async () => {
    repository.findAllOrdered.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/verify')
      .set('x-api-key', 'test-key');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ success: true, totalEntries: 0 });
  });

  it('returns 200 success:true for a valid chain of 2 entries', async () => {
    const ts1 = new Date('2024-01-15T10:00:00.000Z');
    const ts2 = new Date('2024-01-15T11:00:00.000Z');

    const hash1 = buildGenesisHash('system', 'user.login', null, ts1);
    const hash2 = buildChainHash('admin', 'order.placed', null, hash1, ts2);

    const entries = [
      { id: 'uuid-1', actor: 'system', action: 'user.login', payload: null, previousHash: null, currentHash: hash1, createdAt: ts1 },
      { id: 'uuid-2', actor: 'admin', action: 'order.placed', payload: null, previousHash: hash1, currentHash: hash2, createdAt: ts2 },
    ];

    repository.findAllOrdered.mockResolvedValue(entries);

    const res = await request(app)
      .get('/api/verify')
      .set('x-api-key', 'test-key');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ success: true, totalEntries: 2 });
  });

  it('returns 200 success:false with brokenEntryId for a tampered chain', async () => {
    const ts1 = new Date('2024-01-15T10:00:00.000Z');
    const ts2 = new Date('2024-01-15T11:00:00.000Z');

    const hash1 = buildGenesisHash('system', 'user.login', null, ts1);
    const tamperedHash = 'deadbeef'.repeat(8);

    const entries = [
      { id: 'uuid-1', actor: 'system', action: 'user.login', payload: null, previousHash: null, currentHash: hash1, createdAt: ts1 },
      { id: 'uuid-2', actor: 'admin', action: 'order.placed', payload: null, previousHash: hash1, currentHash: tamperedHash, createdAt: ts2 },
    ];

    repository.findAllOrdered.mockResolvedValue(entries);

    const res = await request(app)
      .get('/api/verify')
      .set('x-api-key', 'test-key');

    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(false);
    expect(res.body.data.brokenEntryId).toBe('uuid-2');
  });

  it('returns 401 when API key is missing', async () => {
    const res = await request(app).get('/api/verify');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });
});
