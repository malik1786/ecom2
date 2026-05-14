const request = require('supertest');
const { setupTestApp, getAuthToken, parallelRequests } = require('../helpers/testUtils');

const app = setupTestApp();

describe('Rate Limiting & Abuse Protection Tests', () => {

    test('7) RATE LIMIT TEST - Should return 429 when sending >20 verify requests', async () => {
        const token = getAuthToken();
        const makeRequest = () => request(app)
            .post('/api/verify')
            .set('Authorization', token)
            .send({ payload: { order_id: "RL_TEST_1" }, gateway: 'RAZORPAY' });

        // Fire 25 requests (Limit is 20 per minute)
        const responses = await parallelRequests(makeRequest, 25);
        
        // Count how many were blocked
        const blockedCount = responses.filter(r => r.status === 429).length;
        
        // At least 5 should be blocked
        expect(blockedCount).toBeGreaterThanOrEqual(5);
        
        // Verify the error message format
        const blockedResponse = responses.find(r => r.status === 429);
        expect(blockedResponse.text).toMatch(/Too many requests/i);
    });

});
