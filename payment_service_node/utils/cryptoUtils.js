const crypto = require('crypto');

/**
 * Verifies Razorpay HMAC signature
 * SECURITY: Uses timingSafeEqual to prevent timing attacks
 */
exports.verifyRazorpaySignature = (order_id, payment_id, signature, secret) => {
    const text = order_id + "|" + payment_id;
    const generated_signature = crypto.createHmac('sha256', secret)
                                      .update(text)
                                      .digest('hex');
    
    // Convert to Buffers for timingSafeEqual
    const a = Buffer.from(generated_signature);
    const b = Buffer.from(signature);
    
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
};

/**
 * Verifies Razorpay Webhook signature
 * SECURITY: Supports multiple secrets and uses timingSafeEqual
 */
exports.verifyRazorpayWebhook = (payloadBody, signature, secretsString) => {
    const secrets = secretsString ? secretsString.split(',') : [];
    const b = Buffer.from(signature);

    for (const secret of secrets) {
        const generated_signature = crypto.createHmac('sha256', secret.trim())
                                          .update(payloadBody)
                                          .digest('hex');
        const a = Buffer.from(generated_signature);
        
        if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
    }
    return false;
};

/**
 * Verifies PayU Hash
 */
exports.verifyPayUHash = (hashSequence, salt, receivedHash) => {
    const hashString = hashSequence + '|' + salt;
    const generatedHash = crypto.createHash('sha512').update(hashString).digest('hex');
    
    const a = Buffer.from(generatedHash);
    const b = Buffer.from(receivedHash);
    
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
};

/**
 * Generate PayU Hash for initiating payment
 */
exports.generatePayUHash = (params, salt) => {
    // Sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
    const { key, txnid, amount, productinfo, firstname, email, udf1='', udf2='', udf3='', udf4='', udf5='' } = params;
    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
    return crypto.createHash('sha512').update(hashString).digest('hex');
};
