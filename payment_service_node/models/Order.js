const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    order_id: {
        type: String,
        required: true,
        unique: true
    },
    user_id: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    status: {
        type: String,
        enum: ['CREATED', 'PAYMENT_PENDING', 'PAYMENT_VERIFIED', 'PAID', 'FAILED', 'EXPIRED'],
        default: 'CREATED'
    },
    payment_id: {
        type: String,
        sparse: true,
        unique: true
    },
    gateway: {
        type: String,
        enum: ['RAZORPAY', 'PAYU']
    },
    attempts: {
        type: Number,
        default: 0
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Order', OrderSchema);
