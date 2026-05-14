const Order = require('../models/Order');
const PaymentLog = require('../models/PaymentLog');
const razorpayService = require('./razorpayService');
const payuService = require('./payuService');
const { log } = require('../utils/crashLogger');
const crypto = require('crypto');

class PaymentService {

    // Abstracted create order (Internal DB order)
    async createOrder(user_id, amount, currency = 'INR') {
        const order_id = `ORDER_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        console.log(`[PAYMENT] Creating order: user=${user_id}, amount=${amount} ${currency}`);

        const newOrder = await Order.create({
            order_id,
            user_id,
            amount,
            currency,
            status: 'CREATED',
        });

        console.log(`[PAYMENT] Order created: ${order_id}`);
        return newOrder;
    }

    // Initiate payment with failover logic
    async initiatePayment(order_id, customerDetails) {
        const order = await Order.findOne({ order_id });
        if (!order) throw new Error('Order not found');
        if (!['CREATED', 'PAYMENT_PENDING'].includes(order.status)) {
            throw new Error(`Cannot initiate payment for order in ${order.status} state`);
        }

        // Idempotency / Retry tracking
        order.attempts += 1;

        let paymentData = null;
        let gatewayUsed = null;

        // ── Attempt 1: Razorpay ──
        if (razorpayService.isAvailable()) {
            try {
                console.log(`[PAYMENT] Attempting Razorpay for order ${order_id}...`);
                const rpOrder = await razorpayService.createOrder(order_id, order.amount, order.currency);
                gatewayUsed = 'RAZORPAY';
                paymentData = {
                    gateway: 'RAZORPAY',
                    razorpay_order_id: rpOrder.id,
                    amount: rpOrder.amount,
                    currency: rpOrder.currency,
                    key: process.env.RAZORPAY_KEY_ID,
                };
            } catch (error) {
                console.error(`[PAYMENT] Razorpay failed for order ${order_id}: ${error.message}`);
            }
        } else {
            console.warn(`[PAYMENT] Razorpay not available — skipping.`);
        }

        // ── Attempt 2: PayU fallback ──
        if (!paymentData && payuService.isAvailable()) {
            try {
                console.log(`[PAYMENT] Attempting PayU fallback for order ${order_id}...`);
                gatewayUsed = 'PAYU';
                const puParams = payuService.createPaymentParams(order_id, order.amount, customerDetails);
                paymentData = {
                    gateway: 'PAYU',
                    action_url: puParams.url,
                    params: puParams.params,
                };
            } catch (fallbackError) {
                console.error(`[PAYMENT] PayU fallback also failed for order ${order_id}: ${fallbackError.message}`);
            }
        } else if (!paymentData) {
            console.warn(`[PAYMENT] PayU not available — skipping.`);
        }

        // ── No gateway available ──
        if (!paymentData) {
            console.error(`[PAYMENT] ALL gateways unavailable for order ${order_id}.`);
            throw new Error(
                'GATEWAY_UNAVAILABLE: No online payment gateway is configured. Please paste your Razorpay API keys in the environment settings and restart the service.',
            );
        }

        order.gateway = gatewayUsed;
        order.status = 'PAYMENT_PENDING';
        await order.save();

        await PaymentLog.create({
            order_id,
            gateway: gatewayUsed,
            status: 'INITIATED',
            raw_response: paymentData,
        });

        console.log(`[PAYMENT] Payment initiated via ${gatewayUsed} for order ${order_id}`);
        return paymentData;
    }

    // Verify manual payment callback from client (Frontend -> Backend)
    // ONLY sets to PAYMENT_VERIFIED. Webhook is source of truth.
    async verifyPayment(payload, gateway) {
        const order_id = payload.order_id || payload.txnid;
        if (!order_id) throw new Error('Order ID missing in payload');

        // SECURITY: Prevent NoSQL Injection
        if (typeof order_id !== 'string') {
            throw new Error('Invalid order_id format');
        }

        console.log(`[PAYMENT] Verifying payment: order=${order_id}, gateway=${gateway}`);

        const order = await Order.findOne({ order_id });
        if (!order) throw new Error('Order not found');

        // Idempotency: If already PAID, just return
        if (order.status === 'PAID') {
            console.log(`[PAYMENT] Order ${order_id} already PAID — returning.`);
            return order;
        }

        let isVerified = false;
        let payment_id_temp = null;

        if (gateway === 'RAZORPAY') {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;

            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                throw new Error('Missing Razorpay verification fields (order_id, payment_id, signature)');
            }

            isVerified = razorpayService.verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
            payment_id_temp = razorpay_payment_id;
        } else if (gateway === 'PAYU') {
            isVerified = payuService.verifyPayment(payload);
            payment_id_temp = payload.mihpayid;
        } else {
            throw new Error('Invalid gateway specified');
        }

        if (!isVerified) {
            console.error(`[PAYMENT] Signature INVALID for order ${order_id} via ${gateway}`);
            // Use findOneAndUpdate to prevent race conditions
            await Order.findOneAndUpdate(
                { order_id, status: { $ne: 'PAID' } },
                { $set: { status: 'FAILED' } },
            );
            throw new Error('Payment signature verification failed');
        }

        console.log(`[PAYMENT] Signature VALID for order ${order_id} via ${gateway}`);

        // Conditionally update to PAYMENT_VERIFIED only if it's not already PAID
        const updatedOrder =
            (await Order.findOneAndUpdate(
                { order_id, status: { $ne: 'PAID' } },
                { $set: { status: 'PAYMENT_VERIFIED', payment_id: payment_id_temp } },
                { new: true },
            )) || order;

        await PaymentLog.create({
            order_id,
            gateway,
            status: updatedOrder.status,
            raw_response: payload,
        });

        return updatedOrder;
    }

    // Webhook Handler - SOURCE OF TRUTH
    async handleWebhook(data, gateway) {
        if (gateway === 'RAZORPAY') {
            const event = data.event;
            const paymentEntity = data?.payload?.payment?.entity;
            if (!paymentEntity) {
                console.warn('[WEBHOOK] Missing payment entity in Razorpay webhook payload.');
                return;
            }

            const payment_id = paymentEntity.id;
            const order_id = paymentEntity.notes?.receipt || paymentEntity.receipt;
            const paid_amount = paymentEntity.amount; // In paise
            const paid_currency = paymentEntity.currency;

            console.log(`[WEBHOOK] Razorpay event=${event}, order=${order_id}, payment=${payment_id}, amount=${paid_amount} ${paid_currency}`);

            if (event === 'payment.captured' || event === 'order.paid') {
                const order = await Order.findOne({ order_id });
                if (!order) {
                    console.warn(`[WEBHOOK] Order ${order_id} not found in DB.`);
                    return;
                }

                // Idempotency check
                if (order.status === 'PAID') {
                    console.log(`[WEBHOOK] Order ${order_id} already PAID — ignoring duplicate webhook.`);
                    return;
                }

                // Strict Amount & Currency Validation
                if (order.amount * 100 !== paid_amount || order.currency !== paid_currency) {
                    console.error(
                        `[WEBHOOK] AMOUNT MISMATCH for ${order_id}. Expected ${order.amount * 100} ${order.currency}, got ${paid_amount} ${paid_currency}`,
                    );

                    // SECURITY: Actively mark as FAILED on amount mismatch (Tampering Protection)
                    await Order.findOneAndUpdate(
                        { order_id, status: { $ne: 'PAID' } },
                        { $set: { status: 'FAILED' } },
                    );
                    return;
                }

                // Atomic update ensuring we only update if not already PAID
                const updated = await Order.findOneAndUpdate(
                    { order_id, status: { $ne: 'PAID' } },
                    {
                        $set: {
                            status: 'PAID',
                            payment_id: payment_id,
                        },
                    },
                    { new: true },
                );

                if (updated) {
                    console.log(`[WEBHOOK] ✅ Order ${order_id} marked as PAID.`);

                    try {
                        await PaymentLog.create({
                            order_id,
                            gateway: 'RAZORPAY',
                            status: 'WEBHOOK_PAID_SUCCESS',
                            raw_response: data,
                        });
                    } catch (err) {
                        // Ignore duplicate key errors if log already exists
                        if (err.code !== 11000) console.error('[WEBHOOK] Error logging payment:', err);
                    }

                    // Post-Payment Triggers protected by atomic update idempotency
                    log(`[TRIGGER] Send confirmation email to user`, { order_id });
                    log(`[TRIGGER] Clear user cart`, { order_id });
                    log(`[TRIGGER] Deduct inventory / notify fulfillment`, { order_id });
                }
            }
        }
    }

    getGatewayStatus() {
        return {
            razorpay: razorpayService.isAvailable() ? 'READY' : 'DISABLED',
            payu: payuService.isAvailable() ? 'READY' : 'DISABLED',
            any_online_gateway: razorpayService.isAvailable() || payuService.isAvailable(),
        };
    }
}

const paymentServiceInstance = new PaymentService();
module.exports = paymentServiceInstance;
