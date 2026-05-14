const request = require('supertest');
const { setupTestApp, createTestOrder, getAuthToken } = require('../helpers/testUtils');
const { generateWebhookPayload } = require('../helpers/mockWebhook');
const Order = require('../../models/Order');

const app = setupTestApp();

describe('Webhook & Authentication Security Tests', () => {

    test('1) FAKE WEBHOOK TEST - Should reject invalid signature with 401', async () => {
        const { payloadString } = generateWebhookPayload();
        
        const response = await request(app)
            .post('/api/webhook/razorpay')
            .set('x-razorpay-signature', 'obviously_fake_signature_12345')
            .set('Content-Type', 'application/json')
            .send(payloadString); // Send raw string
            
        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Invalid signature");
    });

    test('8) TIMESTAMP DRIFT TEST - Should reject webhooks older than 5 minutes', async () => {
        // Offset -301 seconds (just over 5 minutes ago)
        const { payloadString, signature } = generateWebhookPayload({ timeOffsetSeconds: -301 });
        
        const response = await request(app)
            .post('/api/webhook/razorpay')
            .set('x-razorpay-signature', signature)
            .set('Content-Type', 'application/json')
            .send(payloadString);
            
        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/expired/i);
    });

    test('8) TIMESTAMP DRIFT TEST - Should reject webhooks > 5 mins in the FUTURE', async () => {
        // Offset +301 seconds (future attack)
        const { payloadString, signature } = generateWebhookPayload({ timeOffsetSeconds: 301 });
        
        const response = await request(app)
            .post('/api/webhook/razorpay')
            .set('x-razorpay-signature', signature)
            .set('Content-Type', 'application/json')
            .send(payloadString);
            
        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/expired/i);
    });

    test('10) STATE MACHINE TEST - Internal APIs must be protected by JWT', async () => {
        const response = await request(app)
            .post('/api/order/create')
            .send({ user_id: '123', amount: 500 });
            
        // Should be blocked by auth middleware
        expect(response.status).toBe(401);
    });

});
