'use strict';

process.env.PORT = '3000';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://u:p@localhost/test';
process.env.API_KEY = 'test-key';

const request = require('supertest');

// Mock the database module before app is loaded
jest.mock('../../src/config/database', () => ({
  prisma: {
    $queryRawUnsafe: jest.fn(),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  },
}));

const { prisma } = require('../../src/config/database');
const { createApp } = require('../../src/app');

const app = createApp();

describe('GET /health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with status ok when DB is reachable', async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([{ '?column?': 1 }]);

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('ok');
    expect(new Date(res.body.timestamp).getTime()).not.toBeNaN();
  });

  it('returns 503 with status degraded when DB is unreachable', async () => {
    prisma.$queryRawUnsafe.mockRejectedValue(new Error('connection refused'));

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.database).toBe('unreachable');
  });

  it('returns 503 when DB probe times out', async () => {
    prisma.$queryRawUnsafe.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 2000))
    );

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.database).toBe('unreachable');
  }, 5000);
});
