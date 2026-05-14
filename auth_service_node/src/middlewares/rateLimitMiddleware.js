const redisClient = require('../config/redis');

/**
 * Enterprise Rate Limiter (Redis-backed)
 * Prevents brute force on login/OTP attempts
 */
const rateLimiter = (windowMs, maxAttempts) => {
    return async (req, res, next) => {
        const ip = req.ip;
        const key = `rate_limit:${req.path}:${ip}`;

        try {
            const requests = await redisClient.incr(key);

            if (requests === 1) {
                await redisClient.expire(key, Math.floor(windowMs / 1000));
            }

            if (requests > maxAttempts) {
                return res.status(429).json({
                    error: 'TOO_MANY_REQUESTS',
                    message: `Please try again after ${windowMs / (60 * 1000)} minutes.`
                });
            }

            next();
        } catch (err) {
            console.error('Rate Limiter Error:', err);
            next(); // Allow request if redis fails (fail-open strategy for UX)
        }
    };
};

module.exports = rateLimiter;
