const { generatePayUHash, verifyPayUHash } = require('../utils/cryptoUtils');

class PayUService {
    constructor() {
        this.key = (process.env.PAYU_MERCHANT_KEY || '').trim();
        this.salt = (process.env.PAYU_SALT || '').trim();
        this.initialized = false;

        // Reject placeholder values
        const isPlaceholder = (v) =>
            !v || v.startsWith('your_') || v === 'PASTE_HERE' || v.length < 4;

        if (isPlaceholder(this.key) || isPlaceholder(this.salt)) {
            console.warn('⚠️  [GATEWAY] PayU keys missing or placeholder — PayU DISABLED.');
            this.key = null;
            this.salt = null;
        } else {
            this.initialized = true;
            console.log('✅ [GATEWAY] PayU initialized successfully.');
        }

        // ENV-driven URL — never hardcoded
        const baseUrl = (process.env.BASE_URL || '').trim() || 'http://localhost:5002';
        this.callbackBase = baseUrl;

        // Production vs test PayU endpoint
        this.url = process.env.NODE_ENV === 'production'
            ? 'https://secure.payu.in/_payment'
            : 'https://test.payu.in/_payment';
    }

    isAvailable() {
        return this.initialized && this.key && this.salt;
    }

    createPaymentParams(order_id, amount, customerDetails) {
        if (!this.isAvailable()) {
            throw new Error('PAYU_NOT_CONFIGURED: PayU gateway is not initialized. Paste real API keys and restart.');
        }

        const txnid = order_id;
        const productinfo = 'Sufi Perfumes Purchase';

        const params = {
            key: this.key,
            txnid,
            amount: amount.toString(),
            productinfo,
            firstname: customerDetails.name || customerDetails.firstname || 'Customer',
            email: customerDetails.email || 'customer@example.com',
            phone: customerDetails.phone || '9999999999',
            surl: `${this.callbackBase}/api/payment/payu-success`,
            furl: `${this.callbackBase}/api/payment/payu-fail`,
        };

        const hash = generatePayUHash(params, this.salt);

        console.log(`[PAYU] Payment params created for order: ${order_id}, amount: ${amount}`);

        return {
            url: this.url,
            params: {
                ...params,
                hash,
            },
        };
    }

    verifyPayment(payload) {
        if (!this.key || !this.salt) {
            console.error('[PAYU] Cannot verify — credentials missing.');
            return false;
        }

        const { status, txnid, amount, productinfo, firstname, email, udf1, udf2, udf3, udf4, udf5, hash } = payload;

        const hashSequence = `${status}||||||${udf5 || ''}|${udf4 || ''}|${udf3 || ''}|${udf2 || ''}|${udf1 || ''}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${this.key}`;

        const isValid = verifyPayUHash(hashSequence, this.salt, hash);
        console.log(`[PAYU] Verification for txn ${txnid}: ${isValid && status === 'success' ? 'VALID' : 'INVALID'}`);
        return isValid && status === 'success';
    }
}

module.exports = new PayUService();
