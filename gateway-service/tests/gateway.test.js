const request = require('supertest');

// Mock all external dependencies
jest.mock('../src/config/database', () => ({
  connectDB: jest.fn().mockResolvedValue(true),
}));
jest.mock('../src/config/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue(true),
  getRedisClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setEx: jest.fn().mockResolvedValue('OK'),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    lLen: jest.fn().mockResolvedValue(0),
    rPush: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
    lRange: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(1),
  }),
}));
jest.mock('../src/models/User.model');
jest.mock('../src/models/BlockedIP.model');
jest.mock('../src/models/RatePolicy.model');

const User = require('../src/models/User.model');
const BlockedIP = require('../src/models/BlockedIP.model');

const { app } = require('../src/app');

describe('Health Endpoints', () => {
  it('GET /health/live → 200', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('alive');
  });

  it('GET / → 200 service info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.service).toMatch(/APIShield/);
  });

  it('GET /nonexistent → 404', async () => {
    const res = await request(app).get('/nonexistent-route-xyz');
    expect(res.status).toBe(404);
  });
});

describe('Auth Middleware', () => {
  beforeEach(() => {
    User.findOne = jest.fn();
    BlockedIP.checkBlocked = jest.fn().mockResolvedValue(false);
  });

  it('returns 401 when x-api-key header missing', async () => {
    const res = await request(app).get('/gateway/ping');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('returns 403 for invalid API key', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app)
      .get('/gateway/ping')
      .set('x-api-key', 'invalid_key_xyz');
    expect(res.status).toBe(403);
  });

  it('passes auth with valid API key', async () => {
    User.findOne.mockResolvedValue({
      _id: 'user123',
      email: 'test@test.com',
      name: 'Test',
      isActive: true,
      ratePolicyId: null,
    });

    const res = await request(app)
      .get('/gateway/ping')
      .set('x-api-key', 'ask_validkey123');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('pong');
  });
});

describe('Block Check Middleware', () => {
  it('returns 403 for blocked IP', async () => {
    User.findOne.mockResolvedValue({
      _id: 'user123',
      email: 'blocked@test.com',
      name: 'Blocked',
      isActive: true,
    });
    BlockedIP.checkBlocked = jest.fn().mockResolvedValue(true);

    const { getRedisClient } = require('../src/config/redis');
    getRedisClient().get.mockResolvedValue('1'); // cached as blocked

    const res = await request(app)
      .get('/gateway/ping')
      .set('x-api-key', 'ask_validkey');
    expect(res.status).toBe(403);
  });
});

describe('Rate Limit Headers', () => {
  it('includes rate limit headers on authenticated requests', async () => {
    User.findOne.mockResolvedValue({
      _id: 'user123',
      email: 'test@test.com',
      name: 'Test',
      isActive: true,
      ratePolicyId: null,
    });
    BlockedIP.checkBlocked = jest.fn().mockResolvedValue(false);

    const { getRedisClient } = require('../src/config/redis');
    getRedisClient().get.mockResolvedValue('0'); // not blocked

    const res = await request(app)
      .get('/gateway/ping')
      .set('x-api-key', 'ask_validkey123');

    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
  });
});
