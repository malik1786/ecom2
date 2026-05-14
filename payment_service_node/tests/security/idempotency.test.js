const request = require('supertest');
const { setupTestApp, createTestOrder, parallelRequests } = require('../helpers/testUtils');
const { generateWebhookPayload } = require('../helpers/mockWebhook');
const Order = require('../../models/Order');
const PaymentLog = require('../../models/PaymentLog');

const app = setupTestApp();

describe('Idempotency & Concurrency Tests', () => {

    test('2) REPLAY ATTACK TEST - Should ignore exactly same webhook sent twice', async () => {
        const order = await createTestOrder({ order_id: 'REPLAY_1' });
        const { payloadString, signature } = generateWebhookPayload({ order_id: 'REPLAY_1', amount: 50000 });
        
        // Send First Webhook
        const res1 = await request(app)
            .post('/api/webhook/razorpay')
            .set('x-razorpay-signature', signature)
            .set('Content-Type', 'application/json')
            .send(payloadString);
            
        expect(res1.status).toBe(200);
        
        // Verify it was marked PAID
        const updatedOrder1 = await Order.findOne({ order_id: 'REPLAY_1' });
        expect(updatedOrder1.status).toBe('PAID');
        
        // Send EXACT SAME webhook again
        const res2 = await request(app)
            .post('/api/webhook/razorpay')
            .set('x-razorpay-signature', signature)
            .set('Content-Type', 'application/json')
            .send(payloadString);
            
        expect(res2.status).toBe(200); // Server acknowledges but doesn't re-process
        
        // Verify Logs - should only be ONE success log to prevent duplicate trigger runs
        const logCount = await PaymentLog.countDocuments({ order_id: 'REPLAY_1', status: 'WEBHOOK_PAID_SUCCESS' });
        expect(logCount).toBe(1);
    });

    test('3) DUPLICATE FLOOD TEST - Should handle 20 parallel webhook hits gracefully', async () => {
        const order = await createTestOrder({ order_id: 'FLOOD_1' });
        const { payloadString, signature } = generateWebhookPayload({ order_id: 'FLOOD_1', amount: 50000 });
        
        const makeRequest = () => request(app)
            .post('/api/webhook/razorpay')
            .set('x-razorpay-signature', signature)
            .set('Content-Type', 'application/json')
            .send(payloadString);

        // Fire 20 at once
        const responses = await parallelRequests(makeRequest, 20);
        
        responses.forEach(res => expect(res.status).toBe(200));
        
        // Ensure atomic update prevented duplicate processing
        const logCount = await PaymentLog.countDocuments({ order_id: 'FLOOD_1', status: 'WEBHOOK_PAID_SUCCESS' });
        expect(logCount).toBe(1);
        
        const finalOrder = await Order.findOne({ order_id: 'FLOOD_1' });
        expect(finalOrder.status).toBe('PAID');
    });
    
    test('5) RACE CONDITION TEST - /verify and /webhook fired simultaneously', async () => {
        const order = await createTestOrder({ order_id: 'RACE_1' });
        
        const { payloadString, signature, payload } = generateWebhookPayload({ order_id: 'RACE_1', amount: 50000 });
        
        const verifyPayload = {
            order_id: 'RACE_1',
            razorpay_order_id: "order_test_RP",
            razorpay_payment_id: "pay_test123",
            razorpay_signature: "invalid_sig_since_we_mocked_gateway" // This will fail verify but pass webhook
        };

        const reqVerify = request(app)
            .post('/api/verify')
            .send({ payload: verifyPayload, gateway: 'RAZORPAY' }); // Not sending auth to just test rejection/race
            
        const reqWebhook = request(app)
            .post('/api/webhook/razorpay')
            .set('x-razorpay-signature', signature)
            .set('Content-Type', 'application/json')
            .send(payloadString);
            
        await Promise.all([reqVerify, reqWebhook]);
        
        // The webhook should WIN and set the order to PAID regardless of verify failing
        const finalOrder = await Order.findOne({ order_id: 'RACE_1' });
        expect(finalOrder.status).toBe('PAID');
    });

});
