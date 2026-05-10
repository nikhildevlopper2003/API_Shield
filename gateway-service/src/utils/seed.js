require('dotenv').config();

const crypto = require('crypto');
const { connectDB } = require('../config/database');
const { connectRedis } = require('../config/redis');
const User = require('../models/User.model');
const RatePolicy = require('../models/RatePolicy.model');
const logger = require('../utils/logger');

const generateKey = () => `ask_${crypto.randomBytes(24).toString('hex')}`;

async function seed() {
  await connectDB();
  await connectRedis();

  logger.info('🌱 Seeding database...');

  // ── Rate Policies ─────────────────────────────────────────────
  const freePlan = await RatePolicy.findOneAndUpdate(
    { name: 'Free' },
    {
      name: 'Free',
      description: 'Free tier — 60 req/min',
      requestsPerWindow: 60,
      windowSeconds: 60,
      isDefault: true,
      violationsBeforeBlock: 5
    },
    { upsert: true, new: true }
  );

  const proPlan = await RatePolicy.findOneAndUpdate(
    { name: 'Pro' },
    {
      name: 'Pro',
      description: 'Pro tier — 1000 req/min',
      requestsPerWindow: 1000,
      windowSeconds: 60,
      violationsBeforeBlock: 10
    },
    { upsert: true, new: true }
  );

  const enterprisePlan = await RatePolicy.findOneAndUpdate(
    { name: 'Enterprise' },
    {
      name: 'Enterprise',
      description: 'Enterprise — 10000 req/min',
      requestsPerWindow: 10000,
      windowSeconds: 60,
      violationsBeforeBlock: 20
    },
    { upsert: true, new: true }
  );

  logger.info('✅ Rate policies created:', [
    freePlan.name,
    proPlan.name,
    enterprisePlan.name
  ]);

  // ── API Keys ─────────────────────────────────────────────────
  const adminApiKey = process.env.ADMIN_API_KEY || generateKey();
  const testApiKey = process.env.TEST_API_KEY || generateKey();

  // 🔥 CRITICAL FIX: direct Mongo update (no middleware interference)

  await User.updateOne(
    { email: 'admin@apishield.dev' },
    {
      $set: {
        email: 'admin@apishield.dev',
        name: 'Admin User',
        role: 'admin',
        isActive: true,
        ratePolicyId: enterprisePlan._id,
        apiKey: adminApiKey
      }
    },
    { upsert: true }
  );

  await User.updateOne(
    { email: 'test@example.com' },
    {
      $set: {
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        isActive: true,
        ratePolicyId: freePlan._id,
        apiKey: testApiKey
      }
    },
    { upsert: true }
  );

  // 🔥 Always fetch fresh from DB
  const adminUser = await User.findOne({ email: 'admin@apishield.dev' });
  const testUser = await User.findOne({ email: 'test@example.com' });

  logger.info('✅ Users created');

  logger.info(`🔑 Admin API Key: ${adminUser?.apiKey}`);
  logger.info(`🔑 Test API Key:  ${testUser?.apiKey}`);
  logger.info('');
  logger.info('Use these in your requests or .env:');
  logger.info(`ADMIN_API_KEY=${adminUser?.apiKey}`);
  logger.info(`TEST_API_KEY=${testUser?.apiKey}`);

  process.exit(0);
}

seed().catch((err) => {
  logger.error('❌ Seed failed:', err);
  process.exit(1);
});