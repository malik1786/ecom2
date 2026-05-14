const crypto = require('crypto');

/**
 * Helper to generate mock Razorpay Webhook Payloads and valid signatures
 */
exports.generateWebhookPayload = ({ 
    order_id = "ORDER_TEST_123", 
    payment_id = "pay_test123", 
    amount = 50000, 
    currency = "INR",
    timeOffsetSeconds = 0,
    secret = "test_secret_123"
} = {}) => {
    
    const created_at = Math.floor(Date.now() / 1000) + timeOffsetSeconds;
    
    const payload = {
        entity: "event",
        account_id: "acc_test",
        event: "payment.captured",
        contains: ["payment"],
        created_at,
        payload: {
            payment: {
                entity: {
                    id: payment_id,
                    entity: "payment",
                    amount,
                    currency,
                    status: "captured",
                    order_id: "order_test_RP",
                    notes: {
                        receipt: order_id
                    }
                }
            }
        }
    };
    
    const payloadString = JSON.stringify(payload);
    
    const signature = crypto.createHmac('sha256', secret)
                            .update(payloadString)
                            .digest('hex');
                            
    return { payload, signature, payloadString };
};
