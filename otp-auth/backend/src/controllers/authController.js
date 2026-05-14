// backend/src/controllers/authController.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { createOtp, verifyOtpCode } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/email');

const prisma = new PrismaClient();
const REFRESH_COOKIE = 'refresh_token';

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/api/auth',
  });
}

// ── Login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'MISSING_FIELDS' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);
  setRefreshCookie(res, refreshToken);

  return res.json({ accessToken });
};

// ── Forgot Password (send OTP)
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'MISSING_EMAIL' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Always return success to avoid enumeration
    return res.json({ success: true });
  }

  const { rawOtp } = await createOtp(user.id);
  await sendOtpEmail(email, rawOtp);
  return res.json({ success: true });
};

// ── Verify OTP (returns short‑lived reset token)
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'MISSING_FIELDS' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: 'INVALID_OTP' });

  const valid = await verifyOtpCode(user.id, otp);
  if (!valid) return res.status(400).json({ error: 'INVALID_OTP' });

  const resetToken = generateAccessToken(user.id, '15m'); // 15‑minute token
  return res.json({ resetToken });
};

// ── Reset Password
exports.resetPassword = async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;
  if (!resetToken || !newPassword || !confirmPassword)
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  if (newPassword !== confirmPassword)
    return res.status(400).json({ error: 'PASSWORD_MISMATCH' });

  const payload = verifyRefreshToken(resetToken, 'reset');
  if (!payload) return res.status(401).json({ error: 'INVALID_TOKEN' });

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: payload.sub }, data: { passwordHash: hashed } });

  // Invalidate all existing refresh sessions for the user
  await prisma.session.deleteMany({ where: { userId: payload.sub } });
  // Clean up any OTP records for safety
  await prisma.oTP.deleteMany({ where: { userId: payload.sub } });

  return res.json({ success: true });
};

// ── Refresh Access Token
exports.refreshToken = async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ error: 'NO_TOKEN' });
  const payload = await verifyRefreshToken(token);
  if (!payload) return res.status(401).json({ error: 'INVALID_TOKEN' });
  const newAccess = generateAccessToken(payload.sub);
  return res.json({ accessToken: newAccess });
};

// ── Logout
exports.logout = async (req, res) => {
  const token = req.cookies[REFRESH_COOKIE];
  if (token) {
    const payload = await verifyRefreshToken(token);
    if (payload) {
      await prisma.session.deleteMany({ where: { userId: payload.sub } });
    }
  }
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  return res.json({ success: true });
};
