'use strict';

process.env.PORT = '3000';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://u:p@localhost/test';
process.env.API_KEY = 'test-key';

jest.mock('../../src/repositories/log.repository');

const repository = require('../../src/repositories/log.repository');
const { createLogEntry, getLogEntryById, getAllLogEntries } = require('../../src/services/log.service');
const { AppError } = require('../../src/errors/AppError');

describe('log.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLogEntry', () => {
    it('genesis case: previousHash is null and currentHash is a 64-char hex string', async () => {
      repository.findLatest.mockResolvedValue(null);
      repository.create.mockImplementation(async (data) => ({ id: 'uuid-1', ...data }));

      const entry = await createLogEntry({ actor: 'system', action: 'user.login', payload: null });

      expect(repository.findLatest).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledTimes(1);

      const createdArg = repository.create.mock.calls[0][0];
      expect(createdArg.previousHash).toBeNull();
      expect(createdArg.currentHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('chain case: previousHash equals the previous entry currentHash', async () => {
      const prevHash = 'a'.repeat(64);
      repository.findLatest.mockResolvedValue({
        id: 'uuid-0',
        currentHash: prevHash,
      });
      repository.create.mockImplementation(async (data) => ({ id: 'uuid-1', ...data }));

      await createLogEntry({ actor: 'system', action: 'user.logout', payload: null });

      const createdArg = repository.create.mock.calls[0][0];
      expect(createdArg.previousHash).toBe(prevHash);
      expect(createdArg.currentHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('getLogEntryById', () => {
    it('returns the entry when found', async () => {
      const mockEntry = {
        id: 'uuid-1',
        actor: 'system',
        action: 'user.login',
        payload: null,
        previousHash: null,
        currentHash: 'hash-1',
        createdAt: new Date(),
      };
      repository.findById.mockResolvedValue(mockEntry);

      const result = await getLogEntryById('uuid-1');
      expect(result).toEqual(mockEntry);
    });

    it('throws AppError with statusCode 404 when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(getLogEntryById('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
      });

      let thrown;
      try {
        await getLogEntryById('nonexistent');
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(AppError);
      expect(thrown.statusCode).toBe(404);
    });
  });

  describe('getAllLogEntries', () => {
    it('returns correct meta object with page, pageSize, total', async () => {
      const mockData = [{ id: 'uuid-1' }, { id: 'uuid-2' }];
      repository.findAll.mockResolvedValue(mockData);
      repository.count.mockResolvedValue(42);

      const result = await getAllLogEntries(2, 10);

      expect(result.data).toEqual(mockData);
      expect(result.meta).toEqual({ page: 2, pageSize: 10, total: 42 });
    });

    it('uses default pagination (page=1, pageSize=20) when called without args', async () => {
      repository.findAll.mockResolvedValue([]);
      repository.count.mockResolvedValue(0);

      const result = await getAllLogEntries();

      expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 0 });
      expect(repository.findAll).toHaveBeenCalledWith(1, 20);
    });
  });
});
