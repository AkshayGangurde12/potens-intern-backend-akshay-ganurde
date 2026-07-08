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

describe('GET /api/log/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with entry data when entry exists', async () => {
    repository.findById.mockResolvedValue(mockEntry);

    const res = await request(app)
      .get('/api/log/uuid-1')
      .set('x-api-key', 'test-key');

    expect(res.status).toBe(200);
    // Controller returns { entry, verificationStatus } since service now enriches responses
    expect(res.body.data.entry).toMatchObject({ id: 'uuid-1', actor: 'system' });
    expect(typeof res.body.data.verificationStatus).toBe('boolean');
  });

  it('returns 404 when entry does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/log/nonexistent')
      .set('x-api-key', 'test-key');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Log entry not found' });
  });

  it('returns 401 when API key is missing', async () => {
    const res = await request(app).get('/api/log/uuid-1');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });
});
