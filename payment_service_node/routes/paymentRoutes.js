const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middlewares/auth');
const requireDb = require('../middlewares/requireDb');
const rateLimit = require('express-rate-limit');

// SECURITY: Route-specific rate limits
const createOrderLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
const startPaymentLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
const verifyLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
const webhookLimiter = rateLimit({ windowMs: 60 * 1000, max: 200 }); // Gateways can burst

// Main endpoints (Protected)
router.post('/order/create', protect, requireDb, createOrderLimiter, paymentController.createOrder);
router.post('/start', protect, requireDb, startPaymentLimiter, paymentController.initiatePayment);
router.post('/verify', protect, requireDb, verifyLimiter, paymentController.verifyPayment);

// Webhooks and Callbacks (Public but secured via signature verification)
router.post('/webhook/razorpay', requireDb, webhookLimiter, paymentController.razorpayWebhook);
router.post('/payu-success', requireDb, paymentController.payuSuccess);
router.post('/payu-fail', requireDb, paymentController.payuFail);

module.exports = router;
