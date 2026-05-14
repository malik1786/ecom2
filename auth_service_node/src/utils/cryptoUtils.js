const crypto = require('crypto');

class CryptoUtils {
    /**
     * SHA256 Hashing for OTP and Tokens
     */
    static hashSHA256(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Generate Random 6-Digit OTP
     */
    static generateOTP() {
        return crypto.randomInt(100000, 999999).toString();
    }

    /**
     * Generate Secure Random Token (for refresh tokens)
     */
    static generateRandomToken() {
        return crypto.randomBytes(40).toString('hex');
    }
}

module.exports = CryptoUtils;
