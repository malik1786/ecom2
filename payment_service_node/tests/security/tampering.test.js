const request = require('supertest');
const { setupTestApp, createTestOrder, getAuthToken } = require('../helpers/testUtils');
const { generateWebhookPayload } = require('../helpers/mockWebhook');
const Order = require('../../models/Order');

const app = setupTestApp();

describe('Validation & Tampering Tests', () => {

    test('4) AMOUNT TAMPERING TEST - Should mark order as FAILED if amounts mismatch', async () => {
        // Order is for 500 INR (50000 paise)
        const order = await createTestOrder({ order_id: 'TAMPER_1', amount: 500 });
        
        // Attacker pays 10 INR (1000 paise) and sends webhook
        const { payloadString, signature } = generateWebhookPayload({ order_id: 'TAMPER_1', amount: 1000 });
        
        const response = await request(app)
            .post('/api/webhook/razorpay')
            .set('x-razorpay-signature', signature)
            .set('Content-Type', 'application/json')
            .send(payloadString);
            
        // Server acknowledges webhook
        expect(response.status).toBe(200);
        
        // But internal state machine MUST flag it as FAILED, not PAID
        const updatedOrder = await Order.findOne({ order_id: 'TAMPER_1' });
        expect(updatedOrder.status).toBe('FAILED');
    });

    test('6) NOSQL INJECTION TEST - Should reject malicious object payloads in /verify', async () => {
        const order = await createTestOrder({ order_id: 'INJECT_1' });
        
        // Malicious NoSQL injection payload
        const maliciousPayload = {
            order_id: { "$ne": null }, 
            razorpay_order_id: "test",
            razorpay_payment_id: "test",
            razorpay_signature: "test"
        };

        const response = await request(app)
            .post('/api/verify')
            .set('Authorization', getAuthToken())
            .send({ payload: maliciousPayload, gateway: 'RAZORPAY' });
            
        // Should be caught by the type checking validation we added
        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/Invalid order_id/i);
    });

});
