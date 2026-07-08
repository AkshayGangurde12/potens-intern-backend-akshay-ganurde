'use strict';

process.env.PORT = '3000';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://u:p@localhost/test';
process.env.API_KEY = 'integration-test-key';

const request = require('supertest');
const { createApp } = require('../../src/app');

// Mock the repository so we don't need a real database
jest.mock('../../src/repositories/log.repository');
const repository = require('../../src/repositories/log.repository');

const app = createApp();

describe('POST /api/log', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 201 with the created entry when valid', async () => {
    repository.findLatest.mockResolvedValue(null); // Genesis case
    repository.create.mockResolvedValue({
      id: 'uuid-1',
      actor: 'system',
      action: 'user.login',
      payload: null,
      previousHash: null,
      currentHash: 'hash-1',
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/api/log')
      .set('x-api-key', 'integration-test-key')
      .send({ actor: 'system', action: 'user.login' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id', 'uuid-1');
    expect(res.body.data).toHaveProperty('currentHash');
  });

  it('returns 401 when x-api-key is missing', async () => {
    const res = await request(app)
      .post('/api/log')
      .send({ actor: 'system', action: 'test' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 422 when actor is missing', async () => {
    const res = await request(app)
      .post('/api/log')
      .set('x-api-key', 'integration-test-key')
      .send({ action: 'test' });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Error');
  });

  it('returns 422 when actor exceeds 255 chars', async () => {
    const longActor = 'a'.repeat(256);
    const res = await request(app)
      .post('/api/log')
      .set('x-api-key', 'integration-test-key')
      .send({ actor: longActor, action: 'test' });

    expect(res.status).toBe(422);
  });
});

describe('GET /api/log/:id', () => {
  it('returns 200 with the entry when it exists', async () => {
    repository.findById.mockResolvedValue({
      id: 'uuid-1',
      actor: 'system',
      action: 'test',
      payload: null,
      previousHash: null,
      currentHash: 'hash-1',
      createdAt: new Date(),
    });

    const res = await request(app)
      .get('/api/log/uuid-1')
      .set('x-api-key', 'integration-test-key');

    expect(res.status).toBe(200);
    expect(res.body.data.entry.id).toBe('uuid-1');
  });

  it('returns 404 when entry does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/log/nonexistent')
      .set('x-api-key', 'integration-test-key');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Log entry not found');
  });

  it('returns 401 without API key', async () => {
    const res = await request(app).get('/api/log/uuid-1');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/verify', () => {
  it('returns 200 with verification result', async () => {
    repository.findAllOrdered.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/verify')
      .set('x-api-key', 'integration-test-key');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ success: true, totalEntries: 0 });
  });
});

describe('GET /api/export', () => {
  it('returns 200 with all entries', async () => {
    repository.findFiltered.mockResolvedValue([
      { id: '1', actor: 'a', action: 'b', payload: null, previousHash: null, currentHash: 'h1', createdAt: new Date() },
    ]);

    const res = await request(app)
      .get('/api/export')
      .set('x-api-key', 'integration-test-key');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});
