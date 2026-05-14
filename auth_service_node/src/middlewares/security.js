const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Brute Force Protection
 */
exports.authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login/OTP requests per window
    message: { error: 'TOO_MANY_ATTEMPTS', message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * JWT Authentication Middleware
 */
exports.protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password -otp -resetToken');

        if (!user) {
            return res.status(401).json({ error: 'USER_NOT_FOUND' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'INVALID_TOKEN' });
    }
};
