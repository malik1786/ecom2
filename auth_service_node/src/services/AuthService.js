const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class AuthService {
    /**
     * Generate JWT Session Token
     */
    static generateToken(user) {
        return jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
    }

    /**
     * Generate Secure 6-Digit OTP
     */
    static async generateOTP(user) {
        const otp = crypto.randomInt(100000, 999999).toString();
        const hash = await bcrypt.hash(otp, 10);
        
        user.otp = {
            hash: hash,
            expiry: new Date(Date.now() + 5 * 60 * 1000), // 5 mins
            attempts: 0
        };
        await user.save();
        return otp; // Send this via Email/SMS
    }

    /**
     * Verify OTP with Attempt Limits
     */
    static async verifyOTP(user, candidateOTP) {
        if (!user.otp || !user.otp.hash || user.otp.expiry < new Date()) {
            throw new Error('OTP_EXPIRED_OR_INVALID');
        }

        if (user.otp.attempts >= 3) {
            throw new Error('TOO_MANY_ATTEMPTS');
        }

        const isValid = await bcrypt.compare(candidateOTP, user.otp.hash);
        if (!isValid) {
            user.otp.attempts += 1;
            await user.save();
            return false;
        }

        // Clear OTP on success
        user.otp = undefined;
        user.isVerified = true;
        await user.save();
        return true;
    }

    /**
     * Generate Password Reset Token
     */
    static generateResetToken(user) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetToken = {
            hash: crypto.createHash('sha256').update(resetToken).digest('hex'),
            expiry: new Date(Date.now() + 30 * 60 * 1000) // 30 mins
        };
        return resetToken;
    }
}

module.exports = AuthService;
