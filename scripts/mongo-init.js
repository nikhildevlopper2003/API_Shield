// MongoDB initialization script
// Runs once when the container is first created

db = db.getSiblingDB('apishield');

// Create collections with schema validation
db.createCollection('users');
db.createCollection('ratepolicies');
db.createCollection('blockedips');
db.createCollection('requestlogs');
db.createCollection('metricsnapshots');

// Indexes for performance
db.users.createIndex({ apiKey: 1 }, { unique: true, sparse: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ isActive: 1 });

db.blockedips.createIndex({ ip: 1 }, { unique: true });
db.blockedips.createIndex({ isActive: 1 });
db.blockedips.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

db.requestlogs.createIndex({ timestamp: -1 });
db.requestlogs.createIndex({ type: 1, timestamp: -1 });
db.requestlogs.createIndex({ ip: 1, timestamp: -1 });
db.requestlogs.createIndex({ userId: 1, timestamp: -1 });

db.metricsnapshots.createIndex({ timestamp: -1 });

print('✅ APIShield database initialized');
