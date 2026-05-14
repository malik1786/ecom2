const express = require('express');
const AuthController = require('../controllers/AuthController');
const rateLimiter = require('../middlewares/rateLimitMiddleware');
const passport = require('passport');
const { protect } = require('../middlewares/authMiddleware');
const { computeGoogleOAuthState } = require('../config/googleOAuth');

const router = express.Router();
const googleOAuth = computeGoogleOAuthState();

// 1. Standard Auth (with 5 attempts/15min limit)
router.post('/register', rateLimiter(15 * 60 * 1000, 5), AuthController.register);
router.post('/login', rateLimiter(15 * 60 * 1000, 5), AuthController.login);

// 2. OTP Flows
router.post('/send-otp', rateLimiter(10 * 60 * 1000, 3), AuthController.sendOTP);
router.post('/verify-otp', AuthController.verifyOTP);

// 3. Token Management
router.post('/refresh-token', AuthController.refreshToken);

// 3b. Session check
router.get('/me', protect, AuthController.me);

// 4. Google OAuth
if (googleOAuth.enabled) {
  const TokenService = require('../services/TokenService');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  router.get('/google', (req, res, next) => {
    console.log('🚀 [AUTH-DEBUG] Initiating Google OAuth Flow');
    console.log(`[AUTH-DEBUG] CLIENT_ID Present: ${!!process.env.GOOGLE_CLIENT_ID}`);
    console.log(`[AUTH-DEBUG] CLIENT_SECRET Present: ${!!process.env.GOOGLE_CLIENT_SECRET}`);
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
  });
  
  router.get(
    '/google/callback',
    (req, res, next) => {
      console.log('---------------------------------------------------------');
      console.log('📩 [AUTH-DEBUG] CALLBACK ROUTE HIT');
      console.log(`[AUTH-DEBUG] REQ QUERY:`, JSON.stringify(req.query, null, 2));
      console.log('---------------------------------------------------------');
      next();
    },
    passport.authenticate('google', { session: false, failureRedirect: `${frontendUrl}/login?error=auth_failed` }),
    async (req, res) => {
      console.log('---------------------------------------------------------');
      console.log('✅ [AUTH-DEBUG] Google OAuth Callback Hit');
      console.log(`[AUTH-DEBUG] Authenticated User =`, JSON.stringify(req.user, null, 2));
      console.log('---------------------------------------------------------');
      
      try {
        // 1. Generate full JWT session
        const tokens = await TokenService.generateTokens(req.user);
        
        // 2. Redirect to frontend success page with token
        // PROTOCOL: Must use http://127.0.0.1:5173/auth-success
        const successUrl = `${process.env.FRONTEND_URL || 'http://127.0.0.1:5173'}/auth-success`;
        res.redirect(`${successUrl}?token=${tokens.accessToken}`);
      } catch (err) {
        console.error('❌ [GOOGLE-CALLBACK-ERROR]:', err);
        res.redirect(`${frontendUrl}/login?error=token_generation_failed`);
      }
    },
  );
} else {
  const disabledPayload = {
    error: 'GOOGLE_OAUTH_DISABLED',
    message: 'Google OAuth is not enabled on this server.',
    missing: googleOAuth.missingVars,
  };

  router.get('/google', (req, res) => res.status(501).json(disabledPayload));
  router.get('/google/callback', (req, res) => res.status(501).json(disabledPayload));
}

module.exports = router;
