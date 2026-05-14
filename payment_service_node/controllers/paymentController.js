const paymentService = require('../services/paymentService');
const cryptoUtils = require('../utils/cryptoUtils');

exports.createOrder = async (req, res, next) => {
    try {
        const { user_id, amount, currency } = req.body;
        console.log(`[CTRL] createOrder: user_id=${user_id}, amount=${amount}, currency=${currency || 'INR'}`);
        if (!user_id || !amount) {
            return res.status(400).json({
                success: false,
                error: "INVALID_REQUEST",
                message: "user_id and amount are required",
                data: null,
                debug: { db_saved: false, payment_processed: false, errors: ["MISSING_FIELDS"] }
            });
        }
        const order = await paymentService.createOrder(user_id, amount, currency);
        res.status(201).json({
            success: true,
            message: "Order created",
            data: order,
            debug: { db_saved: true, payment_processed: false, errors: null }
        });
    } catch (error) {
        next(error);
    }
};

exports.initiatePayment = async (req, res, next) => {
    try {
        const { order_id, customerDetails } = req.body;
        console.log(`[CTRL] initiatePayment: order_id=${order_id}`);
        if (!order_id) {
            return res.status(400).json({
                success: false,
                error: "INVALID_REQUEST",
                message: "order_id is required",
                data: null,
                debug: { db_saved: false, payment_processed: false, errors: ["MISSING_ORDER_ID"] }
            });
        }
        const paymentData = await paymentService.initiatePayment(order_id, customerDetails || {});
        res.status(200).json({
            success: true,
            message: "Payment initiated",
            data: paymentData,
            debug: { db_saved: true, payment_processed: true, errors: null }
        });
    } catch (error) {
        next(error);
    }
};

exports.verifyPayment = async (req, res, next) => {
    try {
        const { payload, gateway } = req.body;
        console.log(`[CTRL] verifyPayment: gateway=${gateway}, order_id=${payload?.order_id || payload?.txnid || 'unknown'}`);
        if (!payload || !gateway) {
            return res.status(400).json({
                success: false,
                error: "INVALID_REQUEST",
                message: "payload and gateway are required",
                data: null,
                debug: { db_saved: false, payment_processed: false, errors: ["MISSING_PAYLOAD"] }
            });
        }
        const order = await paymentService.verifyPayment(payload, gateway);
        res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            data: order,
            debug: { db_saved: true, payment_processed: true, errors: null }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: "PAYMENT_FAILED",
            message: error.message,
            data: null,
            debug: { db_saved: false, payment_processed: false, errors: [error.message] }
        });
    }
};

exports.razorpayWebhook = async (req, res, next) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        if (!signature) return res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Missing signature" });

        const payloadBody = JSON.stringify(req.body); 
        
        // SECURITY: Verify signature with support for secret rotation
        const isValid = cryptoUtils.verifyRazorpayWebhook(payloadBody, signature, process.env.RAZORPAY_WEBHOOK_SECRET);
        
        if (!isValid) return res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Invalid signature" });
        
        // SECURITY: Strict Timestamp Validation (Max 5 min drift, absolute to block future dates)
        // Razorpay sends timestamp in seconds in `req.body.created_at`
        const eventTimestamp = req.body.created_at * 1000; 
        const currentTime = Date.now();
        if (Math.abs(currentTime - eventTimestamp) > 5 * 60 * 1000) {
            console.warn(`[SECURITY] Rejecting stale/future webhook. Timestamp drift too high.`);
            return res.status(400).json({ success: false, error: "INVALID_REQUEST", message: "Webhook event expired or invalid" });
        }

        await paymentService.handleWebhook(req.body, 'RAZORPAY');
        res.status(200).json({ success: true, message: "Webhook processed", debug: { db_saved: true, payment_processed: true, errors: null } });
    } catch (error) {
        next(error);
    }
};

exports.payuSuccess = async (req, res, next) => {
    try {
        // PayU sends form-url-encoded POST data
        const order = await paymentService.verifyPayment(req.body, 'PAYU');
        const wantsJson = String(req.query.json || '').toLowerCase() === '1' ||
            String(req.headers.accept || '').toLowerCase().includes('application/json');

        if (wantsJson) {
            return res.status(200).json({
                success: true,
                message: "Payment verified successfully",
                data: order,
                debug: { db_saved: true, payment_processed: true, errors: null }
            });
        }

        // Redirect to frontend success page
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
        res.redirect(`${frontendUrl}/payment/success?order_id=${order.order_id}`);
    } catch (error) {
        const wantsJson = String(req.query.json || '').toLowerCase() === '1' ||
            String(req.headers.accept || '').toLowerCase().includes('application/json');

        if (wantsJson) {
            return res.status(400).json({
                success: false,
                error: "PAYMENT_FAILED",
                message: "verification_failed",
                debug: { db_saved: false, payment_processed: false, errors: [error.message] }
            });
        }

        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
        res.redirect(`${frontendUrl}/payment/failed?reason=verification_failed`);
    }
};

exports.payuFail = async (req, res, next) => {
    const wantsJson = String(req.query.json || '').toLowerCase() === '1' ||
        String(req.headers.accept || '').toLowerCase().includes('application/json');

    if (wantsJson) {
        return res.status(400).json({
            success: false,
            error: "PAYMENT_FAILED",
            message: "PAYMENT_FAILED",
            debug: { db_saved: false, payment_processed: false, errors: ["PAYU_FAILED_CALLBACK"] }
        });
    }

    // Redirect to frontend failure page
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    res.redirect(`${frontendUrl}/payment/failed`);
};
