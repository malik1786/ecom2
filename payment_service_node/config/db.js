const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = (process.env.MONGO_URI || '').trim();

  if (!mongoUri) {
    console.warn('⚠️  [DB] MONGO_URI is missing. Payment service running without persistence.');
    return { connected: false, degraded: true, reason: 'MONGO_URI_MISSING' };
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`✅ [DB] Connected to MongoDB: ${conn.connection.host}`);
    return { connected: true, degraded: false, uri: mongoUri };
  } catch (error) {
    console.error(`❌ [DB] MongoDB connection failed: ${error.message}`);
    console.warn('⚠️  [DB] Payment service running without persistence (requests will be rejected).');
    return { connected: false, degraded: true, reason: 'MONGO_CONNECT_FAILED', error: error.message };
  }
};

module.exports = connectDB;

