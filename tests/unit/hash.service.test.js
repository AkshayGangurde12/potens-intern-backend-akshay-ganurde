'use strict';

const {
  computeHash,
  buildGenesisHash,
  buildChainHash,
  verifyChain,
  GENESIS_PREVIOUS_HASH,
} = require('../../src/services/hash.service');

describe('hash.service', () => {
  const ts = new Date('2024-01-15T10:00:00.000Z');
  const actor = 'system';
  const action = 'user.login';
  const payload = { userId: '42' };

  describe('computeHash', () => {
    it('is deterministic — same input always returns same hash', () => {
      const a = computeHash({ actor, action, payload, previousHash: '0', timestamp: ts });
      const b = computeHash({ actor, action, payload, previousHash: '0', timestamp: ts });
      expect(a).toBe(b);
    });

    it('returns a 64-character hex string (SHA-256)', () => {
      const h = computeHash({ actor, action, payload: null, previousHash: '0', timestamp: ts });
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    });

    it('changes when any field changes', () => {
      const base = { actor, action, payload, previousHash: '0', timestamp: ts };
      const h1 = computeHash(base);
      const h2 = computeHash({ ...base, actor: 'other' });
      const h3 = computeHash({ ...base, action: 'user.logout' });
      const h4 = computeHash({ ...base, payload: null });
      expect(h1).not.toBe(h2);
      expect(h1).not.toBe(h3);
      expect(h1).not.toBe(h4);
    });
  });

  describe('buildGenesisHash', () => {
    it('uses the sentinel "0" as previousHash internally', () => {
      const genesis = buildGenesisHash(actor, action, payload, ts);
      const manual = computeHash({ actor, action, payload, previousHash: GENESIS_PREVIOUS_HASH, timestamp: ts });
      expect(genesis).toBe(manual);
    });
  });

  describe('buildChainHash', () => {
    it('uses the provided previousHash', () => {
      const prev = 'abc123';
      const chain = buildChainHash(actor, action, payload, prev, ts);
      const manual = computeHash({ actor, action, payload, previousHash: prev, timestamp: ts });
      expect(chain).toBe(manual);
    });

    it('produces a different hash than genesis for same content', () => {
      const genesis = buildGenesisHash(actor, action, payload, ts);
      const chain = buildChainHash(actor, action, payload, 'someprevhash', ts);
      expect(genesis).not.toBe(chain);
    });
  });

  describe('verifyChain', () => {
    it('returns valid:true, totalEntries:0 for empty array', () => {
      expect(verifyChain([])).toEqual({ valid: true, totalEntries: 0 });
    });

    it('validates a single genesis entry', () => {
      const h = buildGenesisHash(actor, action, payload, ts);
      const entries = [{ id: '1', actor, action, payload, previousHash: null, currentHash: h, createdAt: ts }];
      expect(verifyChain(entries)).toEqual({ valid: true, totalEntries: 1 });
    });

    it('validates a two-entry chain', () => {
      const h1 = buildGenesisHash(actor, action, payload, ts);
      const ts2 = new Date('2024-01-15T11:00:00.000Z');
      const h2 = buildChainHash('admin', 'order.placed', null, h1, ts2);
      const entries = [
        { id: '1', actor, action, payload, previousHash: null, currentHash: h1, createdAt: ts },
        { id: '2', actor: 'admin', action: 'order.placed', payload: null, previousHash: h1, currentHash: h2, createdAt: ts2 },
      ];
      expect(verifyChain(entries)).toEqual({ valid: true, totalEntries: 2 });
    });

    it('detects tampering in the genesis entry', () => {
      const h = buildGenesisHash(actor, action, payload, ts);
      const entries = [{ id: '1', actor, action, payload, previousHash: null, currentHash: 'tampered', createdAt: ts }];
      const result = verifyChain(entries);
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe('1');
      expect(result.totalEntries).toBe(1);
    });

    it('detects tampering in a middle entry and reports its id', () => {
      const h1 = buildGenesisHash(actor, action, null, ts);
      const ts2 = new Date('2024-01-15T11:00:00.000Z');
      const ts3 = new Date('2024-01-15T12:00:00.000Z');
      const h2 = buildChainHash('a', 'b', null, h1, ts2);
      const h3 = buildChainHash('c', 'd', null, h2, ts3);
      const entries = [
        { id: '1', actor, action, payload: null, previousHash: null, currentHash: h1, createdAt: ts },
        { id: '2', actor: 'a', action: 'b', payload: null, previousHash: h1, currentHash: 'tampered_middle', createdAt: ts2 },
        { id: '3', actor: 'c', action: 'd', payload: null, previousHash: h2, currentHash: h3, createdAt: ts3 },
      ];
      const result = verifyChain(entries);
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe('2');
    });
  });
});
