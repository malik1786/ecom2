const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String }, // Hashed using bcrypt
    googleId: { type: String, sparse: true },
    isVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    
    // Security tracking
    lastLogin: { type: Date },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Pre-save password hashing (bcrypt factor 12)
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidate) {
    if (!this.password) return false;
    return await bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
