const User = require('../models/User');
const TokenService = require('../services/TokenService');
const OTPService = require('../services/OTPService');

class AuthController {
    /**
     * Internal Security Middleware helper
     */
    static verifyInternal(req) {
        const secret = req.headers['x-internal-secret'];
        if (!secret || secret !== process.env.INTERNAL_SERVICE_SECRET) {
            console.error('[AUTH-SECURITY] Unauthorized internal access attempt blocked.');
            return false;
        }
        return true;
    }

    /**
     * Set Secure Cookie helper
     */
    static setRefreshCookie(res, token) {
        res.cookie('refreshToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
    }

    /**
     * POST /auth/register
     */
    static async register(req, res) {
        if (!AuthController.verifyInternal(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
        try {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ success: false, error: 'MISSING_FIELDS' });
            
            const existing = await User.findOne({ email });
            if (existing) return res.status(400).json({ success: false, error: 'EMAIL_ALREADY_EXISTS' });

            const user = await User.create({ email, password });
            const tokens = await TokenService.generateTokens(user);

            AuthController.setRefreshCookie(res, tokens.refreshToken);
            res.status(201).json({ 
                success: true, 
                data: { userId: String(user._id), email: user.email, accessToken: tokens.accessToken } 
            });
        } catch (err) {
            res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR' });
        }
    }

    /**
     * POST /auth/login
     */
    static async login(req, res) {
        if (!AuthController.verifyInternal(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
        try {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ success: false, error: 'MISSING_FIELDS' });
            
            const user = await User.findOne({ email });
            if (!user || !(await user.comparePassword(password))) {
                return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS' });
            }

            const tokens = await TokenService.generateTokens(user);
            AuthController.setRefreshCookie(res, tokens.refreshToken);
            
            res.json({ 
                success: true, 
                data: { userId: String(user._id), email: user.email, accessToken: tokens.accessToken } 
            });
        } catch (err) {
            res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR' });
        }
    }

    /**
     * POST /auth/send-otp
     */
    static async sendOTP(req, res) {
        if (!AuthController.verifyInternal(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ success: false, error: 'MISSING_FIELDS' });
            
            const otp = await OTPService.createOTP(email);
            const EmailService = require('../services/EmailService');
            await EmailService.sendOTP(email, otp);
            
            res.json({ success: true, data: { message: 'OTP_SENT_SUCCESSFULLY' } });
        } catch (err) {
            res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR' });
        }
    }

    /**
     * POST /auth/verify-otp
     */
    static async verifyOTP(req, res) {
        if (!AuthController.verifyInternal(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
        try {
            const { email, otp } = req.body;
            if (!email || !otp) return res.status(400).json({ success: false, error: 'MISSING_FIELDS' });
            
            const isValid = await OTPService.verifyOTP(email, otp);
            if (!isValid) return res.status(400).json({ success: false, error: 'INVALID_OTP' });

            let user = await User.findOne({ email });
            if (!user) user = await User.create({ email, isVerified: true });

            const tokens = await TokenService.generateTokens(user);
            AuthController.setRefreshCookie(res, tokens.refreshToken);
            
            res.json({ 
                success: true, 
                data: { userId: String(user._id), email: user.email, accessToken: tokens.accessToken } 
            });
        } catch (err) {
            res.status(400).json({ success: false, error: 'INVALID_REQUEST' });
        }
    }

    /**
     * POST /auth/refresh-token
     */
    static async refreshToken(req, res) {
        if (!AuthController.verifyInternal(req)) return res.status(401).json({ error: 'UNAUTHORIZED' });
        try {
            const { userId } = req.body;
            const refreshToken = req.cookies.refreshToken; // Read from secure cookie
            
            if (!userId || !refreshToken) {
                return res.status(400).json({ success: false, error: 'MISSING_FIELDS_OR_COOKIE' });
            }
            
            const tokens = await TokenService.rotateRefreshToken(userId, refreshToken);
            AuthController.setRefreshCookie(res, tokens.refreshToken);
            
            res.json({ success: true, data: { accessToken: tokens.accessToken } });
        } catch (err) {
            res.status(401).json({ success: false, error: 'SESSION_EXPIRED' });
        }
    }

    /**
     * GET /auth/me
     */
    static async me(req, res) {
        res.json({ success: true, data: { user: req.user } });
    }
}

module.exports = AuthController;
