const mongoose = require('mongoose');
const connectDB = require('../config/db');

function isDbConnected() {
  return mongoose.connection?.readyState === 1;
}

module.exports = async function requireDb(req, res, next) {
  if (isDbConnected()) return next();

  try {
    await connectDB();
  } catch {
    // connectDB logs and returns a state; ignore exceptions
  }

  if (isDbConnected()) return next();

  return res.status(503).json({
    success: false,
    error: 'DB_NOT_CONNECTED',
    message: 'DB_NOT_CONNECTED',
    debug: {
      db_saved: false,
      payment_processed: false,
      errors: ['DB_NOT_CONNECTED'],
    },
  });
};

