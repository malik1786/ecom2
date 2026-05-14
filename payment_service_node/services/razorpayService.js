const Razorpay = require('razorpay');
const { verifyRazorpaySignature } = require('../utils/cryptoUtils');

class RazorpayService {
    constructor() {
        this.instance = null;
        this.initialized = false;
        this._init();
    }

    _init() {
        const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
        const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

        // Reject placeholder values that ship with .env templates
        const isPlaceholder = (v) =>
            !v || v.startsWith('your_') || v === 'PASTE_HERE' || v.length < 8;

        if (isPlaceholder(keyId) || isPlaceholder(keySecret)) {
            console.warn('⚠️  [GATEWAY] Razorpay keys missing or placeholder — Razorpay DISABLED.');
            console.warn('   → Paste real keys in payment_service_node/.env and restart.');
            this.instance = null;
            this.initialized = false;
            return;
        }

        try {
            this.instance = new Razorpay({
                key_id: keyId,
                key_secret: keySecret,
            });
            this.initialized = true;
            console.log('✅ [GATEWAY] Razorpay initialized successfully.');
        } catch (err) {
            console.error(`❌ [GATEWAY] Razorpay initialization failed: ${err.message}`);
            this.instance = null;
            this.initialized = false;
        }
    }

    isAvailable() {
        return this.initialized && this.instance !== null;
    }

    async createOrder(order_id, amount, currency = 'INR') {
        if (!this.isAvailable()) {
            throw new Error('RAZORPAY_NOT_CONFIGURED: Razorpay gateway is not initialized. Paste real API keys and restart.');
        }

        const options = {
            amount: Math.round(amount * 100), // Amount in smallest currency unit (paise)
            currency,
            receipt: order_id,
            payment_capture: 1,
        };

        console.log(`[RAZORPAY] Creating order: ${order_id}, amount: ${amount} ${currency} (${options.amount} paise)`);

        try {
            const order = await this.instance.orders.create(options);
            console.log(`[RAZORPAY] Order created: ${order.id}`);
            return {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
            };
        } catch (error) {
            console.error(`[RAZORPAY] Order creation failed: ${error.message}`);
            throw new Error(`Razorpay Order Creation Failed: ${error.message}`);
        }
    }

    verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature) {
        const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
        if (!keySecret || keySecret.startsWith('your_')) {
            console.error('[RAZORPAY] Cannot verify — key secret missing.');
            return false;
        }
        const result = verifyRazorpaySignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            keySecret,
        );
        console.log(`[RAZORPAY] Signature verification for ${razorpay_payment_id}: ${result ? 'VALID' : 'INVALID'}`);
        return result;
    }

    isAvailable() {
        return this.initialized && this.instance !== null;
    }
}

module.exports = new RazorpayService();
