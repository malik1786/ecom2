const request = require('supertest');
const jwt = require('jsonwebtoken');
const Order = require('../../models/Order');
const express = require('express');

/**
 * Creates an Express app instance populated with routes to be tested
 */
exports.setupTestApp = () => {
    const app = express();
    // Must add these same middlewares the main server uses for accurate testing
    app.use(express.json());
    app.use('/api', require('../../routes/paymentRoutes'));
    app.use(require('../../middlewares/errorHandler'));
    return app;
};

/**
 * Seeds a test order in the Database
 */
exports.createTestOrder = async ({ order_id = "ORDER_TEST_123", amount = 500, currency = "INR", status = "CREATED" } = {}) => {
    return await Order.create({
        order_id,
        user_id: "user_123",
        amount,
        currency,
        status
    });
};

/**
 * Generates an Auth Token
 */
exports.getAuthToken = () => {
    return 'Bearer ' + jwt.sign({ id: 'user_123' }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

/**
 * Basic delay function for simulation
 */
exports.delay = (ms) => new Promise(res => setTimeout(res, ms));

/**
 * Runs a function `count` times in parallel 
 */
exports.parallelRequests = async (fn, count) => {
    const promises = Array.from({ length: count }, () => fn());
    return Promise.all(promises);
};
