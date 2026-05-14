const mongoose = require('mongoose');

const PaymentLogSchema = new mongoose.Schema({
    order_id: {
        type: String,
        required: true
    },
    gateway: {
        type: String,
        required: true,
        enum: ['RAZORPAY', 'PAYU']
    },
    status: {
        type: String,
        required: true
    },
    raw_response: {
        type: mongoose.Schema.Types.Mixed
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Prevent duplicate logs for the same order and status transition
PaymentLogSchema.index({ order_id: 1, status: 1 }, { unique: true });

module.exports = mongoose.model('PaymentLog', PaymentLogSchema);
