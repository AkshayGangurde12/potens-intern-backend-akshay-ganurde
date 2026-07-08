'use strict';

process.env.PORT = '3000';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://u:p@localhost/test';
process.env.API_KEY = 'test-key';

const { validateBody } = require('../../src/middlewares/validate.middleware');
const { CreateLogSchema } = require('../../src/validators/log.validator');

function mockReqRes(body) {
  const req = { body };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('validateBody middleware', () => {
  const middleware = validateBody(CreateLogSchema);

  it('calls next() and sets req.body when body is valid', () => {
    const { req, res, next } = mockReqRes({ actor: 'system', action: 'user.login' });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body).toMatchObject({ actor: 'system', action: 'user.login' });
  });

  it('returns 422 with details when actor is missing', () => {
    const { req, res, next } = mockReqRes({ action: 'user.login' });
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation Error',
        details: expect.any(Array),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 422 when actor exceeds 255 characters', () => {
    const longActor = 'a'.repeat(256);
    const { req, res, next } = mockReqRes({ actor: longActor, action: 'user.login' });
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Validation Error' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 422 when action is missing', () => {
    const { req, res, next } = mockReqRes({ actor: 'system' });
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation Error',
        details: expect.any(Array),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('passes when payload is null (optional field)', () => {
    const { req, res, next } = mockReqRes({ actor: 'system', action: 'user.login', payload: null });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('passes when payload is a valid object', () => {
    const { req, res, next } = mockReqRes({
      actor: 'system',
      action: 'user.login',
      payload: { userId: '42', role: 'admin' },
    });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body.payload).toEqual({ userId: '42', role: 'admin' });
  });
});
