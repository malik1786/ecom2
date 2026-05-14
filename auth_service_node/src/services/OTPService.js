const redisClient = require('../config/redis');
const CryptoUtils = require('../utils/cryptoUtils');

class OTPService {
    /**
     * Create and store hashed OTP in Redis
     */
    static async createOTP(email) {
        const otp = CryptoUtils.generateOTP();
        const hashedOTP = CryptoUtils.hashSHA256(otp);
        const redisKey = `otp:${email}`;
        
        // Store hash + attempt counter
        await redisClient.hSet(redisKey, {
            hash: hashedOTP,
            attempts: '0'
        });
        
        await redisClient.expire(redisKey, 300); // 5 minutes
        
        return otp; // Return plain text OTP to be sent via Email
    }

    /**
     * Verify OTP with Hashing and Attempt Limit (max 3)
     */
    static async verifyOTP(email, candidateOTP) {
        const redisKey = `otp:${email}`;
        const data = await redisClient.hGetAll(redisKey);

        if (!data || !data.hash) {
            throw new Error('OTP_EXPIRED_OR_NOT_FOUND');
        }

        const attempts = parseInt(data.attempts);
        if (attempts >= 3) {
            await redisClient.del(redisKey);
            throw new Error('MAX_ATTEMPTS_EXCEEDED');
        }

        const hashedCandidate = CryptoUtils.hashSHA256(candidateOTP);
        if (hashedCandidate !== data.hash) {
            await redisClient.hIncrBy(redisKey, 'attempts', 1);
            return false;
        }

        // Success - Delete OTP immediately
        await redisClient.del(redisKey);
        return true;
    }
}

module.exports = OTPService;
