const express = require('express');
const {
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  logout,
  refreshToken,
} = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);

module.exports = router;
