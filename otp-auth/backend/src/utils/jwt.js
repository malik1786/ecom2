require('dotenv').config();
const jwt = require('jsonwebtoken');

/**
 * Generate a short‑lived access token (default 15m)
 */
function generateAccessToken(userId, expiresIn = '15m') {
  return jwt.sign({ sub: userId, type: 'access' }, process.env.JWT_ACCESS_SECRET, {
    expiresIn,
  });
}

/**
 * Generate a long‑lived refresh token (default 30d)
 */
function generateRefreshToken(userId, expiresIn = '30d') {
  return jwt.sign({ sub: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn,
  });
}

/**
 * Verify a token. `expectedType` can be 'access', 'refresh', or 'reset'.
 * Returns the decoded payload on success or null on failure.
 */
function verifyRefreshToken(token, expectedType = 'refresh') {
  try {
    const secret =
      expectedType === 'access'
        ? process.env.JWT_ACCESS_SECRET
        : expectedType === 'refresh'
        ? process.env.JWT_REFRESH_SECRET
        : process.env.JWT_ACCESS_SECRET; // reset tokens use access secret
    const payload = jwt.verify(token, secret);
    if (payload.type !== expectedType) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
};
