const mongoose = require('mongoose');

// WHY: Schema to securely store fatal crash details and the preceding logs to aid debugging without SSH access
const CrashLogSchema = new mongoose.Schema({
    message: { 
        type: String, 
        required: true 
    },
    stack: { 
        type: String 
    },
    logs_before_crash: { 
        type: Array, 
        default: [] 
    },
    created_at: { 
        type: Date, 
        default: Date.now, 
        expires: 86400 * 30 // BONUS: Auto-cleanup documents after 30 days via MongoDB TTL index
    }
});

module.exports = mongoose.model('CrashLog', CrashLogSchema);
