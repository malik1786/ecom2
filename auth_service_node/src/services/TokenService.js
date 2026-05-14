const jwt = require('jsonwebtoken');

class TokenService {
    /**
     * Generate Access Token (Stateless)
     */
    static async generateTokens(user) {
        // We use a stateless JWT flow for simplicity and maximum stability
        // without requiring a local Redis instance.
        const payload = { 
            id: user.id || user._id, 
            role: user.role || 'customer', 
            email: user.email 
        };
        
        const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET || 'sufi_secret_123', { 
            expiresIn: '7d' // Longer expiry for dev stability
        });
        
        // Return accessToken as both for compatibility
        return { accessToken, refreshToken: accessToken };
    }

    /**
     * Minimal rotation logic (Stateless)
     */
    static async rotateRefreshToken(userId, oldToken) {
        try {
            const decoded = jwt.verify(oldToken, process.env.JWT_ACCESS_SECRET || 'sufi_secret_123');
            return this.generateTokens(decoded);
        } catch (err) {
            throw new Error('INVALID_SESSION');
        }
    }
}

module.exports = TokenService;
