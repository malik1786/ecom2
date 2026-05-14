// backend/src/utils/otp.js
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Generate a random 6-digit OTP
function generateRandomOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash the OTP securely
function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

exports.createOtp = async (userId) => {
  const rawOtp = generateRandomOtp();
  const otpHash = hashOtp(rawOtp);
  
  // Expire in 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.oTP.create({
    data: {
      userId,
      otpHash,
      expiresAt,
    },
  });

  return { rawOtp };
};

exports.verifyOtpCode = async (userId, otp) => {
  const otpHash = hashOtp(otp);

  const otpRecord = await prisma.oTP.findFirst({
    where: {
      userId,
      otpHash,
      used: false,
      expiresAt: {
        gte: new Date(),
      },
    },
  });

  if (!otpRecord) return false;

  // Mark OTP as used
  await prisma.oTP.update({
    where: { id: otpRecord.id },
    data: { used: true },
  });

  return true;
};
