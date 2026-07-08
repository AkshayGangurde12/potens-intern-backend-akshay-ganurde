'use strict';

process.env.PORT = '3000';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://u:p@localhost/test';
process.env.API_KEY = 'test-key';

const request = require('supertest');
const express = require('express');
const { createApp } = require('../../src/app');
const { notFoundHandler, globalErrorHandler } = require('../../src/middlewares/error.middleware');

const app = createApp();

describe('404 handler', () => {
  it('returns 404 for an unregistered path', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not Found' });
  });

  it('returns 404 for any HTTP method on unknown paths', async () => {
    const res = await request(app).delete('/unknown-path');
    expect(res.status).toBe(404);
  });
});

describe('global error handler', () => {
  it('returns 500 and no stack field for an unexpected error', async () => {
    // Build a minimal express app that throws to exercise globalErrorHandler
    const testApp = express();
    testApp.get('/boom', (_req, _res, next) => next(new Error('unexpected crash')));
    testApp.use(notFoundHandler);
    testApp.use(globalErrorHandler);

    const res = await request(testApp).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal Server Error' });
    expect(res.body.stack).toBeUndefined();
  });

  it('uses AppError statusCode for operational errors', async () => {
    const { AppError } = require('../../src/errors/AppError');
    const testApp = express();
    testApp.get('/oops', (_req, _res, next) =>
      next(new AppError('custom domain error', 422, 'DOMAIN_ERROR'))
    );
    testApp.use(notFoundHandler);
    testApp.use(globalErrorHandler);

    const res = await request(testApp).get('/oops');
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: 'custom domain error' });
    expect(res.body.stack).toBeUndefined();
  });
});
